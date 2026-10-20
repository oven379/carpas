<?php

namespace Tests\Feature;

use App\Services\TelegramNotifier;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/** Уведомления админа в Telegram не должны ломать работу сервиса и не должны светить токен. */
class TelegramNotifierTest extends FeatureTestCase
{
    private const TOKEN = '123456:SECRET-TEST-TOKEN';

    private function configure(): void
    {
        Config::set('services.telegram.bot_token', self::TOKEN);
        Config::set('services.telegram.admin_chat_id', '42');
        Config::set('services.telegram.api_base', 'https://api.telegram.org');
        Config::set('services.telegram.proxy', '');
    }

    public function test_sends_message_to_the_admin_chat(): void
    {
        $this->configure();
        Http::fake(['api.telegram.org/*' => Http::response(['ok' => true])]);

        $this->assertTrue(app(TelegramNotifier::class)->sendNow('🆕 Новый владелец'));

        Http::assertSent(fn ($request) => $request->url() === 'https://api.telegram.org/bot'.self::TOKEN.'/sendMessage'
            && $request['chat_id'] === '42'
            && $request['text'] === '🆕 Новый владелец');
    }

    public function test_does_nothing_when_not_configured(): void
    {
        Config::set('services.telegram.bot_token', '');
        Config::set('services.telegram.admin_chat_id', '');
        Http::fake();

        $this->assertFalse(app(TelegramNotifier::class)->sendNow('текст'));

        Http::assertNothingSent();
    }

    public function test_custom_api_base_is_used_for_blocked_networks(): void
    {
        $this->configure();
        Config::set('services.telegram.api_base', 'https://tg-proxy.example.test/');
        Http::fake(['tg-proxy.example.test/*' => Http::response(['ok' => true])]);

        $this->assertTrue(app(TelegramNotifier::class)->sendNow('через прокси'));

        Http::assertSent(fn ($request) => str_starts_with($request->url(), 'https://tg-proxy.example.test/bot'));
    }

    public function test_network_failure_does_not_throw_and_token_is_not_logged(): void
    {
        $this->configure();
        Http::fake(fn () => throw new ConnectionException('cURL error for https://api.telegram.org/bot'.self::TOKEN.'/sendMessage'));
        Log::spy();

        $this->assertFalse(app(TelegramNotifier::class)->sendNow('текст'));

        Log::shouldHaveReceived('warning')->withArgs(
            fn ($message) => str_contains((string) $message, 'TelegramNotifier') && ! str_contains((string) $message, self::TOKEN)
        )->once();
    }

    public function test_telegram_http_error_returns_false_without_throwing(): void
    {
        $this->configure();
        Http::fake(['api.telegram.org/*' => Http::response(['ok' => false], 401)]);

        $this->assertFalse(app(TelegramNotifier::class)->sendNow('текст'));
    }

    public function test_new_partner_registration_notifies_admin_and_still_succeeds_if_telegram_is_down(): void
    {
        $this->configure();
        Http::fake(fn () => throw new ConnectionException('Telegram недоступен'));

        $this->postJson('/api/detailings', [
            'name' => 'Студия Тест',
            'email' => 'tg-'.uniqid('', true).'@example.test',
            'contactName' => 'Анна',
            'phone' => '+7 999 123 45 67',
            'city' => 'Воронеж',
            'address' => 'ул. Тестовая, 1',
            'businessType' => 'sto',
        ])->assertSuccessful()->assertJsonPath('pendingVerification', true);
    }
}
