<?php

namespace Tests\Feature;

use App\Models\Car;
use App\Models\CarDoc;
use App\Models\Owner;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;

class OwnerCarDocApiTest extends FeatureTestCase
{
    private function ownerWithGarageCar(): array
    {
        $owner = Owner::query()->create([
            'email' => 'owner-docs-'.uniqid('', true).'@example.test',
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
            'mileage_km' => 0,
            'price_rub' => 0,
            'color' => '',
            'city' => '',
            'hero' => null,
            'segment' => 'mass',
            'seller' => null,
        ]);

        return [$owner, $car];
    }

    public function test_owner_deletes_doc_by_doc_id_without_car_in_path(): void
    {
        [$owner, $car] = $this->ownerWithGarageCar();
        Sanctum::actingAs($owner);

        $doc = CarDoc::query()->create([
            'detailing_id' => $car->detailing_id,
            'car_id' => $car->id,
            'owner_id' => $owner->id,
            'source' => 'owner',
            'event_id' => null,
            'title' => 'Фото',
            'kind' => 'photo',
            'url' => 'https://example.test/x.jpg',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->deleteJson("/api/owners/docs/{$doc->id}")
            ->assertOk()
            ->assertJsonPath('ok', true);

        $this->assertDatabaseMissing('car_docs', ['id' => $doc->id]);
    }

    public function test_owner_cannot_delete_other_owners_doc(): void
    {
        [$ownerA, $carA] = $this->ownerWithGarageCar();
        [, $carB] = $this->ownerWithGarageCar();

        $docOnB = CarDoc::query()->create([
            'detailing_id' => $carB->detailing_id,
            'car_id' => $carB->id,
            'owner_id' => null,
            'source' => 'owner',
            'event_id' => null,
            'title' => 'Чужое',
            'kind' => 'photo',
            'url' => 'https://example.test/y.jpg',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Sanctum::actingAs($ownerA);
        $this->deleteJson("/api/owners/docs/{$docOnB->id}")->assertStatus(404);
    }

    public function test_owner_cannot_delete_service_doc_on_own_car(): void
    {
        [$owner, $car] = $this->ownerWithGarageCar();
        Sanctum::actingAs($owner);

        $doc = CarDoc::query()->create([
            'detailing_id' => $car->detailing_id,
            'car_id' => $car->id,
            'owner_id' => null,
            'source' => 'service',
            'event_id' => null,
            'title' => 'Сервис',
            'kind' => 'photo',
            'url' => 'https://example.test/z.jpg',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->deleteJson("/api/owners/docs/{$doc->id}")->assertStatus(403);
    }
}
