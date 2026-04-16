<?php

namespace Tests\Feature;

use App\Models\Owner;
use Illuminate\Support\Facades\Hash;

class OwnerAuthTest extends FeatureTestCase
{
    public function test_owner_patch_me_rejects_case_insensitive_duplicate_garage_slug(): void
    {
        Owner::query()->create([
            'email' => 'slug-a@example.test',
            'password' => Hash::make('secret'),
            'name' => 'A',
            'phone' => '+7',
            'garage_slug' => 'ivan-garage',
        ]);
        $b = Owner::query()->create([
            'email' => 'slug-b@example.test',
            'password' => Hash::make('secret'),
            'name' => 'B',
            'phone' => '+7',
            'garage_slug' => 'petr',
        ]);
        $token = $b->createToken('owner')->plainTextToken;

        $this->patchJson(
            '/api/owners/me',
            ['garageSlug' => 'IVAN-GARAGE'],
            ['Authorization' => 'Bearer '.$token],
        )
            ->assertStatus(422)
            ->assertJsonValidationErrors(['garageSlug']);
    }

    public function test_register_returns_token(): void
    {
        $response = $this->postJson('/api/owners/register', [
            'email' => 'owner-new@example.test',
            'password' => 'pass1234',
            'name' => 'Иван',
            'phone' => '+7 900 000-00-01',
        ]);

        $response->assertOk();
        $response->assertJsonPath('owner.email', 'owner-new@example.test');
        $response->assertJsonPath('owner.garagePrivate', true);
        $this->assertNotEmpty($response->json('token'));
    }

    public function test_owner_patch_me_saves_garage_visit_self_advice(): void
    {
        $o = Owner::query()->create([
            'email' => 'advice-owner@example.test',
            'password' => Hash::make('secret'),
            'name' => 'Василий',
            'phone' => '+7',
        ]);
        $token = $o->createToken('owner')->plainTextToken;
        $text = 'Проверить масло перед поездкой';

        $this->patchJson(
            '/api/owners/me',
            ['garageVisitSelfAdvice' => $text],
            ['Authorization' => 'Bearer '.$token],
        )
            ->assertOk()
            ->assertJsonPath('owner.garageVisitSelfAdvice', $text);

        $this->assertSame($text, Owner::query()->find($o->id)->garage_visit_self_advice);
    }

    public function test_login_returns_422_when_email_unknown(): void
    {
        $this->postJson('/api/owners/login', [
            'email' => 'no-such-owner@example.test',
            'password' => 'whatever',
        ])
            ->assertStatus(422)
            ->assertJsonPath('ok', false)
            ->assertJsonPath('reason', 'not_found');
    }

    public function test_register_rejects_duplicate_email_with_422(): void
    {
        Owner::query()->create([
            'email' => 'dup-owner@example.test',
            'password' => Hash::make('secret'),
            'name' => 'Уже есть',
            'phone' => '+7',
        ]);

        $this->postJson('/api/owners/register', [
            'email' => 'dup-owner@example.test',
            'password' => 'pass1234',
            'name' => 'Другой',
            'phone' => '+7 900 000-00-02',
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }
}
