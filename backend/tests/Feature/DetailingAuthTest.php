<?php

namespace Tests\Feature;

use App\Models\Detailing;
use App\Models\Owner;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;

class DetailingAuthTest extends FeatureTestCase
{
    public function test_register_creates_detailing_pending_verification_without_token(): void
    {
        $payload = [
            'name' => 'Мой детейлинг',
            'email' => 'new@example.test',
            'password' => 'pass1234',
            'contactName' => 'Иван',
            'phone' => '+7 900 123-45-67',
            'city' => 'Москва',
            'address' => 'ул. Примерная, 1',
        ];

        $response = $this->postJson('/api/detailings', $payload);

        $response->assertOk();
        $response->assertJsonPath('detailing.email', 'new@example.test');
        $response->assertJsonPath('detailing.name', 'Мой детейлинг');
        $response->assertJsonPath('pendingVerification', true);
        $response->assertJsonPath('token', null);
        $this->assertNotEmpty($response->json('message'));

        $this->assertDatabaseHas('detailings', ['email' => 'new@example.test']);
        $row = \App\Models\Detailing::query()->where('email', 'new@example.test')->first();
        $this->assertNotNull($row);
        $this->assertNull($row->verification_approved_at);
    }

    public function test_register_ucfirst_name_and_contact_name(): void
    {
        $payload = [
            'name' => 'студия shine',
            'email' => 'ucfirst@example.test',
            'password' => 'pass1234',
            'contactName' => 'иван',
            'phone' => '+7 900 123-45-67',
            'city' => 'Москва',
            'address' => 'ул. Примерная, 1',
        ];

        $response = $this->postJson('/api/detailings', $payload);

        $response->assertOk();
        $response->assertJsonPath('detailing.name', 'Студия shine');
        $response->assertJsonPath('detailing.contactName', 'Иван');
    }

    public function test_register_rejects_duplicate_email(): void
    {
        $this->detailing(['email' => 'dup@example.test']);

        $this->postJson('/api/detailings', [
            'name' => 'Дубль',
            'email' => 'dup@example.test',
            'password' => 'pass1234',
            'contactName' => 'Иван',
            'phone' => '+7 900 000-00-00',
            'city' => 'Москва',
            'address' => 'ул. Тест, 1',
        ])->assertStatus(422);
    }

    public function test_register_rejects_phone_already_used_by_owner(): void
    {
        Owner::query()->create([
            'email' => 'owner-for-phone@example.test',
            'password' => Hash::make('secret'),
            'name' => 'Владелец',
            'phone' => '+7 901 222 33 44',
        ]);

        $this->postJson('/api/detailings', [
            'name' => 'Новый сервис',
            'email' => 'new-sto@example.test',
            'password' => 'pass1234',
            'contactName' => 'Пётр',
            'phone' => '8 901 222 33 44',
            'city' => 'Москва',
            'address' => 'ул. Тест, 1',
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['phone']);
    }

    public function test_register_rejects_duplicate_phone_across_partner_detailings(): void
    {
        $this->detailing([
            'email' => 'sto-a@example.test',
            'phone' => '+7 903 111 22 33',
            'is_personal' => false,
            'profile_completed' => true,
        ]);

        $this->postJson('/api/detailings', [
            'name' => 'Другой сервис',
            'email' => 'sto-b@example.test',
            'password' => 'pass1234',
            'contactName' => 'Иван',
            'phone' => '+79031112233',
            'city' => 'Москва',
            'address' => 'ул. Тест, 2',
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['phone']);
    }

    public function test_login_returns_token_for_valid_credentials(): void
    {
        $this->detailing(['email' => 'in@example.test', 'password' => bcrypt('secret')]);

        $response = $this->postJson('/api/detailings/login', [
            'email' => 'in@example.test',
            'password' => 'secret',
        ]);

        $response->assertOk();
        $response->assertJsonPath('ok', true);
        $response->assertJsonPath('detailing.email', 'in@example.test');
        $this->assertNotEmpty($response->json('token'));
    }

    public function test_login_returns_422_when_email_unknown(): void
    {
        $this->postJson('/api/detailings/login', [
            'email' => 'nobody@example.test',
            'password' => 'x',
        ])
            ->assertStatus(422)
            ->assertJsonPath('reason', 'not_found');
    }

    public function test_login_returns_401_for_wrong_password(): void
    {
        $this->detailing(['email' => 'u@example.test', 'password' => bcrypt('right')]);

        $this->postJson('/api/detailings/login', [
            'email' => 'u@example.test',
            'password' => 'wrong',
        ])->assertUnauthorized()->assertJsonPath('reason', 'bad_password');
    }

    public function test_login_rejects_pending_verification(): void
    {
        Detailing::query()->create([
            'name' => 'На проверке',
            'email' => 'pend-login@example.test',
            'password' => Hash::make('secret'),
            'phone' => '+7 900 888 77 66',
            'contact_name' => 'Иван',
            'city' => 'Москва',
            'address' => 'ул. Тест, 1',
            'is_personal' => false,
            'profile_completed' => false,
            'verification_approved_at' => null,
        ]);

        $this->postJson('/api/detailings/login', [
            'email' => 'pend-login@example.test',
            'password' => 'secret',
        ])
            ->assertStatus(422)
            ->assertJsonPath('ok', false)
            ->assertJsonPath('reason', 'pending_verification');
    }

    public function test_login_succeeds_after_verification_approved(): void
    {
        $d = Detailing::query()->create([
            'name' => 'Одобрен',
            'email' => 'approved-login@example.test',
            'password' => Hash::make('secret'),
            'phone' => '+7 900 777 66 55',
            'contact_name' => 'Иван',
            'city' => 'Москва',
            'address' => 'ул. Тест, 1',
            'is_personal' => false,
            'profile_completed' => false,
            'verification_approved_at' => null,
        ]);
        $d->forceFill(['verification_approved_at' => now()])->save();

        $res = $this->postJson('/api/detailings/login', [
            'email' => 'approved-login@example.test',
            'password' => 'secret',
        ]);
        $res->assertOk()
            ->assertJsonPath('ok', true)
            ->assertJsonPath('detailing.email', 'approved-login@example.test');
        $this->assertNotEmpty($res->json('token'));
    }

    public function test_me_requires_authentication(): void
    {
        $this->getJson('/api/me')->assertUnauthorized();
    }

    public function test_me_returns_current_detailing(): void
    {
        $d = $this->detailing(['email' => 'me@example.test']);
        Sanctum::actingAs($d);

        $this->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('detailing.email', 'me@example.test');
    }

    public function test_patch_me_saves_working_hours(): void
    {
        $d = $this->detailing(['email' => 'wh@example.test']);
        Sanctum::actingAs($d);

        $this->patchJson('/api/detailings/me', [
            'workingHours' => "Пн–Пт 9:00–21:00\nСб 10:00–18:00",
        ])
            ->assertOk()
            ->assertJsonPath('detailing.workingHours', "Пн–Пт 9:00–21:00\nСб 10:00–18:00");

        $this->assertDatabaseHas('detailings', [
            'id' => $d->id,
            'working_hours' => "Пн–Пт 9:00–21:00\nСб 10:00–18:00",
        ]);
    }
}
