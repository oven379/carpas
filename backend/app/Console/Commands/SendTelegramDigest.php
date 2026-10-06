<?php

namespace App\Console\Commands;

use App\Models\AppSetting;
use App\Models\Car;
use App\Models\CarEvent;
use App\Models\Detailing;
use App\Models\Owner;
use App\Services\TelegramNotifier;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

/**
 * Дневная сводка в Telegram: только общие итоги + динамика ко вчерашнему дню.
 *   🟢 ⬆️ +N  — прирост;  🔴 ⬇️ −N — удаления;  🔴 застой 3 дня — нет изменений 3 дня подряд.
 *
 * Снимки итогов по дням хранятся в app_settings (ключ ниже), новая миграция не нужна.
 * Команда консольная (по расписанию), на работу веб-сервиса не влияет; любые ошибки гасятся.
 *
 * Запуск: php artisan telegram:daily-digest
 */
class SendTelegramDigest extends Command
{
    protected $signature = 'telegram:daily-digest';

    protected $description = 'Отправляет администратору дневную сводку итогов сервиса в Telegram';

    private const HISTORY_KEY = 'telegram_digest_history';

    /** Метрики сводки: ключ снимка => [эмодзи, подпись, счётчик]. */
    private function metrics(): array
    {
        return [
            'owners' => ['👤', 'Владельцы', fn () => Owner::query()->count()],
            'detailings' => ['🏢', 'Партнёры', fn () => Detailing::query()->count()],
            'cars' => ['🚗', 'Авто', fn () => Car::query()->count()],
            'visits' => ['🧾', 'Визиты', fn () => CarEvent::query()->count()],
        ];
    }

    public function handle(TelegramNotifier $tg): int
    {
        try {
            $tz = 'Europe/Moscow';
            $today = Carbon::now($tz)->format('Y-m-d');
            $dateLabel = Carbon::now($tz)->format('d.m.Y');

            $current = [];
            foreach ($this->metrics() as $field => [, , $counter]) {
                $current[$field] = (int) $counter();
            }

            $row = AppSetting::query()->where('key', self::HISTORY_KEY)->first();
            $history = is_array($row?->value) ? $row->value : [];
            // снимки прошлых дней (исключаем сегодняшний — на случай повторного запуска)
            $past = array_values(array_filter($history, fn ($e) => ($e['date'] ?? '') !== $today));

            $lines = [];
            foreach ($this->metrics() as $field => [$emoji, $label]) {
                $lines[] = $emoji.' '.$label.': '.$current[$field].'  '.$this->trend($past, $field, $current[$field]);
            }

            $text = "📊 КарПас — сводка за {$dateLabel}\n\n".implode("\n", $lines);
            $tg->sendNow($text);

            // сохранить сегодняшний снимок (последние 10 дней)
            $snapshot = array_merge(['date' => $today], $current);
            $past[] = $snapshot;
            $history = array_slice($past, -10);
            AppSetting::query()->updateOrCreate(['key' => self::HISTORY_KEY], ['value' => $history]);

            $this->info('Сводка отправлена.');
        } catch (\Throwable $e) {
            Log::warning('telegram:daily-digest: '.$e->getMessage());
            $this->warn('Сводка не отправлена: '.$e->getMessage());
        }

        return self::SUCCESS;
    }

    /** Текст динамики метрики относительно прошлых дней. */
    private function trend(array $past, string $field, int $current): string
    {
        if (empty($past)) {
            return '🆕 первая сводка';
        }
        $prev = (int) ($past[count($past) - 1][$field] ?? 0);
        $delta = $current - $prev;

        if ($delta > 0) {
            return '🟢 ⬆️ +'.$delta;
        }
        if ($delta < 0) {
            return '🔴 ⬇️ −'.abs($delta).' (удаления)';
        }

        // без изменений: красный флаг, если так же и 3 дня подряд (2 прошлых дня + сегодня)
        $n = count($past);
        $stale3 = $n >= 2
            && (int) ($past[$n - 1][$field] ?? -1) === $current
            && (int) ($past[$n - 2][$field] ?? -2) === $current;

        return $stale3 ? '🔴 ⬇️ застой 3 дня' : '⚪️ без изменений';
    }
}
