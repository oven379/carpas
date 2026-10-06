<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Уведомления администратору в Telegram о событиях сервиса
 * (регистрация, добавление авто, обращение, передача авто) и дневная сводка.
 *
 * send()    — неблокирующий: отправка после ответа клиенту (terminating), для веб-запросов.
 * sendNow() — немедленная отправка, для CLI / команды сводки.
 * Если токен или chat_id не заданы — тихо ничего не делает.
 */
class TelegramNotifier
{
    /** Отправить после ответа клиенту (не замедляет веб-запрос). */
    public function send(string $text): void
    {
        if (! $this->configured()) {
            return;
        }
        app()->terminating(fn () => $this->dispatch($text));
    }

    /** Отправить немедленно (для консольных команд). Возвращает успех. */
    public function sendNow(string $text): bool
    {
        if (! $this->configured()) {
            return false;
        }

        return $this->dispatch($text);
    }

    private function configured(): bool
    {
        return trim((string) config('services.telegram.bot_token')) !== ''
            && trim((string) config('services.telegram.admin_chat_id')) !== '';
    }

    private function dispatch(string $text): bool
    {
        $token = trim((string) config('services.telegram.bot_token'));
        $chatId = trim((string) config('services.telegram.admin_chat_id'));
        try {
            $resp = Http::timeout(5)->post("https://api.telegram.org/bot{$token}/sendMessage", [
                'chat_id' => $chatId,
                'text' => mb_substr($text, 0, 3900),
                'disable_web_page_preview' => true,
            ]);

            return $resp->successful();
        } catch (\Throwable $e) {
            Log::warning('TelegramNotifier: '.$e->getMessage());

            return false;
        }
    }
}
