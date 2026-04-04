<?php

namespace Tests\Feature;

use App\Models\Car;
use Laravel\Sanctum\Sanctum;

class CarEventApiTest extends FeatureTestCase
{
    private function carForDetailing(int $detailingId): Car
    {
        return Car::query()->create([
            'detailing_id' => $detailingId,
            'vin' => '',
            'plate' => '',
            'make' => 'VW',
            'model' => 'Golf',
            'year' => 2019,
            'mileage_km' => 0,
            'price_rub' => 0,
            'color' => '',
            'city' => '',
            'hero' => null,
            'segment' => 'mass',
            'seller' => null,
        ]);
    }

    public function test_events_crud_for_owned_car(): void
    {
        $d = $this->detailing();
        $car = $this->carForDetailing($d->id);
        Sanctum::actingAs($d);

        $this->getJson("/api/cars/{$car->id}/events")->assertOk()->assertJsonCount(0);

        $store = $this->postJson("/api/cars/{$car->id}/events", [
            'title' => 'Мойка',
            'type' => 'visit',
            'mileageKm' => 12000,
            'services' => ['wash'],
        ]);
        $store->assertOk();
        $store->assertJsonPath('title', 'Мойка');
        $store->assertJsonPath('mileageKm', 12000);
        $eventId = $store->json('id');

        $this->getJson("/api/cars/{$car->id}/events")
            ->assertOk()
            ->assertJsonCount(1);

        $this->deleteJson("/api/events/{$eventId}")
            ->assertOk()
            ->assertJsonPath('ok', true);

        $this->assertDatabaseMissing('car_events', ['id' => $eventId]);
    }

    public function test_events_for_foreign_car_return_404(): void
    {
        $owner = $this->detailing();
        $car = $this->carForDetailing($owner->id);
        Sanctum::actingAs($this->detailing());

        $this->getJson("/api/cars/{$car->id}/events")->assertNotFound();
        $this->postJson("/api/cars/{$car->id}/events", ['title' => 'x'])->assertNotFound();
    }
}
