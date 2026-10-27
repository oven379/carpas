<?php

namespace Tests\Feature;

use App\Models\Car;
use App\Models\CarShare;
use App\Models\Owner;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;

/**
 * Персональные данные не должны утекать через публичные и межаккаунтные ответы API.
 * Регрессии этих тестов — утечка контактов владельцев и клиентов.
 */
class PublicDataExposureTest extends FeatureTestCase
{
    private const PII = [
        'owner-secret@example.test',
        '+7 999 111 22 33',
        '+79991112233',
        'client-secret@example.test',
        '+79994445566',
        'Секретный Клиент',
    ];

    private function ownerWithCar(string $vin = '5HGBH41JXMN109186'): array
    {
        $owner = Owner::query()->create([
            'email' => 'owner-secret@example.test',
            'password' => Hash::make('secret'),
            'name' => 'Секретный Владелец',
            'phone' => '+7 999 111 22 33',
        ]);
        $car = Car::query()->create([
            'detailing_id' => null,
            'owner_id' => $owner->id,
            'vin' => $vin,
            'plate' => 'A123BC',
            'plate_region' => '77',
            'make' => 'Skoda',
            'model' => 'Octavia',
            'year' => 2019,
            'mileage_km' => 50000,
            'price_rub' => 0,
            'color' => 'Серый',
            'city' => 'Москва',
            'hero' => null,
            'segment' => 'mass',
            'seller' => ['name' => 'Владелец', 'type' => 'owner'],
            'client_name' => 'Секретный Клиент',
            'client_phone' => '+79994445566',
            'client_email' => 'client-secret@example.test',
        ]);

        return [$owner, $car];
    }

    private function assertNoPii(string $body): void
    {
        foreach (self::PII as $secret) {
            $this->assertStringNotContainsString($secret, $body, "в ответе утекли персональные данные: {$secret}");
        }
    }

    public function test_recent_cars_endpoint_is_gone(): void
    {
        $this->getJson('/api/public/cars/recent')->assertStatus(404);
    }

    public function test_public_share_link_hides_contacts_and_vin(): void
    {
        [, $car] = $this->ownerWithCar();
        $share = CarShare::query()->create(['car_id' => $car->id, 'token' => 'tok-'.uniqid('', true), 'created_at' => now()]);

        $res = $this->getJson('/api/share/'.$share->token)->assertOk();

        $res->assertJsonPath('car.make', 'Skoda');
        $res->assertJsonPath('car.vin', '');
        $this->assertNoPii($res->getContent());
        foreach (['ownerEmail', 'ownerName', 'ownerAccountPhone', 'ownerPhone', 'clientName', 'clientPhone', 'clientEmail'] as $key) {
            $this->assertArrayNotHasKey($key, $res->json('car'), "в публичной карточке есть поле {$key}");
        }
    }

    public function test_public_partner_page_hides_login_email_and_legal_data(): void
    {
        $d = $this->detailing([
            'name' => 'Публичный Партнёр',
            'email' => 'partner-login-secret@example.test',
            'inn' => '7700000000',
            'legal_name' => 'ООО Секрет',
            'master_name' => 'Секретный Мастер',
            'contact_name' => 'Секретный Контакт',
            'warranty_text' => 'гарантия',
        ]);

        $res = $this->getJson('/api/public/detailings/'.$d->public_slug)->assertOk();

        $res->assertJsonPath('detailing.name', 'Публичный Партнёр');
        foreach (['partner-login-secret@example.test', '7700000000', 'ООО Секрет', 'Секретный Мастер', 'Секретный Контакт'] as $secret) {
            $this->assertStringNotContainsString($secret, $res->getContent(), "на публичной странице партнёра утекло: {$secret}");
        }
        foreach (['email', 'inn', 'legalName', 'masterName', 'contactName', 'warrantyText', 'yandexLinked'] as $key) {
            $this->assertArrayNotHasKey($key, $res->json('detailing'));
        }
    }

    public function test_partner_duplicate_search_does_not_expose_other_clients_contacts(): void
    {
        [, $car] = $this->ownerWithCar();
        $searcher = $this->detailing();
        Sanctum::actingAs($searcher);

        $res = $this->getJson('/api/cars/search-duplicate?vin='.$car->vin)->assertOk();

        $this->assertNoPii($res->getContent());
    }

    public function test_owner_vin_lookup_for_orphan_car_hides_studio_client_contacts(): void
    {
        $studio = $this->detailing();
        $orphan = Car::query()->create([
            'detailing_id' => $studio->id,
            'owner_id' => null,
            'vin' => '1M8GDM9AXKP042788',
            'plate' => 'B222BB',
            'plate_region' => '99',
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
            'client_name' => 'Секретный Клиент',
            'client_phone' => '+79994445566',
            'client_email' => 'client-secret@example.test',
        ]);
        Sanctum::actingAs(Owner::query()->create([
            'email' => 'finder-'.uniqid('', true).'@example.test',
            'password' => Hash::make('secret'),
        ]));

        $res = $this->getJson('/api/owners/cars/lookup-for-add?vin='.$orphan->vin)->assertOk();

        $res->assertJsonPath('status', 'orphan');
        $res->assertJsonPath('car.vin', '1M8GDM9AXKP042788'); // владелец сам ввёл этот VIN
        $res->assertJsonPath('car.make', 'Audi');
        $this->assertNoPii($res->getContent());
    }
}
