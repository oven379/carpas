<?php

namespace Tests\Feature;

use App\Models\Car;
use App\Models\Detailing;
use App\Models\Owner;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;

class OwnerCarEventApiTest extends FeatureTestCase
{
    private function ownerWithPersonalDetailing(): array
    {
        $owner = Owner::query()->create([
            'email' => 'owner-cev-'.uniqid('', true).'@example.test',
            'password' => Hash::make('secret'),
            'name' => 'Владелец',
            'phone' => '+7',
        ]);
        $det = Detailing::query()->create([
            'name' => 'Гараж',
            'email' => 'od-cev-'.uniqid('', true).'@garage.internal',
            'password' => Hash::make('secret'),
            'is_personal' => true,
            'owner_id' => $owner->id,
            'profile_completed' => true,
        ]);
        $car = Car::query()->create([
            'detailing_id' => $det->id,
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
        [$owner, $car] = $this->ownerWithPersonalDetailing();
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

    public function test_owner_can_patch_care_tips_on_own_visit(): void
    {
        [$owner, $car] = $this->ownerWithPersonalDetailing();
        Sanctum::actingAs($owner);

        $create = $this->postJson("/api/owners/cars/{$car->id}/events", [
            'type' => 'visit',
            'title' => 'Визит',
            'mileageKm' => 1300,
            'services' => [],
            'maintenanceServices' => [],
        ])->assertOk();

        $id = $create->json('id');
        $this->assertNotEmpty($id);

        $this->patchJson("/api/owners/cars/{$car->id}/events/{$id}", [
            'careTips' => [
                'important' => 'Обновлённый совет',
                'tips' => [],
            ],
        ])
            ->assertOk()
            ->assertJsonPath('careTips.important', 'Обновлённый совет');
    }
}
