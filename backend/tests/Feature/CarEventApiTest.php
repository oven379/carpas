<?php

namespace Tests\Feature;

use App\Models\Car;
use App\Models\CarEvent;
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

    public function test_service_event_saves_and_returns_care_tips(): void
    {
        $d = $this->detailing();
        $car = $this->carForDetailing($d->id);
        Sanctum::actingAs($d);

        $store = $this->postJson("/api/cars/{$car->id}/events", [
            'title' => 'Уход',
            'type' => 'visit',
            'mileageKm' => 5000,
            'services' => ['wash'],
            'careTips' => [
                'important' => 'Первые сутки не мойте под давлением',
                'tips' => ['Совет один', 'Совет два'],
            ],
        ]);
        $store->assertOk();
        $store->assertJsonPath('careTips.important', 'Первые сутки не мойте под давлением');
        $store->assertJsonPath('careTips.tips.0', 'Совет один');
        $store->assertJsonPath('careTips.tips.1', 'Совет два');
        $eventId = $store->json('id');

        $this->getJson("/api/cars/{$car->id}/events")
            ->assertOk()
            ->assertJsonPath('0.careTips.important', 'Первые сутки не мойте под давлением');
    }

    public function test_cannot_update_or_delete_service_visit_after_visit_calendar_day(): void
    {
        $d = $this->detailing();
        $car = $this->carForDetailing($d->id);
        Sanctum::actingAs($d);

        $evt = CarEvent::query()->create([
            'detailing_id' => $d->id,
            'car_id' => $car->id,
            'owner_id' => null,
            'source' => 'service',
            'is_draft' => false,
            'at' => now()->subDays(3),
            'type' => 'visit',
            'title' => 'Старый визит',
            'mileage_km' => 5000,
            'services' => [],
            'maintenance_services' => [],
            'note' => null,
        ]);

        $this->patchJson("/api/events/{$evt->id}", ['title' => 'Правка'])
            ->assertForbidden();
        $this->deleteJson("/api/events/{$evt->id}")
            ->assertForbidden();
        $this->assertDatabaseHas('car_events', ['id' => $evt->id]);
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
