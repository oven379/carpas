<?php

namespace Tests\Feature;

use App\Models\Car;
use App\Models\CarShare;
use App\Models\Owner;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;

class CarShareApiTest extends FeatureTestCase
{
    private function owner(): Owner
    {
        return Owner::query()->create([
            'email' => 'share-owner-'.uniqid('', true).'@example.test',
            'password' => Hash::make('secret'),
            'name' => 'Владелец',
            'garage_private' => true,
        ]);
    }

    private function carForOwner(int $ownerId, ?int $detailingId = null): Car
    {
        return Car::query()->create([
            'detailing_id' => $detailingId,
            'owner_id' => $ownerId,
            'vin' => 'VIN123',
            'plate' => 'B777BB',
            'make' => 'BMW',
            'model' => 'X5',
            'year' => 2021,
            'mileage_km' => 5000,
            'price_rub' => 0,
            'color' => 'чёрный',
            'city' => 'Москва',
            'hero' => null,
            'segment' => 'mass',
            'seller' => null,
        ]);
    }

    public function test_share_lifecycle_and_public_by_token(): void
    {
        $owner = $this->owner();
        $car = $this->carForOwner($owner->id, $this->detailing()->id);
        Sanctum::actingAs($owner);

        $this->getJson("/api/owners/cars/{$car->id}/shares")->assertOk()->assertJsonCount(0);

        $created = $this->postJson("/api/owners/cars/{$car->id}/shares");
        $created->assertOk();
        $token = $created->json('token');
        $this->assertNotEmpty($token);

        $this->getJson("/api/owners/cars/{$car->id}/shares")->assertOk()->assertJsonCount(1);

        $public = $this->getJson("/api/share/{$token}");
        $public->assertOk();
        $public->assertJsonPath('car.make', 'BMW');
        $public->assertJsonPath('car.vin', '');
        $public->assertJsonPath('car.plate', 'B777BB');

        $this->deleteJson("/api/owners/shares/{$token}")
            ->assertOk()
            ->assertJsonPath('ok', true);

        $this->getJson("/api/share/{$token}")->assertNotFound();
    }

    public function test_revoked_share_not_accessible_publicly(): void
    {
        $owner = $this->owner();
        $car = $this->carForOwner($owner->id, $this->detailing()->id);
        $share = CarShare::query()->create([
            'car_id' => $car->id,
            'token' => 'fixedtokentestshare123456789012',
            'created_at' => now(),
            'revoked_at' => now(),
        ]);

        $this->getJson('/api/share/'.$share->token)->assertNotFound();
    }

    public function test_detailing_cannot_create_public_history_share(): void
    {
        $owner = $this->owner();
        $d = $this->detailing();
        $car = $this->carForOwner($owner->id, $d->id);
        Sanctum::actingAs($d);

        $this->postJson("/api/cars/{$car->id}/shares")->assertNotFound();
        $this->getJson("/api/cars/{$car->id}/shares")->assertNotFound();
    }
}
