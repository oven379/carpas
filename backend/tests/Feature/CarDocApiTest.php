<?php

namespace Tests\Feature;

use App\Models\Car;
use App\Models\CarDoc;
use App\Models\Owner;
use Laravel\Sanctum\Sanctum;

class CarDocApiTest extends FeatureTestCase
{
    private function carForDetailing(int $detailingId): Car
    {
        return Car::query()->create([
            'detailing_id' => $detailingId,
            'vin' => '',
            'plate' => '',
            'make' => '',
            'model' => '',
            'year' => null,
            'mileage_km' => 0,
            'price_rub' => 0,
            'color' => '',
            'city' => '',
            'hero' => null,
            'segment' => 'mass',
            'seller' => null,
        ]);
    }

    public function test_docs_list_create_delete(): void
    {
        $d = $this->detailing();
        $car = $this->carForDetailing($d->id);
        Sanctum::actingAs($d);

        $this->getJson("/api/cars/{$car->id}/docs")->assertOk()->assertJsonCount(0);

        $store = $this->postJson("/api/cars/{$car->id}/docs", [
            'title' => 'Фото до',
            'kind' => 'photo',
            'url' => 'https://example.test/a.jpg',
        ]);
        $store->assertOk();
        $store->assertJsonPath('title', 'Фото до');
        $store->assertJsonPath('url', 'https://example.test/a.jpg');
        $docId = $store->json('id');

        $this->getJson("/api/cars/{$car->id}/docs")->assertOk()->assertJsonCount(1);

        $this->deleteJson("/api/docs/{$docId}")
            ->assertOk()
            ->assertJsonPath('ok', true);

        $this->assertDatabaseMissing('car_docs', ['id' => $docId]);
    }

    public function test_detailing_docs_do_not_expose_owner_docs(): void
    {
        $d = $this->detailing();
        $owner = Owner::query()->create([
            'email' => 'owner-'.uniqid('', true).'@example.test',
            'password' => bcrypt('secret'),
            'name' => 'Владелец',
        ]);
        $car = $this->carForDetailing($d->id);
        $car->owner_id = $owner->id;
        $car->save();

        $ownerDoc = CarDoc::query()->create([
            'detailing_id' => $d->id,
            'car_id' => $car->id,
            'owner_id' => $owner->id,
            'source' => 'owner',
            'event_id' => null,
            'title' => 'Личное фото',
            'kind' => 'photo',
            'url' => 'https://example.test/private.jpg',
        ]);
        CarDoc::query()->create([
            'detailing_id' => $d->id,
            'car_id' => $car->id,
            'owner_id' => null,
            'source' => 'service',
            'event_id' => null,
            'title' => 'Фото сервиса',
            'kind' => 'photo',
            'url' => 'https://example.test/service.jpg',
        ]);

        Sanctum::actingAs($d);

        $this->getJson("/api/cars/{$car->id}/docs")
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonMissing(['title' => 'Личное фото'])
            ->assertJsonFragment(['title' => 'Фото сервиса']);

        $this->deleteJson("/api/docs/{$ownerDoc->id}")->assertNotFound();
        $this->assertDatabaseHas('car_docs', ['id' => $ownerDoc->id]);
    }
}
