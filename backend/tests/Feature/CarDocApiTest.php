<?php

namespace Tests\Feature;

use App\Models\Car;
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
}
