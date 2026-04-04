<?php

namespace Tests\Feature;

use App\Models\Car;
use App\Models\CarShare;
use Laravel\Sanctum\Sanctum;

class CarShareApiTest extends FeatureTestCase
{
    private function carForDetailing(int $detailingId): Car
    {
        return Car::query()->create([
            'detailing_id' => $detailingId,
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
        $d = $this->detailing();
        $car = $this->carForDetailing($d->id);
        Sanctum::actingAs($d);

        $this->getJson("/api/cars/{$car->id}/shares")->assertOk()->assertJsonCount(0);

        $created = $this->postJson("/api/cars/{$car->id}/shares");
        $created->assertOk();
        $token = $created->json('token');
        $this->assertNotEmpty($token);

        $this->getJson("/api/cars/{$car->id}/shares")->assertOk()->assertJsonCount(1);

        $public = $this->getJson("/api/share/{$token}");
        $public->assertOk();
        $public->assertJsonPath('car.make', 'BMW');
        $public->assertJsonPath('car.vin', '');
        $public->assertJsonPath('car.plate', 'B777BB');

        $this->deleteJson("/api/shares/{$token}")
            ->assertOk()
            ->assertJsonPath('ok', true);

        $this->getJson("/api/share/{$token}")->assertNotFound();
    }

    public function test_revoked_share_not_accessible_publicly(): void
    {
        $car = $this->carForDetailing($this->detailing()->id);
        $share = CarShare::query()->create([
            'car_id' => $car->id,
            'token' => 'fixedtokentestshare123456789012',
            'created_at' => now(),
            'revoked_at' => now(),
        ]);

        $this->getJson('/api/share/'.$share->token)->assertNotFound();
    }
}
