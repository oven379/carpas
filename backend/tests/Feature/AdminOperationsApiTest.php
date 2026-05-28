<?php

namespace Tests\Feature;

use App\Models\AppNotification;
use App\Models\Car;
use App\Models\CarEvent;
use App\Models\DevicePushToken;
use App\Models\Owner;
use App\Models\ServiceBookingRequest;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Hash;

class AdminOperationsApiTest extends FeatureTestCase
{
    public function test_operations_requires_admin_bearer(): void
    {
        $this->getJson('/api/admin/support/operations')->assertStatus(401);
    }

    public function test_operations_returns_booking_notifications_scheduler_and_logs(): void
    {
        Config::set('support.admin_bearer_token', 'test-admin-bearer');

        $detailing = $this->detailing(['name' => 'Demo Studio', 'email' => 'studio@example.test']);
        $owner = Owner::query()->create([
            'email' => 'owner@example.test',
            'password' => Hash::make('secret'),
            'name' => 'Owner',
            'phone' => '+79990000000',
        ]);
        $car = Car::query()->create([
            'owner_id' => $owner->id,
            'detailing_id' => $detailing->id,
            'make' => 'Audi',
            'model' => 'A4',
            'year' => 2020,
            'vin' => 'WAUZZZ8K0AA000001',
            'mileage_km' => 75000,
        ]);
        $event = CarEvent::query()->create([
            'car_id' => $car->id,
            'detailing_id' => $detailing->id,
            'source' => 'service',
            'title' => 'Комплексный уход',
            'at' => now()->subDays(20),
            'next_contact_at' => now()->subDay(),
            'is_draft' => false,
        ]);
        ServiceBookingRequest::query()->create([
            'owner_id' => $owner->id,
            'detailing_id' => $detailing->id,
            'car_id' => $car->id,
            'car_event_id' => $event->id,
            'status' => ServiceBookingRequest::STATUS_NEW,
            'message' => 'Хочу записаться',
        ]);
        AppNotification::query()->create([
            'detailing_id' => $detailing->id,
            'kind' => 'owner_booking_request',
            'title' => 'Клиент хочет записаться',
            'body' => 'Хочу записаться на повторный уход.',
            'data' => ['ownerName' => 'Owner', 'carName' => 'Audi A4', 'ownerPhone' => '+79990000000'],
        ]);

        $this->getJson('/api/admin/support/operations', [
            'Authorization' => 'Bearer test-admin-bearer',
        ])
            ->assertOk()
            ->assertJsonPath('summary.bookingOpen', 1)
            ->assertJsonPath('summary.bookingNew', 1)
            ->assertJsonPath('summary.dueWithoutNotification', 1)
            ->assertJsonStructure([
                'bookings' => [['id', 'status', 'owner', 'detailing', 'car', 'createdAt']],
                'notifications' => [['id', 'kind', 'title', 'body', 'data', 'createdAt']],
                'scheduler' => ['lastRunAt', 'lastCreated', 'dueWithoutNotification'],
                'logs',
            ]);
    }

    public function test_admin_can_list_and_delete_push_device(): void
    {
        Config::set('support.admin_bearer_token', 'test-admin-bearer');

        $owner = Owner::query()->create([
            'email' => 'device-owner@example.test',
            'password' => Hash::make('secret'),
            'name' => 'Device Owner',
        ]);
        $token = DevicePushToken::query()->create([
            'owner_id' => $owner->id,
            'token' => 'ExponentPushToken[test-device]',
            'platform' => 'expo',
        ]);

        $this->getJson('/api/admin/support/push/devices', [
            'Authorization' => 'Bearer test-admin-bearer',
        ])
            ->assertOk()
            ->assertJsonPath('items.0.id', (string) $token->id)
            ->assertJsonPath('items.0.audience', 'owner');

        $this->deleteJson('/api/admin/support/push/devices/'.$token->id, [], [
            'Authorization' => 'Bearer test-admin-bearer',
        ])->assertOk();

        $this->assertSame(0, DevicePushToken::query()->count());
    }
}
