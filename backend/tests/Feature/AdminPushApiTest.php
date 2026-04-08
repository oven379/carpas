<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
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
    }

    public function test_broadcast_returns_503_when_fcm_not_configured(): void
    {
        Config::set('support.admin_bearer_token', 'test-admin-bearer');

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
