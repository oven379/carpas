<?php

namespace Tests\Feature;

/** Регистрация ограничена по частоте (защита от массового создания аккаунтов и флуда в Telegram). */
class RegistrationThrottleTest extends FeatureTestCase
{
    public function test_owner_registration_is_throttled_after_ten_attempts(): void
    {
        for ($i = 0; $i < 10; $i++) {
            // Пустое тело: валидация откажет (422), но попытка всё равно считается.
            $this->postJson('/api/owners/register', [])->assertStatus(422);
        }
        $this->postJson('/api/owners/register', [])->assertStatus(429);
    }

    public function test_partner_registration_is_throttled_after_ten_attempts(): void
    {
        for ($i = 0; $i < 10; $i++) {
            $this->postJson('/api/detailings', [])->assertStatus(422);
        }
        $this->postJson('/api/detailings', [])->assertStatus(429);
    }

    public function test_failed_logins_do_not_block_registration(): void
    {
        // Неудачные входы (throttle:10,1) не должны съедать лимит регистрации и наоборот.
        for ($i = 0; $i < 10; $i++) {
            $this->postJson('/api/owners/login', ['email' => 'nobody@example.test', 'password' => 'x'])->assertStatus(422);
        }

        $this->postJson('/api/owners/register', [])->assertStatus(422);
    }
}
