<?php

namespace Tests\Feature;

use App\Models\DevicePushToken;
use App\Models\Owner;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminPushApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_push_stats_requires_admin_bearer(): void
    {
        $this->getJson('/api/admin/support/push/stats')->assertStatus(401);
    }

    public function test_push_stats_ok_with_token(): void
    {
        Config::set('support.admin_bearer_token', 'test-admin-bearer');

        $r = $this->getJson('/api/admin/support/push/stats', [
            'Authorization' => 'Bearer test-admin-bearer',
        ]);

        $r->assertOk();
        $r->assertJsonPath('total', 0);
        $r->assertJsonPath('fcm_configured', false);
        $r->assertJsonPath('expo_configured', true);
        $r->assertJsonPath('settings.enabled', true);
        $r->assertJsonPath('settings.owners_enabled', true);
        $r->assertJsonPath('settings.detailings_enabled', true);
        $r->assertJsonPath('settings.broadcast_enabled', true);
    }

    public function test_admin_can_update_push_settings_and_public_endpoint_exposes_app_flags(): void
    {
        Config::set('support.admin_bearer_token', 'test-admin-bearer');

        $this->patchJson(
            '/api/admin/support/push/settings',
            [
                'enabled' => false,
                'owners_enabled' => false,
                'detailings_enabled' => true,
                'broadcast_enabled' => false,
            ],
            ['Authorization' => 'Bearer test-admin-bearer']
        )
            ->assertOk()
            ->assertJsonPath('settings.enabled', false)
            ->assertJsonPath('settings.owners_enabled', false)
            ->assertJsonPath('settings.detailings_enabled', true)
            ->assertJsonPath('settings.broadcast_enabled', false);

        $this->getJson('/api/push/settings')
            ->assertOk()
            ->assertJsonPath('enabled', false)
            ->assertJsonPath('owners_enabled', false)
            ->assertJsonPath('detailings_enabled', true)
            ->assertJsonMissing(['broadcast_enabled']);
    }

    public function test_disabled_owner_push_does_not_store_device_token(): void
    {
        Config::set('support.admin_bearer_token', 'test-admin-bearer');

        $owner = Owner::query()->create([
            'email' => 'push-owner@example.test',
            'password' => Hash::make('secret'),
            'name' => 'Owner',
            'phone' => '+7',
        ]);
        $token = $owner->createToken('owner')->plainTextToken;

        $this->patchJson(
            '/api/admin/support/push/settings',
            ['owners_enabled' => false],
            ['Authorization' => 'Bearer test-admin-bearer']
        )->assertOk();

        $this->postJson(
            '/api/owners/me/device-push-token',
            ['token' => 'fcm-token-1', 'platform' => 'android'],
            ['Authorization' => 'Bearer '.$token]
        )
            ->assertOk()
            ->assertJsonPath('push_enabled', false);

        $this->assertSame(0, DevicePushToken::query()->count());
    }

    public function test_broadcast_returns_503_when_fcm_not_configured(): void
    {
        Config::set('support.admin_bearer_token', 'test-admin-bearer');
        Config::set('firebase.expo_push_enabled', false);

        $r = $this->postJson(
            '/api/admin/support/push/broadcast',
            [
                'title' => 'Тест',
                'body' => 'Текст',
                'audience' => 'all',
            ],
            ['Authorization' => 'Bearer test-admin-bearer']
        );

        $r->assertStatus(503);
        $r->assertJsonPath('ok', false);
    }
}
