<?php

namespace Tests\Feature;

use App\Models\Car;
use App\Models\CarDoc;
use App\Models\CarEvent;
use App\Models\Owner;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;

class CarUnilateralRemoveTest extends FeatureTestCase
{
    public function test_detailing_delete_keeps_car_for_owner_and_snapshots_partner_on_events(): void
    {
        $owner = Owner::query()->create([
            'email' => 'uni-owner-'.uniqid('', true).'@example.test',
            'password' => Hash::make('secret'),
        ]);
        $studio = $this->detailing(['name' => 'Студия Север', 'logo' => 'logos/studio.png']);

        $car = Car::query()->create([
            'detailing_id' => null,
            'owner_id' => $owner->id,
            'vin' => 'YW8ZZZ61ZJG000001',
            'plate' => '',
            'plate_region' => '',
            'make' => 'VW',
            'model' => 'Golf',
            'year' => 2017,
            'mileage_km' => 10000,
            'price_rub' => 0,
            'color' => '',
            'city' => 'Москва',
            'hero' => null,
            'segment' => 'mass',
            'seller' => null,
        ]);

        Sanctum::actingAs($studio);
        $this->postJson('/api/cars/link-from-personal-garage', [
            'carId' => (string) $car->id,
            'year' => '2017',
            'city' => 'Москва',
        ])->assertOk();

        $car->refresh();
        $this->assertSame((int) $studio->id, (int) $car->detailing_id);

        $evt = CarEvent::query()->create([
            'detailing_id' => $studio->id,
            'car_id' => $car->id,
            'owner_id' => $owner->id,
            'source' => 'service',
            'is_draft' => false,
            'at' => now(),
            'type' => 'visit',
            'title' => 'Мойка',
            'mileage_km' => 10000,
            'services' => [],
            'note' => '',
        ]);

        $this->deleteJson('/api/cars/'.$car->id)->assertOk()->assertJsonPath('ok', true);

        $this->assertDatabaseHas('cars', [
            'id' => $car->id,
            'owner_id' => $owner->id,
            'detailing_id' => null,
        ]);

        $this->assertDatabaseHas('car_events', [
            'id' => $evt->id,
            'car_id' => $car->id,
            'detailing_id' => null,
            'service_partner_name' => 'Студия Север',
            'service_partner_logo' => 'logos/studio.png',
        ]);

        Sanctum::actingAs($owner);
        $this->getJson('/api/owners/cars/'.$car->id)->assertOk();
        $this->getJson('/api/owners/cars/'.$car->id.'/events')
            ->assertOk()
            ->assertJsonFragment(['detailingName' => 'Студия Север']);

        Sanctum::actingAs($studio);
        $this->getJson('/api/cars/'.$car->id)->assertNotFound();
        $this->getJson('/api/cars')->assertOk()->assertJsonCount(0);
    }

    public function test_owner_delete_keeps_car_for_detailing(): void
    {
        $owner = Owner::query()->create([
            'email' => 'uni-owner2-'.uniqid('', true).'@example.test',
            'password' => Hash::make('secret'),
        ]);
        $studio = $this->detailing();

        $car = Car::query()->create([
            'detailing_id' => null,
            'owner_id' => $owner->id,
            'vin' => 'YW8ZZZ61ZJG000002',
            'plate' => '',
            'plate_region' => '',
            'make' => 'VW',
            'model' => 'Polo',
            'year' => 2016,
            'mileage_km' => 5000,
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
            'year' => '2016',
            'city' => 'Казань',
        ])->assertOk();

        $car->refresh();

        Sanctum::actingAs($owner);
        $this->deleteJson('/api/owners/cars/'.$car->id)->assertOk()->assertJsonPath('ok', true);

        $this->assertDatabaseHas('cars', [
            'id' => $car->id,
            'owner_id' => null,
            'detailing_id' => $studio->id,
        ]);

        Sanctum::actingAs($studio);
        $this->getJson('/api/cars/'.$car->id)->assertOk();
    }

    public function test_detailing_delete_clears_docs_detailing_link(): void
    {
        $owner = Owner::query()->create([
            'email' => 'uni-owner3-'.uniqid('', true).'@example.test',
            'password' => Hash::make('secret'),
        ]);
        $studio = $this->detailing();

        $car = Car::query()->create([
            'detailing_id' => null,
            'owner_id' => $owner->id,
            'vin' => 'YW8ZZZ61ZJG000003',
            'plate' => '',
            'plate_region' => '',
            'make' => 'Audi',
            'model' => 'A3',
            'year' => 2015,
            'mileage_km' => 0,
            'price_rub' => 0,
            'color' => '',
            'city' => 'СПб',
            'hero' => null,
            'segment' => 'mass',
            'seller' => null,
        ]);

        Sanctum::actingAs($studio);
        $this->postJson('/api/cars/link-from-personal-garage', [
            'carId' => (string) $car->id,
            'year' => '2015',
            'city' => 'СПб',
        ])->assertOk();
        $car->refresh();

        $doc = CarDoc::query()->create([
            'detailing_id' => $studio->id,
            'car_id' => $car->id,
            'owner_id' => $owner->id,
            'source' => 'service',
            'event_id' => null,
            'title' => 'Фото',
            'kind' => 'photo',
            'url' => 'docs/x.jpg',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->deleteJson('/api/cars/'.$car->id)->assertOk();

        $this->assertDatabaseHas('car_docs', [
            'id' => $doc->id,
            'detailing_id' => null,
        ]);
    }
}
