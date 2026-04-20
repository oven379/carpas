<?php

namespace Tests\Feature;

use App\Models\Car;
use App\Models\Detailing;
use App\Models\Owner;
use Illuminate\Support\Facades\Hash;

class PublicDetailingShowcaseTest extends FeatureTestCase
{
    public function test_partner_detailing_showcase_ok_without_token(): void
    {
        $d = $this->detailing(['name' => 'Партнёр', 'is_personal' => false]);

        $this->getJson('/api/public/detailings/'.$d->id)
            ->assertOk()
            ->assertJsonPath('detailing.id', (string) $d->id)
            ->assertJsonPath('carsCount', 0);
    }

    public function test_partner_detailing_showcase_ok_by_public_slug(): void
    {
        $d = $this->detailing(['name' => 'Студия Глянец', 'is_personal' => false]);
        $slug = trim((string) $d->fresh()->public_slug);
        $this->assertNotSame('', $slug);

        $this->getJson('/api/public/detailings/'.$slug)
            ->assertOk()
            ->assertJsonPath('detailing.id', (string) $d->id)
            ->assertJsonPath('detailing.publicSlug', $slug);
    }

    public function test_personal_detailing_showcase_404_without_token(): void
    {
        $owner = Owner::query()->create([
            'email' => 'pds-'.uniqid('', true).'@example.test',
            'password' => Hash::make('secret'),
            'name' => 'Владелец',
            'phone' => '+79990000010',
            'garage_slug' => 'pds-slug-'.uniqid(),
        ]);
        $personal = Detailing::query()->create([
            'name' => 'Мой гараж',
            'email' => 'pds-'.uniqid('', true).'@garage.internal',
            'password' => Hash::make('secret'),
            'is_personal' => true,
            'owner_id' => $owner->id,
            'profile_completed' => true,
        ]);

        $this->getJson('/api/public/detailings/'.$personal->id)
            ->assertNotFound();
    }

    public function test_personal_detailing_showcase_ok_for_owner_bearer(): void
    {
        $owner = Owner::query()->create([
            'email' => 'pds2-'.uniqid('', true).'@example.test',
            'password' => Hash::make('secret'),
            'name' => 'Владелец',
            'phone' => '+79990000011',
            'garage_slug' => 'pds2-slug-'.uniqid(),
        ]);
        $personal = Detailing::query()->create([
            'name' => 'Мой гараж',
            'email' => 'pds2-'.uniqid('', true).'@garage.internal',
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
        $token = $owner->createToken('t')->plainTextToken;

        $this->getJson('/api/public/detailings/'.$personal->id, [
            'Authorization' => 'Bearer '.$token,
        ])
            ->assertOk()
            ->assertJsonPath('detailing.id', (string) $personal->id)
            ->assertJsonPath('carsCount', 1);
    }

    public function test_personal_detailing_showcase_404_for_other_owner_bearer(): void
    {
        $ownerA = Owner::query()->create([
            'email' => 'pds3a-'.uniqid('', true).'@example.test',
            'password' => Hash::make('secret'),
            'name' => 'A',
            'phone' => '+79990000012',
            'garage_slug' => 'pds3a-'.uniqid(),
        ]);
        $ownerB = Owner::query()->create([
            'email' => 'pds3b-'.uniqid('', true).'@example.test',
            'password' => Hash::make('secret'),
            'name' => 'B',
            'phone' => '+79990000013',
            'garage_slug' => 'pds3b-'.uniqid(),
        ]);
        $personal = Detailing::query()->create([
            'name' => 'Гараж A',
            'email' => 'pds3-'.uniqid('', true).'@garage.internal',
            'password' => Hash::make('secret'),
            'is_personal' => true,
            'owner_id' => $ownerA->id,
            'profile_completed' => true,
        ]);
        $tokenB = $ownerB->createToken('t')->plainTextToken;

        $this->getJson('/api/public/detailings/'.$personal->id, [
            'Authorization' => 'Bearer '.$tokenB,
        ])
            ->assertNotFound();
    }
}
