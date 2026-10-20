<?php

namespace Tests\Feature;

use App\Models\Car;
use App\Models\Owner;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;

/** Лимит автомобилей в гараже: бесплатно 1, поднимает админ (максимум 3), Premium — без ограничений. */
class GarageCarLimitApiTest extends FeatureTestCase
{
    private function owner(array $overrides = []): Owner
    {
        return Owner::query()->create(array_merge([
            'email' => 'limit-owner-'.uniqid('', true).'@example.test',
            'password' => Hash::make('secret'),
        ], $overrides));
    }

    private function ownCar(Owner $owner, string $vin): Car
    {
        return Car::query()->create([
            'detailing_id' => null,
            'owner_id' => $owner->id,
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
    }

    private function newCarPayload(string $vin): array
    {
        return ['vin' => $vin, 'make' => 'Kia', 'model' => 'Rio', 'legalConsentAccepted' => true];
    }

    public function test_owner_without_cars_can_add_first_car(): void
    {
        Sanctum::actingAs($this->owner());

        $this->postJson('/api/owners/cars', $this->newCarPayload('5HGBH41JXMN109186'))->assertSuccessful();
    }

    public function test_free_owner_is_blocked_by_the_server_at_the_limit(): void
    {
        $owner = $this->owner();
        $this->ownCar($owner, '5HGBH41JXMN109186');
        Sanctum::actingAs($owner);

        $this->postJson('/api/owners/cars', $this->newCarPayload('1M8GDM9AXKP042788'))
            ->assertStatus(422)
            ->assertJsonValidationErrors('garage');

        $this->assertSame(1, Car::query()->where('owner_id', $owner->id)->count());
    }

    public function test_raised_limit_allows_second_car_but_not_third(): void
    {
        $owner = $this->owner(['garage_car_limit' => 2]);
        $this->ownCar($owner, '5HGBH41JXMN109186');
        Sanctum::actingAs($owner);

        $this->postJson('/api/owners/cars', $this->newCarPayload('1M8GDM9AXKP042788'))->assertSuccessful();
        $this->postJson('/api/owners/cars', $this->newCarPayload('WBA5A31050G123456'))
            ->assertStatus(422)
            ->assertJsonValidationErrors('garage');
    }

    public function test_premium_owner_has_no_limit(): void
    {
        $owner = $this->owner(['is_premium' => true]);
        $this->ownCar($owner, '5HGBH41JXMN109186');
        Sanctum::actingAs($owner);

        $this->postJson('/api/owners/cars', $this->newCarPayload('1M8GDM9AXKP042788'))->assertSuccessful();
    }

    public function test_attach_existing_is_blocked_at_the_limit(): void
    {
        $owner = $this->owner();
        $this->ownCar($owner, '5HGBH41JXMN109186');
        $orphan = Car::query()->create([
            'detailing_id' => $this->detailing()->id,
            'owner_id' => null,
            'vin' => '1M8GDM9AXKP042788',
            'plate' => '',
            'plate_region' => '',
            'make' => 'Audi',
            'model' => 'A4',
            'year' => 2020,
            'mileage_km' => 0,
            'price_rub' => 0,
            'color' => '',
            'city' => 'Москва',
            'hero' => null,
            'segment' => 'mass',
            'seller' => null,
        ]);
        Sanctum::actingAs($owner);

        $this->postJson('/api/owners/cars/attach-existing', ['carId' => $orphan->id])
            ->assertStatus(422)
            ->assertJsonValidationErrors('garage');

        $this->assertNull($orphan->fresh()->owner_id);
    }

    public function test_admin_can_raise_limit_step_by_step_up_to_three(): void
    {
        Config::set('support.admin_bearer_token', 'test-admin-bearer');
        $owner = $this->owner();
        $headers = ['Authorization' => 'Bearer test-admin-bearer'];
        $url = '/api/admin/support/registry/owners/'.$owner->id.'/car-limit';

        $this->postJson($url, [], $headers)->assertOk()->assertJsonPath('garageCarLimit', 2);
        $this->postJson($url, [], $headers)->assertOk()->assertJsonPath('garageCarLimit', 3);
        // Строго не больше 3.
        $this->postJson($url, [], $headers)->assertOk()->assertJsonPath('garageCarLimit', 3);

        $this->assertSame(3, $owner->fresh()->garage_car_limit);
    }

    public function test_admin_limit_endpoint_requires_the_admin_token_and_known_owner(): void
    {
        Config::set('support.admin_bearer_token', 'test-admin-bearer');
        $owner = $this->owner();

        $this->postJson('/api/admin/support/registry/owners/'.$owner->id.'/car-limit')->assertStatus(401);
        $this->postJson('/api/admin/support/registry/owners/999999/car-limit', [], ['Authorization' => 'Bearer test-admin-bearer'])
            ->assertStatus(404);
    }
}
