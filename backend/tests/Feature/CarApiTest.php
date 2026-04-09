<?php

namespace Tests\Feature;

use App\Models\Car;
use Laravel\Sanctum\Sanctum;

class CarApiTest extends FeatureTestCase
{
    public function test_cars_require_authentication(): void
    {
        $this->getJson('/api/cars')->assertUnauthorized();
    }

    public function test_can_list_store_show_update_delete_own_cars(): void
    {
        $d = $this->detailing();
        Sanctum::actingAs($d);

        $this->getJson('/api/cars')->assertOk()->assertJsonCount(0);

        $create = $this->postJson('/api/cars', [
            'make' => 'Toyota',
            'model' => 'Camry',
            'year' => 2020,
            'plate' => 'A123BC',
            'plateRegion' => '77',
        ]);
        $create->assertOk();
        $create->assertJsonPath('make', 'Toyota');
        $id = $create->json('id');
        $this->assertNotEmpty($id);

        $this->getJson('/api/cars')->assertOk()->assertJsonCount(1);

        $this->getJson("/api/cars/{$id}")
            ->assertOk()
            ->assertJsonPath('plate', 'A123BC');

        $this->patchJson("/api/cars/{$id}", ['color' => 'белый'])
            ->assertOk()
            ->assertJsonPath('color', 'белый');

        $this->deleteJson("/api/cars/{$id}")
            ->assertOk()
            ->assertJsonPath('ok', true);

        $this->assertDatabaseMissing('cars', ['id' => $id]);
    }

    public function test_store_car_empty_year_string_becomes_null(): void
    {
        $d = $this->detailing();
        Sanctum::actingAs($d);

        $create = $this->postJson('/api/cars', [
            'make' => 'Lada',
            'model' => 'Vesta',
            'year' => '',
            'vin' => '',
            'plate' => '',
            'plateRegion' => '',
        ]);
        $create->assertOk();
        $create->assertJsonPath('year', null);
        $id = $create->json('id');
        $this->assertDatabaseHas('cars', [
            'id' => $id,
            'year' => null,
        ]);
    }

    public function test_cannot_access_other_detailing_car(): void
    {
        $owner = $this->detailing();
        $other = $this->detailing();
        $car = Car::query()->create([
            'detailing_id' => $owner->id,
            'vin' => '',
            'plate' => 'X',
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

        Sanctum::actingAs($other);

        $this->getJson("/api/cars/{$car->id}")->assertNotFound();
        $this->patchJson("/api/cars/{$car->id}", ['color' => 'x'])->assertNotFound();
        $this->deleteJson("/api/cars/{$car->id}")->assertNotFound();
    }
}
