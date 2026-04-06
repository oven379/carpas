<?php

namespace Database\Seeders;

use App\Models\Car;
use App\Models\CarClaim;
use App\Models\CarDoc;
use App\Models\CarEvent;
use App\Models\CarShare;
use App\Models\Detailing;
use App\Models\Owner;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Демо-данные для полного прогона MVP (партнёр, владелец, маркет, заявки, публичная ссылка).
 *
 * Учётки (пароль везде 1111):
 * - Партнёр (основной): studio@demo.car
 * - Партнёр (legacy из доков): test@test
 * - Владелец: owner@demo.car — публичная витрина гаража: /g/demo-garage
 * - Публичная карта по ссылке: /share/cpdemosharepubliclinktoken32char
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $tz = 'Europe/Moscow';
        $visitToday = Carbon::now($tz)->setTime(15, 30, 0);
        $visitOld = Carbon::now($tz)->subDays(6)->setTime(11, 0, 0);

        $studio = Detailing::query()->updateOrCreate(
            ['email' => 'studio@demo.car'],
            [
                'name' => 'Демо Студия Детейлинга',
                'password' => Hash::make('1111'),
                'phone' => '+79991234567',
                'contact_name' => 'Алексей',
                'city' => 'Москва',
                'address' => 'ул. Примерная, д. 1',
                'description' => 'Демо-аккаунт партнёра: авто, визиты, заявки на привязку, витрина для маркета.',
                'website' => 'https://example.com',
                'telegram' => '@demo_detailing',
                'instagram' => '@demo_detailing',
                'logo' => null,
                'cover' => null,
                'services_offered' => ['Керамика', 'Мойка', 'Полировка', 'Химчистка', 'PPF'],
                'profile_completed' => true,
                'is_personal' => false,
                'owner_id' => null,
            ],
        );

        Detailing::query()->updateOrCreate(
            ['email' => 'test@test'],
            [
                'name' => 'Тест-детейлинг',
                'password' => Hash::make('1111'),
                'phone' => '',
                'contact_name' => '',
                'city' => 'Санкт-Петербург',
                'address' => '',
                'description' => 'Минимальный демо-аккаунт (как в старых инструкциях).',
                'profile_completed' => true,
                'is_personal' => false,
                'owner_id' => null,
            ],
        );

        $legacyDetailing = Detailing::query()->where('email', 'test@test')->firstOrFail();

        $owner = Owner::query()->updateOrCreate(
            ['email' => 'owner@demo.car'],
            [
                'password' => Hash::make('1111'),
                'name' => 'Демо Владелец',
                'phone' => '+79997654321',
                'garage_slug' => 'demo-garage',
                'garage_city' => 'Москва',
                'show_city_public' => true,
                'garage_website' => 'https://example.org',
                'show_website_public' => true,
                'garage_social' => '@demo_owner',
                'show_social_public' => true,
                'show_phone_public' => false,
                'is_premium' => false,
            ],
        );

        Detailing::query()->updateOrCreate(
            ['owner_id' => $owner->id],
            [
                'name' => trim((string) $owner->name) ?: 'Мой гараж',
                'email' => 'owner-'.$owner->id.'@garage.internal',
                'password' => Hash::make(bin2hex(random_bytes(12))),
                'is_personal' => true,
                'profile_completed' => true,
            ],
        );

        $car1 = Car::query()->updateOrCreate(
            ['detailing_id' => $studio->id, 'vin' => 'XTA210900R1234567'],
            [
                'owner_id' => $owner->id,
                'plate' => 'A001AA',
                'plate_region' => '77',
                'make' => 'Toyota',
                'model' => 'Camry',
                'year' => 2021,
                'mileage_km' => 45200,
                'price_rub' => 0,
                'color' => 'Белый',
                'city' => 'Москва',
                'segment' => 'mass',
                'client_name' => 'Демо Владелец',
                'client_phone' => '+79997654321',
                'client_email' => 'owner@demo.car',
            ],
        );

        $car2 = Car::query()->updateOrCreate(
            ['detailing_id' => $studio->id, 'vin' => 'WBA5A31050G123456'],
            [
                'owner_id' => $owner->id,
                'plate' => 'B777BB',
                'plate_region' => '199',
                'make' => 'BMW',
                'model' => '320i',
                'year' => 2019,
                'mileage_km' => 78000,
                'price_rub' => 0,
                'color' => 'Синий',
                'city' => 'Москва',
                'segment' => 'mass',
            ],
        );

        $carUnclaimed = Car::query()->updateOrCreate(
            ['detailing_id' => $studio->id, 'vin' => 'XW8ZZZ61ZJG123456'],
            [
                'owner_id' => null,
                'plate' => 'C999CC',
                'plate_region' => '78',
                'make' => 'Volkswagen',
                'model' => 'Polo',
                'year' => 2018,
                'mileage_km' => 92000,
                'price_rub' => 0,
                'color' => 'Серый',
                'city' => 'Санкт-Петербург',
                'segment' => 'mass',
            ],
        );

        Car::query()->updateOrCreate(
            ['detailing_id' => $legacyDetailing->id, 'vin' => 'LEGACYSEEDVIN00001'],
            [
                'owner_id' => null,
                'plate' => 'T001TT',
                'plate_region' => '99',
                'make' => 'Lada',
                'model' => 'Vesta',
                'year' => 2020,
                'mileage_km' => 34000,
                'price_rub' => 0,
                'color' => 'Красный',
                'city' => 'Казань',
                'segment' => 'mass',
            ],
        );

        $evtToday = CarEvent::query()->firstOrCreate(
            [
                'car_id' => $car1->id,
                'title' => 'Демо: керамика и мойка (сегодня)',
            ],
            [
                'detailing_id' => $studio->id,
                'owner_id' => null,
                'source' => 'service',
                'is_draft' => false,
                'at' => $visitToday,
                'type' => 'visit',
                'mileage_km' => 45100,
                'services' => ['ceramic', 'wash'],
                'maintenance_services' => [],
                'note' => 'Демо-визит: можно править в календарный день визита (МСК).',
            ],
        );

        CarEvent::query()->firstOrCreate(
            [
                'car_id' => $car1->id,
                'title' => 'Демо: полировка (архив)',
            ],
            [
                'detailing_id' => $studio->id,
                'owner_id' => null,
                'source' => 'service',
                'is_draft' => false,
                'at' => $visitOld,
                'type' => 'visit',
                'mileage_km' => 44800,
                'services' => ['polish'],
                'maintenance_services' => [],
                'note' => 'Прошлый визит зафиксирован в кабинете сервиса; правки вносит партнёр.',
            ],
        );

        CarEvent::query()->firstOrCreate(
            [
                'car_id' => $car1->id,
                'title' => 'Демо: черновик визита',
            ],
            [
                'detailing_id' => $studio->id,
                'owner_id' => null,
                'source' => 'service',
                'is_draft' => true,
                'at' => null,
                'type' => 'visit',
                'mileage_km' => 0,
                'services' => [],
                'maintenance_services' => [],
                'note' => null,
            ],
        );

        CarEvent::query()->firstOrCreate(
            [
                'car_id' => $car1->id,
                'title' => 'Демо: запись от владельца',
            ],
            [
                'detailing_id' => $studio->id,
                'owner_id' => $owner->id,
                'source' => 'owner',
                'is_draft' => false,
                'at' => Carbon::now($tz)->subDays(2)->setTime(9, 0, 0),
                'type' => 'visit',
                'mileage_km' => 45050,
                'services' => ['self_note'],
                'maintenance_services' => [],
                'note' => 'Самостоятельная отметка в гараже (источник owner).',
            ],
        );

        CarEvent::query()->firstOrCreate(
            [
                'car_id' => $car2->id,
                'title' => 'Демо BMW: ТО и диагностика',
            ],
            [
                'detailing_id' => $studio->id,
                'owner_id' => null,
                'source' => 'service',
                'is_draft' => false,
                'at' => Carbon::now($tz)->subDays(14)->setTime(14, 0, 0),
                'type' => 'visit',
                'mileage_km' => 77500,
                'services' => [],
                'maintenance_services' => ['oil', 'filters'],
                'note' => 'Демо: только ТО в maintenance_services.',
            ],
        );

        CarDoc::query()->firstOrCreate(
            [
                'car_id' => $car1->id,
                'event_id' => $evtToday->id,
                'title' => 'Демо фото работ',
            ],
            [
                'detailing_id' => $studio->id,
                'owner_id' => null,
                'source' => 'service',
                'kind' => 'photo',
                'url' => 'https://picsum.photos/id/20/800/600',
                'created_at' => $visitToday,
                'updated_at' => $visitToday,
            ],
        );

        CarShare::query()->firstOrCreate(
            ['token' => 'cpdemosharepubliclinktoken32char'],
            [
                'car_id' => $car1->id,
                'created_at' => Carbon::now($tz),
                'revoked_at' => null,
            ],
        );

        CarClaim::query()->firstOrCreate(
            [
                'car_id' => $carUnclaimed->id,
                'owner_id' => $owner->id,
                'status' => 'pending',
            ],
            [
                'detailing_id' => $studio->id,
                'evidence' => ['comment' => 'Демо: заявка на привязку VW Polo к гаражу владельца.'],
            ],
        );

        if ($this->command) {
            $this->command->info('Демо-данные готовы.');
            $this->command->info('Партнёр: studio@demo.car или test@test — пароль 1111');
            $this->command->info('Владелец: owner@demo.car — пароль 1111, slug demo-garage');
            $this->command->info('Публичная карта: /share/cpdemosharepubliclinktoken32char');
        }
    }
}
