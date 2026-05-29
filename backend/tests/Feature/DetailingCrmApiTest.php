<?php

namespace Tests\Feature;

use App\Models\Car;
use App\Models\CarDoc;
use App\Models\CarEvent;
use App\Models\DevicePushToken;
use App\Models\DetailingClientNote;
use App\Models\Owner;
use App\Services\FcmV1Client;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Mockery;

class DetailingCrmApiTest extends FeatureTestCase
{
    private function carForDetailing(int $detailingId, array $overrides = []): Car
    {
        return Car::query()->create(array_merge([
            'detailing_id' => $detailingId,
            'vin' => 'WVWZZZ1KZAW000001',
            'plate' => 'A123BC',
            'plate_region' => '77',
            'make' => 'Acura',
            'model' => 'RSX',
            'year' => 2026,
            'mileage_km' => 61000,
            'price_rub' => 0,
            'color' => '',
            'city' => 'Москва',
            'hero' => null,
            'segment' => 'mass',
            'seller' => null,
            'client_name' => 'Иван',
            'client_phone' => '+7 999 111 22 33',
            'client_email' => 'client@example.test',
        ], $overrides));
    }

    public function test_clients_endpoint_requires_detailing_auth(): void
    {
        $this->getJson('/api/detailings/crm/clients')->assertUnauthorized();
    }

    public function test_clients_endpoint_returns_only_current_detailing_crm_rows(): void
    {
        $d = $this->detailing();
        $other = $this->detailing();
        $owner = Owner::query()->create([
            'email' => 'owner-'.uniqid('', true).'@example.test',
            'password' => Hash::make('secret'),
            'name' => 'Владелец',
            'phone' => '+7 999 000 11 22',
            'garage_slug' => 'owner-garage',
        ]);

        $olderCar = $this->carForDetailing($d->id, [
            'vin' => 'WVWZZZ1KZAW000003',
            'make' => 'BMW',
            'model' => '320i',
            'owner_id' => $owner->id,
            'updated_at' => now(),
        ]);
        $car = $this->carForDetailing($d->id, [
            'owner_id' => $owner->id,
            'updated_at' => now()->subDays(5),
        ]);
        $noVisitCar = $this->carForDetailing($d->id, [
            'vin' => 'WVWZZZ1KZAW000004',
            'make' => 'Volkswagen',
            'model' => 'Polo',
            'owner_id' => null,
            'client_email' => 'no-visit@example.test',
            'updated_at' => now(),
        ]);
        $foreign = $this->carForDetailing($other->id, [
            'vin' => 'WVWZZZ1KZAW000002',
            'client_email' => 'foreign@example.test',
        ]);

        CarEvent::query()->create([
            'detailing_id' => $d->id,
            'car_id' => $olderCar->id,
            'owner_id' => $owner->id,
            'source' => 'service',
            'is_draft' => false,
            'at' => now()->subDays(60),
            'type' => 'visit',
            'title' => 'Старый визит',
            'mileage_km' => 40000,
            'services' => [],
            'maintenance_services' => [],
            'note' => null,
            'next_contact_at' => now()->subDay(),
        ]);
        $visit = CarEvent::query()->create([
            'detailing_id' => $d->id,
            'car_id' => $car->id,
            'owner_id' => $owner->id,
            'source' => 'service',
            'is_draft' => false,
            'at' => now()->subDays(28),
            'type' => 'visit',
            'title' => 'Керамика',
            'mileage_km' => 61000,
            'services' => ['Керамика'],
            'maintenance_services' => [],
            'note' => null,
            'next_contact_at' => now()->addDays(2),
        ]);
        CarDoc::query()->create([
            'detailing_id' => $d->id,
            'car_id' => $car->id,
            'owner_id' => $owner->id,
            'source' => 'service',
            'event_id' => $visit->id,
            'title' => 'Фото после',
            'kind' => 'photo',
            'url' => 'crm/visit-after.jpg',
            'created_at' => now(),
        ]);
        CarEvent::query()->create([
            'detailing_id' => $other->id,
            'car_id' => $foreign->id,
            'owner_id' => null,
            'source' => 'service',
            'is_draft' => false,
            'at' => now(),
            'type' => 'visit',
            'title' => 'Чужой визит',
            'mileage_km' => 100,
            'services' => [],
            'maintenance_services' => [],
            'note' => null,
        ]);

        Sanctum::actingAs($d);

        $this->getJson('/api/detailings/crm/clients')
            ->assertOk()
            ->assertJsonCount(3, 'items')
            ->assertJsonPath('stats.cars', 3)
            ->assertJsonPath('stats.clients', 2)
            ->assertJsonPath('stats.remindersDue', 2)
            ->assertJsonPath('items.0.car.make', 'Acura')
            ->assertJsonPath('items.0.client.name', 'Иван')
            ->assertJsonPath('items.0.client.isRegisteredOwner', true)
            ->assertJsonPath('items.0.lastVisit.title', 'Керамика')
            ->assertJsonPath('items.0.lastVisit.photos.0.title', 'Фото после')
            ->assertJsonPath('items.1.lastVisit.title', 'Старый визит')
            ->assertJsonPath('items.2.id', (string) $noVisitCar->id)
            ->assertJsonPath('items.2.lastVisit', null)
            ->assertJsonPath('items.0.flags.needsReminder', true);
    }

    public function test_detailing_can_send_owner_push_for_linked_client_car(): void
    {
        $d = $this->detailing();
        $owner = Owner::query()->create([
            'email' => 'push-crm-owner@example.test',
            'password' => Hash::make('secret'),
            'name' => 'Владелец',
        ]);
        $car = $this->carForDetailing($d->id, ['owner_id' => $owner->id]);
        DevicePushToken::query()->create([
            'owner_id' => $owner->id,
            'detailing_id' => null,
            'token' => 'ExpoPushToken[owner-token]',
            'platform' => 'expo',
        ]);

        $this->mock(FcmV1Client::class, function ($mock) {
            $mock->shouldReceive('canSendAny')->once()->andReturn(true);
            $mock->shouldReceive('sendToTokens')
                ->once()
                ->with(['ExpoPushToken[owner-token]'], Mockery::type('string'), Mockery::type('string'))
                ->andReturn(['sent' => 1, 'failed' => 0, 'errors' => []]);
        });

        Sanctum::actingAs($d);

        $this->postJson("/api/detailings/crm/clients/{$car->id}/push", [
            'kind' => 'car_ready',
        ])
            ->assertOk()
            ->assertJsonPath('ok', true)
            ->assertJsonPath('sent', 1)
            ->assertJsonPath('failed', 0);
    }

    public function test_detailing_can_save_client_note_for_crm_card(): void
    {
        $d = $this->detailing();
        $owner = Owner::query()->create([
            'email' => 'note-crm-owner@example.test',
            'password' => Hash::make('secret'),
            'name' => 'Клиент с заметкой',
        ]);
        $car = $this->carForDetailing($d->id, ['owner_id' => $owner->id]);

        Sanctum::actingAs($d);

        $this->patchJson("/api/detailings/crm/clients/{$car->id}/note", [
            'note' => 'Звонить после 18:00. Просит фото до/после.',
        ])
            ->assertOk()
            ->assertJsonPath('clientNote', 'Звонить после 18:00. Просит фото до/после.');

        $this->assertDatabaseHas('detailing_client_notes', [
            'detailing_id' => $d->id,
            'owner_id' => $owner->id,
            'client_key' => 'owner:'.$owner->id,
        ]);

        $this->getJson('/api/detailings/crm/clients')
            ->assertOk()
            ->assertJsonPath('items.0.client.note', 'Звонить после 18:00. Просит фото до/после.');

        DetailingClientNote::query()->where('detailing_id', $d->id)->delete();
    }
}
