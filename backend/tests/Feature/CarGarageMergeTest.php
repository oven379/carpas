<?php

namespace Tests\Feature;

use App\Models\Car;
use App\Models\CarClaim;
use App\Models\CarEvent;
use App\Models\Owner;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;

class CarGarageMergeTest extends FeatureTestCase
{
    public function test_claim_approve_merges_personal_garage_duplicate_by_vin(): void
    {
        $owner = Owner::query()->create([
            'email' => 'merge-owner@example.test',
            'password' => Hash::make('secret'),
            'name' => 'Иван',
            'phone' => '+7',
        ]);

        $studio = $this->detailing();

        $vin = 'WBA12345678901234';

        $personalCar = Car::query()->create([
            'detailing_id' => null,
            'owner_id' => $owner->id,
            'vin' => $vin,
            'plate' => '',
            'plate_region' => '',
            'make' => 'BMW',
            'model' => 'X5',
            'year' => 2019,
            'mileage_km' => 50000,
            'price_rub' => 0,
            'color' => 'чёрный',
            'city' => 'Москва',
            'hero' => null,
            'segment' => 'mass',
            'seller' => null,
        ]);

        $serviceCar = Car::query()->create([
            'detailing_id' => $studio->id,
            'owner_id' => null,
            'vin' => $vin,
            'plate' => '',
            'plate_region' => '',
            'make' => 'BMW',
            'model' => 'X5',
            'year' => 2019,
            'mileage_km' => 0,
            'price_rub' => 0,
            'color' => '',
            'city' => '',
            'hero' => null,
            'segment' => 'mass',
            'seller' => null,
        ]);

        $ev = CarEvent::query()->create([
            'detailing_id' => null,
            'car_id' => $personalCar->id,
            'owner_id' => $owner->id,
            'at' => now(),
            'type' => 'visit',
            'title' => 'Мой визит',
            'mileage_km' => 49000,
            'services' => [],
            'note' => null,
            'source' => 'owner',
        ]);

        $claim = CarClaim::query()->create([
            'car_id' => $serviceCar->id,
            'owner_id' => $owner->id,
            'detailing_id' => $studio->id,
            'status' => 'pending',
            'evidence' => [],
        ]);

        Sanctum::actingAs($studio);

        $this->patchJson("/api/claims/{$claim->id}", ['status' => 'approved'])
            ->assertOk();

        $this->assertDatabaseMissing('cars', ['id' => $personalCar->id]);
        $this->assertDatabaseHas('cars', [
            'id' => $serviceCar->id,
            'owner_id' => $owner->id,
            'detailing_id' => $studio->id,
        ]);

        $this->assertDatabaseHas('car_events', [
            'id' => $ev->id,
            'car_id' => $serviceCar->id,
            'detailing_id' => $studio->id,
        ]);
    }

    public function test_detailing_can_link_personal_garage_car_with_year_evidence(): void
    {
        $owner = Owner::query()->create([
            'email' => 'link-owner@example.test',
            'password' => Hash::make('secret'),
            'name' => 'Пётр',
            'phone' => '+7',
        ]);

        $studio = $this->detailing();

        $car = Car::query()->create([
            'detailing_id' => null,
            'owner_id' => $owner->id,
            'vin' => 'XW8ZZZ61ZJG123456',
            'plate' => '',
            'plate_region' => '',
            'make' => 'VW',
            'model' => 'Polo',
            'year' => 2018,
            'mileage_km' => 12000,
            'price_rub' => 0,
            'color' => '',
            'city' => 'Казань',
            'hero' => null,
            'segment' => 'mass',
            'seller' => null,
        ]);

        Sanctum::actingAs($studio);

        $this->postJson('/api/cars/link-from-personal-garage', [
            'carId' => (string) $car->id,
            'year' => '2018',
            'city' => '',
        ])
            ->assertOk()
            ->assertJsonPath('id', (string) $car->id);

        $this->assertDatabaseHas('cars', [
            'id' => $car->id,
            'detailing_id' => $studio->id,
            'owner_id' => $owner->id,
        ]);
    }
}
