<?php

namespace Tests\Feature;

use App\Models\Car;
use App\Models\Owner;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;

class CarSearchDuplicateTest extends FeatureTestCase
{
    public function test_duplicate_search_finds_personal_garage_by_phone_only(): void
    {
        $owner = Owner::query()->create([
            'email' => 'phone-search-owner@example.test',
            'password' => Hash::make('secret'),
            'name' => 'Пётр',
            'phone' => '+79161234567',
        ]);

        $partner = $this->detailing();

        Car::query()->create([
            'detailing_id' => null,
            'owner_id' => $owner->id,
            'vin' => 'WPH1234567890ABCD',
            'plate' => '',
            'plate_region' => '',
            'make' => 'VW',
            'model' => 'Golf',
            'year' => 2021,
            'mileage_km' => 10000,
            'price_rub' => 0,
            'color' => 'серый',
            'city' => 'Казань',
            'hero' => null,
            'segment' => 'mass',
            'seller' => null,
            'client_phone' => '',
            'owner_phone' => '',
        ]);

        Sanctum::actingAs($partner);

        $res = $this->getJson('/api/cars/search-duplicate?clientPhone='.urlencode('9161234567'));
        $res->assertOk();
        $res->assertJsonCount(1);
        $res->assertJsonPath('0.make', 'VW');
        $res->assertJsonPath('0.vinHitFromOwnerGarage', true);
    }

    public function test_duplicate_search_phone_only_requires_ten_digits(): void
    {
        $partner = $this->detailing();
        Sanctum::actingAs($partner);

        $this->getJson('/api/cars/search-duplicate?clientPhone='.urlencode('12345'))
            ->assertOk()
            ->assertJsonCount(0);
    }

    public function test_duplicate_search_finds_by_plate_in_personal_garage(): void
    {
        $owner = Owner::query()->create([
            'email' => 'plate-search-owner@example.test',
            'password' => Hash::make('secret'),
            'name' => 'Иван',
            'phone' => '',
        ]);

        $partner = $this->detailing();
        Sanctum::actingAs($partner);

        Car::query()->create([
            'detailing_id' => null,
            'owner_id' => $owner->id,
            'vin' => 'XW8ZZZ1JZ12345678',
            'plate' => 'a777aa',
            'plate_region' => '77',
            'make' => 'Skoda',
            'model' => 'Octavia',
            'year' => 2020,
            'mileage_km' => 5000,
            'price_rub' => 0,
            'color' => 'белый',
            'city' => 'Москва',
            'hero' => null,
            'segment' => 'mass',
            'seller' => null,
            'client_phone' => '',
            'owner_phone' => '',
        ]);

        $res = $this->getJson('/api/cars/search-duplicate?plate='.urlencode('A777AA').'&plateRegion=77');
        $res->assertOk();
        $res->assertJsonCount(1);
        $res->assertJsonPath('0.make', 'Skoda');
        $res->assertJsonPath('0.vinHitFromOwnerGarage', true);
    }
}
