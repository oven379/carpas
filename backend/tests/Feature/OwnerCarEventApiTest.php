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

    public function test_owner_reuses_existing_draft_and_can_finalize_it(): void
    {
        [$owner, $car] = $this->ownerWithGarageCar();
        Sanctum::actingAs($owner);

        $first = $this->postJson("/api/owners/cars/{$car->id}/events", [
            'type' => 'visit',
            'isDraft' => true,
            'mileageKm' => 1000,
        ]);

        $first->assertOk()
            ->assertJsonPath('source', 'owner')
            ->assertJsonPath('isDraft', true);
        $draftId = $first->json('id');

        $second = $this->postJson("/api/owners/cars/{$car->id}/events", [
            'type' => 'visit',
            'isDraft' => true,
            'mileageKm' => 1400,
        ]);

        $second->assertOk()
            ->assertJsonPath('id', $draftId)
            ->assertJsonPath('mileageKm', 1000);

        $this->getJson("/api/owners/cars/{$car->id}/events")
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $draftId)
            ->assertJsonPath('0.isDraft', true);

        $this->patchJson("/api/owners/cars/{$car->id}/events/{$draftId}", [
            'title' => 'Черновик владельца',
            'mileageKm' => 1250,
            'note' => 'Записал заметку',
            'careTips' => [
                'important' => 'Проверить через неделю',
                'tips' => [],
            ],
            'isDraft' => true,
        ])
            ->assertOk()
            ->assertJsonPath('id', $draftId)
            ->assertJsonPath('title', 'Черновик владельца')
            ->assertJsonPath('isDraft', true);

        $this->postJson("/api/owners/cars/{$car->id}/events", [
            'type' => 'visit',
            'isDraft' => true,
            'mileageKm' => 1400,
        ])->assertOk()
            ->assertJsonPath('id', $draftId)
            ->assertJsonPath('title', 'Черновик владельца')
            ->assertJsonPath('note', 'Записал заметку');

        $this->patchJson("/api/owners/cars/{$car->id}/events/{$draftId}", [
            'title' => 'Самостоятельный визит',
            'mileageKm' => 1500,
            'isDraft' => false,
        ])
            ->assertOk()
            ->assertJsonPath('isDraft', false);

        $this->assertDatabaseCount('car_events', 1);
        $this->assertDatabaseHas('cars', [
            'id' => $car->id,
            'mileage_km' => 1500,
        ]);
    }
}
