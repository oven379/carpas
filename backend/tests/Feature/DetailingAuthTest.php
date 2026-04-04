<?php

namespace Tests\Feature;

use Laravel\Sanctum\Sanctum;

class DetailingAuthTest extends FeatureTestCase
{
    public function test_register_creates_detailing_and_returns_token(): void
    {
        $payload = [
            'name' => 'Мой детейлинг',
            'email' => 'new@example.test',
            'password' => 'pass1234',
        ];

        $response = $this->postJson('/api/detailings', $payload);

        $response->assertOk();
        $response->assertJsonPath('detailing.email', 'new@example.test');
        $response->assertJsonPath('detailing.name', 'Мой детейлинг');
        $this->assertNotEmpty($response->json('token'));

        $this->assertDatabaseHas('detailings', ['email' => 'new@example.test']);
    }

    public function test_register_rejects_duplicate_email(): void
    {
        $this->detailing(['email' => 'dup@example.test']);

        $this->postJson('/api/detailings', [
            'email' => 'dup@example.test',
            'password' => 'pass1234',
        ])->assertStatus(422);
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

    public function test_login_returns_404_when_email_unknown(): void
    {
        $this->postJson('/api/detailings/login', [
            'email' => 'nobody@example.test',
            'password' => 'x',
        ])->assertNotFound()->assertJsonPath('reason', 'not_found');
    }

    public function test_login_returns_401_for_wrong_password(): void
    {
        $this->detailing(['email' => 'u@example.test', 'password' => bcrypt('right')]);

        $this->postJson('/api/detailings/login', [
            'email' => 'u@example.test',
            'password' => 'wrong',
        ])->assertUnauthorized()->assertJsonPath('reason', 'bad_password');
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
}
