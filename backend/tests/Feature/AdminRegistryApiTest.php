<?php

namespace Tests\Feature;

use App\Models\Car;
use App\Models\Owner;
use Illuminate\Support\Facades\Config;

class AdminRegistryApiTest extends FeatureTestCase
{
    public function test_registry_requires_bearer(): void
    {
        $this->getJson('/api/admin/support/registry/owners')->assertStatus(401);
        $this->getJson('/api/admin/support/registry/cars')->assertStatus(401);
        $this->getJson('/api/admin/support/registry/owners/1')->assertStatus(401);
        $this->getJson('/api/admin/support/registry/cars/1')->assertStatus(401);
    }

    public function test_owners_list_and_owner_detail(): void
    {
        Config::set('support.admin_bearer_token', 'test-admin-bearer');

        $o = Owner::query()->create([
            'email' => 'owner-'.uniqid('', true).'@example.test',
            'password' => bcrypt('x'),
            'name' => 'Иван',
        ]);

        $r = $this->getJson('/api/admin/support/registry/owners', [
            'Authorization' => 'Bearer test-admin-bearer',
        ]);
        $r->assertOk();
        $r->assertJsonFragment(['id' => (string) $o->id, 'email' => $o->email]);

        $d = $this->detailing();
        Car::query()->create([
            'detailing_id' => $d->id,
            'owner_id' => $o->id,
            'vin' => '1HGBH41JXMN109186',
            'plate' => 'А111АА',
            'plate_region' => '77',
            'make' => 'Test',
            'model' => 'Car',
        ]);

        $r2 = $this->getJson('/api/admin/support/registry/owners/'.$o->id, [
            'Authorization' => 'Bearer test-admin-bearer',
        ]);
        $r2->assertOk();
        $r2->assertJsonPath('owner.email', $o->email);
        $r2->assertJsonPath('stats.carsTotal', 1);
    }

    public function test_cars_list_and_car_detail(): void
    {
        Config::set('support.admin_bearer_token', 'test-admin-bearer');

        $d = $this->detailing();
        $o = Owner::query()->create([
            'email' => 'o2-'.uniqid('', true).'@example.test',
            'password' => bcrypt('x'),
        ]);
        $car = Car::query()->create([
            'detailing_id' => $d->id,
            'owner_id' => $o->id,
            'vin' => 'WVWZZZ1JZ3W386752',
            'plate' => 'В222ВВ',
            'plate_region' => '99',
            'make' => 'VW',
            'model' => 'Golf',
        ]);

        $list = $this->getJson('/api/admin/support/registry/cars', [
            'Authorization' => 'Bearer test-admin-bearer',
        ]);
        $list->assertOk();
        $list->assertJsonFragment(['id' => (string) $car->id]);

        $show = $this->getJson('/api/admin/support/registry/cars/'.$car->id, [
            'Authorization' => 'Bearer test-admin-bearer',
        ]);
        $show->assertOk();
        $show->assertJsonPath('car.vin', 'WVWZZZ1JZ3W386752');
    }

    public function test_partner_summary(): void
    {
        Config::set('support.admin_bearer_token', 'test-admin-bearer');
        $d = $this->detailing(['name' => 'Студия Тест']);

        $r = $this->getJson('/api/admin/support/partners/'.$d->id.'/summary', [
            'Authorization' => 'Bearer test-admin-bearer',
        ]);
        $r->assertOk();
        $r->assertJsonPath('profile.name', 'Студия Тест');
        $r->assertJsonPath('isPendingVerification', false);
        $r->assertJsonStructure(['stats' => ['carsTotal', 'carEventsTotal', 'claimsPending', 'claimsTotal', 'supportTicketsTotal']]);
    }
}
