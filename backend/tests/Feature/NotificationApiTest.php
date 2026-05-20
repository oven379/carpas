<?php

namespace Tests\Feature;

use App\Models\AppNotification;
use App\Models\Detailing;
use App\Models\Owner;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class NotificationApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_list_and_mark_notifications_read(): void
    {
        $owner = Owner::query()->create([
            'email' => 'notify-owner@example.test',
            'password' => Hash::make('secret'),
            'name' => 'Owner',
            'phone' => '+7',
        ]);
        AppNotification::query()->create([
            'owner_id' => $owner->id,
            'title' => 'Машина готова',
            'body' => 'Можно забирать автомобиль.',
            'kind' => 'car_ready',
        ]);

        Sanctum::actingAs($owner);

        $this->getJson('/api/notifications')
            ->assertOk()
            ->assertJsonPath('unread_count', 1)
            ->assertJsonPath('items.0.title', 'Машина готова');

        $this->patchJson('/api/notifications/read-all')
            ->assertOk()
            ->assertJsonPath('updated', 1);

        $this->getJson('/api/notifications/unread-count')
            ->assertOk()
            ->assertJsonPath('unread_count', 0);

        $this->deleteJson('/api/notifications')
            ->assertOk()
            ->assertJsonPath('deleted', 1);

        $this->assertSame(0, AppNotification::query()->where('owner_id', $owner->id)->count());
    }

    public function test_admin_broadcast_creates_internal_notifications_without_device_tokens(): void
    {
        Config::set('support.admin_bearer_token', 'test-admin-bearer');
        Owner::query()->create([
            'email' => 'broadcast-owner@example.test',
            'password' => Hash::make('secret'),
            'name' => 'Owner',
            'phone' => '+7',
        ]);
        Detailing::query()->create([
            'email' => 'broadcast-detailing@example.test',
            'password' => Hash::make('secret'),
            'name' => 'Studio',
            'verification_approved_at' => now(),
        ]);

        $this->postJson(
            '/api/admin/support/push/broadcast',
            ['title' => 'Новость', 'body' => 'Тестовое сообщение', 'audience' => 'all'],
            ['Authorization' => 'Bearer test-admin-bearer']
        )
            ->assertOk()
            ->assertJsonPath('sent', 0)
            ->assertJsonPath('internal_created', 2);

        $this->assertSame(2, AppNotification::query()->where('kind', 'admin_broadcast')->count());
    }
}
