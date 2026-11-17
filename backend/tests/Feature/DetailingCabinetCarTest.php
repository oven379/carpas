<?php

namespace Tests\Feature;

use App\Http\Support\PendingOwnerPool;
use App\Models\Car;
use App\Models\CarEvent;
use App\Models\Owner;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;

class DetailingCabinetCarTest extends FeatureTestCase
{
    public function test_partner_can_add_an_existing_car_once_without_moving_it_or_creating_a_visit(): void
    {
        $origin = $this->detailing();
        $partner = $this->detailing();
        $car = Car::query()->create([
            'detailing_id' => $origin->id,
            'vin' => 'YW8ZZZ61ZJG000001',
            'client_email' => 'origin-client@example.test',
        ]);
        $payload = ['carId' => (string) $car->id, 'vin' => strtolower($car->vin)];
        $search = '/api/cars/search-duplicate?vin='.$car->vin;

        $this->postJson('/api/cars/add-existing', $payload)->assertUnauthorized();
        Sanctum::actingAs($partner);
        $this->getJson($search)
            ->assertOk()
            ->assertJsonPath('0.alreadyInDetailingCabinet', false)
            ->assertJsonPath('0.ownerApprovalRequired', false)
            ->assertJsonPath('0.canAddToDetailing', true)
            ->assertJsonMissingPath('0.clientEmail');
        $this->postJson('/api/cars/add-existing', [...$payload, 'vin' => 'YW8ZZZ61ZJG000002'])->assertNotFound();
        $this->postJson('/api/cars/add-existing', $payload)->assertOk()->assertJsonPath('carId', (string) $car->id);
        $this->postJson('/api/cars/add-existing', $payload)->assertOk();

        $this->assertDatabaseCount('cars', 1);
        $this->assertDatabaseCount('detailing_cabinet_cars', 1);
        $this->assertDatabaseCount('car_events', 0);
        $this->assertDatabaseHas('cars', ['id' => $car->id, 'detailing_id' => $origin->id, 'owner_id' => null]);
        $this->getJson($search)->assertOk()->assertJsonPath('0.alreadyInDetailingCabinet', true);
        $this->getJson('/api/cars')->assertOk()->assertJsonPath('0.id', (string) $car->id)->assertJsonMissingPath('0.clientEmail');
        $this->getJson('/api/detailings/crm/clients')
            ->assertOk()
            ->assertJsonPath('items.0.car.id', (string) $car->id)
            ->assertJsonPath('items.0.client.email', '')
            ->assertJsonPath('items.0.lastVisit', null)
            ->assertJsonPath('items.0.stats.visitsCount', 0);
        $this->patchJson('/api/cars/'.$car->id, ['make' => 'Other'])->assertNotFound();

        Sanctum::actingAs($this->detailing());
        $this->getJson('/api/cars')->assertOk()->assertJsonCount(0);
        $this->deleteJson('/api/cars/'.$car->id)->assertNotFound();

        Sanctum::actingAs($origin);
        $this->deleteJson('/api/cars/'.$car->id)->assertOk();
        $this->assertDatabaseHas('cars', ['id' => $car->id, 'detailing_id' => null]);

        Sanctum::actingAs($partner);
        $this->getJson('/api/cars')->assertOk()->assertJsonCount(1);
        $visit = CarEvent::query()->create([
            'detailing_id' => $partner->id,
            'car_id' => $car->id,
            'source' => 'service',
            'at' => now(),
            'type' => 'visit',
        ]);
        $this->deleteJson('/api/cars/'.$car->id)->assertOk();
        $this->getJson('/api/cars')->assertOk()->assertJsonCount(0);
        $this->assertDatabaseHas('car_events', [
            'id' => $visit->id,
            'car_id' => $car->id,
            'detailing_id' => null,
            'service_partner_name' => $partner->name,
        ]);
        $this->getJson($search)->assertOk()->assertJsonPath('0.canAddToDetailing', true);
        $this->assertDatabaseCount('cars', 1);
        $this->assertDatabaseCount('detailing_cabinet_cars', 0);
    }

    public function test_direct_add_rechecks_ownership_and_the_reserved_pool(): void
    {
        $owner = Owner::query()->create([
            'email' => 'private-owner@example.test',
            'password' => Hash::make('secret'),
        ]);
        $car = Car::query()->create(['vin' => 'YW8ZZZ61ZJG000001']);
        $payload = ['carId' => (string) $car->id, 'vin' => $car->vin];
        $search = '/api/cars/search-duplicate?vin='.$car->vin;

        Sanctum::actingAs($owner);
        $this->postJson('/api/cars/add-existing', $payload)->assertForbidden();

        Sanctum::actingAs($this->detailing());
        $this->getJson($search)->assertOk()->assertJsonPath('0.ownerApprovalRequired', false);
        $car->update(['owner_id' => $owner->id]);
        $this->postJson('/api/cars/add-existing', $payload)->assertStatus(409)->assertJsonPath('code', 'owner_approval_required');
        $this->getJson($search)
            ->assertOk()
            ->assertJsonPath('0.ownerApprovalRequired', true)
            ->assertJsonPath('0.alreadyInDetailingCabinet', false)
            ->assertJsonMissingPath('0.ownerEmail');

        $car->update(['owner_id' => null, 'detailing_id' => PendingOwnerPool::detailingId()]);
        $this->getJson($search)
            ->assertOk()
            ->assertJsonPath('0.canAddToDetailing', false)
            ->assertJsonPath('0.ownerApprovalRequired', false);
        $this->postJson('/api/cars/add-existing', $payload)->assertStatus(409)->assertJsonPath('code', 'car_reserved');
        $this->assertDatabaseCount('detailing_cabinet_cars', 0);
    }
}
