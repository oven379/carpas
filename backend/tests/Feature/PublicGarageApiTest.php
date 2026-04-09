<?php

namespace Tests\Feature;

use App\Models\Car;
use App\Models\Detailing;
use App\Models\Owner;
use Illuminate\Support\Facades\Hash;

class PublicGarageApiTest extends FeatureTestCase
{
    public function test_private_garage_hides_cars_for_guest(): void
    {
        $partner = $this->detailing();
        $owner = Owner::query()->create([
            'email' => 'pg-'.uniqid('', true).'@example.test',
            'password' => Hash::make('secret'),
            'name' => 'Владелец',
            'phone' => '+79990000000',
            'garage_slug' => 'test-slug-'.uniqid(),
            'garage_private' => true,
        ]);
        Car::query()->create([
            'detailing_id' => $partner->id,
            'owner_id' => $owner->id,
            'vin' => '',
            'plate' => '',
            'make' => 'A',
            'model' => 'B',
            'year' => 2020,
            'mileage_km' => 0,
            'price_rub' => 0,
            'color' => '',
            'city' => '',
            'hero' => null,
            'segment' => 'mass',
            'seller' => null,
        ]);

        $slug = mb_strtolower(trim((string) $owner->garage_slug));

        $this->getJson('/api/public/garages/'.$slug)
            ->assertOk()
            ->assertJsonPath('garagePrivate', true)
            ->assertJsonPath('cars', []);
    }

    public function test_open_garage_shows_cars_for_guest(): void
    {
        $partner = $this->detailing();
        $owner = Owner::query()->create([
            'email' => 'pg3-'.uniqid('', true).'@example.test',
            'password' => Hash::make('secret'),
            'name' => 'Владелец',
            'phone' => '+79990000002',
            'garage_slug' => 'test-slug-c-'.uniqid(),
            'garage_private' => false,
        ]);
        Car::query()->create([
            'detailing_id' => $partner->id,
            'owner_id' => $owner->id,
            'vin' => '',
            'plate' => '',
            'make' => 'M',
            'model' => 'N',
            'year' => 2022,
            'mileage_km' => 0,
            'price_rub' => 0,
            'color' => '',
            'city' => '',
            'hero' => null,
            'segment' => 'mass',
            'seller' => null,
        ]);
        $slug = mb_strtolower(trim((string) $owner->garage_slug));

        $this->getJson('/api/public/garages/'.$slug)
            ->assertOk()
            ->assertJsonPath('garagePrivate', false)
            ->assertJsonCount(1, 'cars');
    }

    public function test_private_garage_not_bypassed_by_personal_detailing_token(): void
    {
        $owner = Owner::query()->create([
            'email' => 'pg4-'.uniqid('', true).'@example.test',
            'password' => Hash::make('secret'),
            'name' => 'Владелец',
            'phone' => '+79990000003',
            'garage_slug' => 'test-slug-d-'.uniqid(),
            'garage_private' => true,
        ]);
        $personal = Detailing::query()->create([
            'name' => 'Мой гараж',
            'email' => 'pg4-'.uniqid('', true).'@garage.internal',
            'password' => Hash::make('secret'),
            'is_personal' => true,
            'owner_id' => $owner->id,
            'profile_completed' => true,
        ]);
        Car::query()->create([
            'detailing_id' => $personal->id,
            'owner_id' => $owner->id,
            'vin' => '',
            'plate' => '',
            'make' => 'P',
            'model' => 'Q',
            'year' => 2023,
            'mileage_km' => 0,
            'price_rub' => 0,
            'color' => '',
            'city' => '',
            'hero' => null,
            'segment' => 'mass',
            'seller' => null,
        ]);
        $token = $personal->createToken('t')->plainTextToken;
        $slug = mb_strtolower(trim((string) $owner->garage_slug));

        $this->getJson('/api/public/garages/'.$slug, [
            'Authorization' => 'Bearer '.$token,
        ])
            ->assertOk()
            ->assertJsonPath('garagePrivate', true)
            ->assertJsonPath('cars', []);
    }

    public function test_private_garage_shows_cars_for_linked_partner_detailing_token(): void
    {
        $d = $this->detailing();
        $owner = Owner::query()->create([
            'email' => 'pg2-'.uniqid('', true).'@example.test',
            'password' => Hash::make('secret'),
            'name' => 'Владелец',
            'phone' => '+79990000001',
            'garage_slug' => 'test-slug-b-'.uniqid(),
            'garage_private' => true,
        ]);
        Car::query()->create([
            'detailing_id' => $d->id,
            'owner_id' => $owner->id,
            'vin' => '',
            'plate' => '',
            'make' => 'X',
            'model' => 'Y',
            'year' => 2021,
            'mileage_km' => 0,
            'price_rub' => 0,
            'color' => '',
            'city' => '',
            'hero' => null,
            'segment' => 'mass',
            'seller' => null,
        ]);
        $token = $d->createToken('t')->plainTextToken;
        $slug = mb_strtolower(trim((string) $owner->garage_slug));

        $this->getJson('/api/public/garages/'.$slug, [
            'Authorization' => 'Bearer '.$token,
        ])
            ->assertOk()
            ->assertJsonPath('garagePrivate', false)
            ->assertJsonCount(1, 'cars');
    }
}
