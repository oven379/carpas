<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Уведомления администратору в Telegram о событиях сервиса
 * (регистрация, добавление авто, обращение, передача авто).
 *
 * Неблокирующий: HTTP-запрос к Telegram выполняется после ответа клиенту (terminating),
 * чтобы не замедлять основной запрос. Если токен или chat_id не заданы — тихо ничего не делает.
 */
class TelegramNotifier
{
    public function send(string $text): void
    {
        $token = trim((string) config('services.telegram.bot_token'));
        $chatId = trim((string) config('services.telegram.admin_chat_id'));
        if ($token === '' || $chatId === '') {
            return;
        }

        app()->terminating(function () use ($token, $chatId, $text) {
            try {
                Http::timeout(5)->post("https://api.telegram.org/bot{$token}/sendMessage", [
                    'chat_id' => $chatId,
                    'text' => mb_substr($text, 0, 3900),
                    'disable_web_page_preview' => true,
                ]);
            } catch (\Throwable $e) {
                Log::warning('TelegramNotifier: '.$e->getMessage());
            }
        });
    }
}
