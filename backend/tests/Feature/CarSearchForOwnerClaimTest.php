<?php

namespace Tests\Feature;

use App\Models\Car;
use App\Models\Owner;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

class CarSearchForOwnerClaimTest extends FeatureTestCase
{
    private function actingOwner(): Owner
    {
        return Owner::query()->create([
            'email' => 'owner-claim-search-'.uniqid('', true).'@example.test',
            'password' => Hash::make('secret'),
            'name' => 'Иван',
            'phone' => '+79000000000',
        ]);
    }

    private function partnerCar(array $overrides = []): Car
    {
        $partner = $this->detailing();

        return Car::query()->create(array_merge([
            'detailing_id' => $partner->id,
            'owner_id' => null,
            'vin' => strtoupper(substr(str_replace('-', '', (string) Str::uuid()), 0, 17)),
            'plate' => '',
            'plate_region' => '',
            'make' => 'Toyota',
            'model' => 'Camry',
            'year' => 2020,
            'mileage_km' => 45000,
            'price_rub' => 0,
            'color' => 'белый',
            'city' => 'Москва',
            'hero' => null,
            'segment' => 'mass',
            'seller' => null,
            'client_phone' => '',
            'owner_phone' => '',
            'client_email' => '',
        ], $overrides));
    }

    public function test_finds_by_client_email_non_personal_only(): void
    {
        $this->partnerCar([
            'client_email' => 'client-match@example.test',
        ]);

        Sanctum::actingAs($this->actingOwner());

        $res = $this->getJson('/api/owners/cars/search-for-claim?q='.urlencode('client-match@example.test'));
        $res->assertOk();
        $res->assertJsonCount(1);
        $res->assertJsonPath('0.clientEmail', 'client-match@example.test');
        $res->assertJsonPath('0.vinHitFromOwnerGarage', false);
    }

    public function test_finds_by_vin(): void
    {
        $vin = strtoupper(substr(str_replace('-', '', (string) Str::uuid()), 0, 17));
        $this->partnerCar(['vin' => $vin]);

        Sanctum::actingAs($this->actingOwner());

        $res = $this->getJson('/api/owners/cars/search-for-claim?q='.urlencode($vin));
        $res->assertOk();
        $res->assertJsonCount(1);
        $res->assertJsonPath('0.vin', $vin);
    }

    public function test_phone_search_skips_owner_garage_without_studio(): void
    {
        $owner = $this->actingOwner();

        Car::query()->create([
            'detailing_id' => null,
            'owner_id' => $owner->id,
            'vin' => strtoupper(substr(str_replace('-', '', (string) Str::uuid()), 0, 17)),
            'plate' => '',
            'plate_region' => '',
            'make' => 'VW',
            'model' => 'Polo',
            'year' => 2019,
            'mileage_km' => 0,
            'price_rub' => 0,
            'color' => '',
            'city' => '',
            'hero' => null,
            'segment' => 'mass',
            'seller' => null,
            'client_phone' => '+79165550102',
            'owner_phone' => '',
            'client_email' => '',
        ]);

        $this->partnerCar([
            'client_phone' => '+79165550102',
        ]);

        Sanctum::actingAs($owner);

        $res = $this->getJson('/api/owners/cars/search-for-claim?q='.urlencode('9165550102'));
        $res->assertOk();
        $res->assertJsonCount(1);
        $res->assertJsonPath('0.clientPhone', '+79165550102');
    }

    public function test_empty_query_returns_empty_array(): void
    {
        Sanctum::actingAs($this->actingOwner());
        $this->getJson('/api/owners/cars/search-for-claim?q=')
            ->assertOk()
            ->assertJsonCount(0);
    }
}
