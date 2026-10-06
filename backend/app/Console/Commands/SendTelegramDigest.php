<?php

namespace App\Console\Commands;

use App\Models\Car;
use App\Models\CarEvent;
use App\Models\Detailing;
use App\Models\Owner;
use App\Models\ServiceBookingRequest;
use App\Models\SupportTicket;
use App\Services\TelegramNotifier;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

/**
 * Дневная сводка по сервису в Telegram: события за день + общие итоги.
 * Запуск по расписанию (см. App\Console\Kernel) или вручную: php artisan telegram:daily-digest
 */
class SendTelegramDigest extends Command
{
    protected $signature = 'telegram:daily-digest';

    protected $description = 'Отправляет администратору дневную сводку по сервису в Telegram';

    public function handle(TelegramNotifier $tg): int
    {
        $tz = 'Europe/Moscow';
        $start = Carbon::now($tz)->startOfDay()->utc();
        $dateLabel = Carbon::now($tz)->format('d.m.Y');

        $todayOwners = Owner::query()->where('created_at', '>=', $start)->count();
        $todayDet = Detailing::query()->where('created_at', '>=', $start)->count();
        $todayCars = Car::query()->where('created_at', '>=', $start)->count();
        $todayVisits = CarEvent::query()->where('created_at', '>=', $start)->count();
        $todayTickets = SupportTicket::query()->where('created_at', '>=', $start)->count();
        $todayBookings = ServiceBookingRequest::query()->where('created_at', '>=', $start)->count();

        $text = "📊 КарПас — сводка за {$dateLabel}\n\n"
            ."Сегодня:\n"
            ."🆕 Владельцы: {$todayOwners}\n"
            ."🏢 Партнёры: {$todayDet}\n"
            ."🚗 Авто: {$todayCars}\n"
            ."🧾 Визиты: {$todayVisits}\n"
            ."✉️ Обращения: {$todayTickets}\n"
            ."📩 Заявки на запись: {$todayBookings}\n\n"
            ."Всего в сервисе:\n"
            ."👤 Владельцы: ".Owner::query()->count()."\n"
            ."🏢 Партнёры: ".Detailing::query()->count()."\n"
            ."🚗 Авто: ".Car::query()->count();

        $ok = $tg->sendNow($text);
        $this->info($ok ? 'Сводка отправлена.' : 'Не отправлено (проверьте TELEGRAM_* в .env).');

        return self::SUCCESS;
    }
}
