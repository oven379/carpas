<?php

namespace Tests\Feature;

use App\Models\Car;
use App\Models\Owner;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;

class OwnerCarEventApiTest extends FeatureTestCase
{
    private function ownerWithGarageCar(): array
    {
        $owner = Owner::query()->create([
            'email' => 'owner-cev-'.uniqid('', true).'@example.test',
            'password' => Hash::make('secret'),
            'name' => 'Владелец',
            'phone' => '+7',
        ]);
        $car = Car::query()->create([
            'detailing_id' => null,
            'owner_id' => $owner->id,
            'vin' => '',
            'plate' => '',
            'make' => 'Test',
            'model' => 'Car',
            'year' => null,
            'mileage_km' => 1000,
            'price_rub' => 0,
            'color' => '',
            'city' => '',
            'hero' => null,
            'segment' => 'mass',
            'seller' => null,
        ]);

        return [$owner, $car];
    }

    public function test_owner_can_store_visit_with_care_tips(): void
    {
        [$owner, $car] = $this->ownerWithGarageCar();
        Sanctum::actingAs($owner);

        $this->postJson("/api/owners/cars/{$car->id}/events", [
            'type' => 'visit',
            'title' => 'Мой визит',
            'mileageKm' => 1200,
            'note' => null,
            'services' => [],
            'maintenanceServices' => [],
            'careTips' => [
                'important' => 'Проверить давление через неделю',
                'tips' => [],
            ],
        ])
            ->assertOk()
            ->assertJsonPath('source', 'owner')
            ->assertJsonPath('careTips.important', 'Проверить давление через неделю');
    }

    public function test_owner_store_rejects_care_tips_over_non_space_limit(): void
    {
        [$owner, $car] = $this->ownerWithGarageCar();
        Sanctum::actingAs($owner);

        $tooLong = str_repeat('x', 301);

        $this->postJson("/api/owners/cars/{$car->id}/events", [
            'type' => 'visit',
            'title' => 'Визит',
            'mileageKm' => 1200,
            'careTips' => [
                'important' => $tooLong,
                'tips' => [],
            ],
        ])
            ->assertStatus(422);
    }
}
