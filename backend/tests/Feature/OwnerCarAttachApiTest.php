<?php

namespace Tests\Feature;

use App\Models\Car;
use App\Models\Owner;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;

class OwnerCarAttachApiTest extends FeatureTestCase
{
    public function test_lookup_attach_unlink_flow(): void
    {
        $d = $this->detailing();
        $vin = '5HGBH41JXMN109186';
        $car = Car::query()->create([
            'detailing_id' => $d->id,
            'owner_id' => null,
            'vin' => $vin,
            'plate' => '',
            'plate_region' => '',
            'make' => 'Skoda',
            'model' => 'Octavia',
            'year' => 2019,
            'mileage_km' => 0,
            'price_rub' => 0,
            'color' => '',
            'city' => 'Москва',
            'hero' => null,
            'segment' => 'mass',
            'seller' => null,
        ]);

        $owner = Owner::query()->create([
            'email' => 'attach-owner-'.uniqid('', true).'@example.test',
            'password' => Hash::make('secret'),
        ]);
        Sanctum::actingAs($owner);

        $this->getJson('/api/owners/cars/lookup-for-add?vin='.$vin)
            ->assertOk()
            ->assertJsonPath('status', 'orphan')
            ->assertJsonPath('car.id', (string) $car->id);

        $this->postJson('/api/owners/cars/attach-existing', ['carId' => $car->id])
            ->assertOk()
            ->assertJsonPath('ownerEmail', $owner->email);

        $this->assertDatabaseHas('cars', [
            'id' => $car->id,
            'owner_id' => $owner->id,
            'detailing_id' => null,
        ]);

        $this->postJson('/api/owners/cars/'.$car->id.'/unlink')
            ->assertOk()
            ->assertJsonPath('ownerEmail', '');

        $this->assertDatabaseHas('cars', [
            'id' => $car->id,
            'owner_id' => null,
        ]);
    }

    public function test_lookup_claimed_when_owner_present(): void
    {
        $owner = Owner::query()->create([
            'email' => 'claimed-'.uniqid('', true).'@example.test',
            'password' => Hash::make('secret'),
        ]);
        $vin = '6HGBH41JXMN109186';
        Car::query()->create([
            'detailing_id' => null,
            'owner_id' => $owner->id,
            'vin' => $vin,
            'plate' => '',
            'plate_region' => '',
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

        $other = Owner::query()->create([
            'email' => 'other-'.uniqid('', true).'@example.test',
            'password' => Hash::make('secret'),
        ]);
        Sanctum::actingAs($other);

        $this->getJson('/api/owners/cars/lookup-for-add?vin='.$vin)
            ->assertOk()
            ->assertJsonPath('status', 'claimed');
    }
}
