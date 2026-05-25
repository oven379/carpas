<?php

namespace Database\Seeders;

use App\Models\Car;
use App\Models\CarEvent;
use App\Models\Detailing;
use App\Models\Owner;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DemoCrmOwnersSeeder extends Seeder
{
    public function run(): void
    {
        $tz = 'Europe/Moscow';
        $studio = Detailing::query()->where('email', 'studio@demo.car')->firstOrFail();

        $demoOwners = [
            ['email' => 'owner1@demo.car', 'name' => 'Иван Смирнов', 'cars' => [['Audi', 'A4', 2020, 62400, 'A101AA', '77'], ['Mini', 'Cooper S', 2019, 48700, 'A102AA', '77']]],
            ['email' => 'owner2@demo.car', 'name' => 'Мария Кузнецова', 'cars' => [['Mercedes-Benz', 'C 200', 2021, 53800, 'B201BB', '99'], ['Kia', 'K5', 2022, 31600, 'B202BB', '99']]],
            ['email' => 'owner3@demo.car', 'name' => 'Александр Волков', 'cars' => [['Volkswagen', 'Passat', 2018, 116000, 'C301CC', '77'], ['Mazda', 'CX-5', 2020, 68200, 'C302CC', '197']]],
            ['email' => 'owner4@demo.car', 'name' => 'Екатерина Орлова', 'cars' => [['BMW', 'X3', 2021, 44900, 'D401DD', '77']]],
            ['email' => 'owner5@demo.car', 'name' => 'Дмитрий Соколов', 'cars' => [['Toyota', 'RAV4', 2020, 73400, 'E501EE', '50']]],
            ['email' => 'owner6@demo.car', 'name' => 'Анна Морозова', 'cars' => [['Lexus', 'RX 350', 2019, 80500, 'H601HH', '77']]],
            ['email' => 'owner7@demo.car', 'name' => 'Павел Новиков', 'cars' => [['Hyundai', 'Santa Fe', 2021, 56600, 'K701KK', '777']]],
            ['email' => 'owner8@demo.car', 'name' => 'Ольга Федорова', 'cars' => [['Porsche', 'Macan', 2020, 39100, 'M801MM', '77']]],
            ['email' => 'owner9@demo.car', 'name' => 'Сергей Васильев', 'cars' => [['Skoda', 'Octavia', 2018, 128000, 'O901OO', '190']]],
            ['email' => 'owner10@demo.car', 'name' => 'Николай Петров', 'cars' => [['Nissan', 'X-Trail', 2019, 91700, 'P010PP', '77']]],
            ['email' => 'owner11@demo.car', 'name' => 'Виктория Белова', 'cars' => [['Volvo', 'XC60', 2022, 27400, 'T111TT', '99']]],
            ['email' => 'owner12@demo.car', 'name' => 'Роман Егоров', 'cars' => [['Geely', 'Monjaro', 2023, 18200, 'Y121YY', '77']]],
            ['email' => 'owner13@demo.car', 'name' => 'Ирина Павлова', 'cars' => [['Subaru', 'Forester', 2020, 69400, 'X131XX', '50']]],
            ['email' => 'owner14@demo.car', 'name' => 'Максим Захаров', 'cars' => [['Chery', 'Tiggo 8 Pro', 2022, 33800, 'A141BC', '777']]],
            ['email' => 'owner15@demo.car', 'name' => 'Светлана Лебедева', 'cars' => [['Renault', 'Arkana', 2021, 58800, 'B151CA', '77']]],
        ];

        $visitServices = [
            ['Мойка', 'Защитный состав'],
            ['Полировка', 'Керамика'],
            ['Химчистка', 'Озонация'],
            ['Детейлинг кузова', 'PPF'],
        ];

        $demoCarNo = 1;
        foreach ($demoOwners as $ownerIndex => $demoOwner) {
            $n = $ownerIndex + 1;
            $phone = '+7999000'.str_pad((string) $n, 4, '0', STR_PAD_LEFT);
            $crmOwner = Owner::query()->updateOrCreate(
                ['email' => $demoOwner['email']],
                [
                    'password' => Hash::make('1111'),
                    'name' => $demoOwner['name'],
                    'phone' => $phone,
                    'garage_slug' => 'demo-owner-'.$n,
                    'garage_city' => 'Москва',
                    'show_city_public' => false,
                    'show_website_public' => false,
                    'show_social_public' => false,
                    'show_phone_public' => false,
                    'is_premium' => $n <= 3,
                    'garage_private' => true,
                ],
            );

            foreach ($demoOwner['cars'] as $carData) {
                [$make, $model, $year, $mileage, $plate, $region] = $carData;
                $vin = 'DEMOCRM'.str_pad((string) $demoCarNo, 10, '0', STR_PAD_LEFT);
                $crmCar = Car::query()->updateOrCreate(
                    ['detailing_id' => $studio->id, 'vin' => $vin],
                    [
                        'owner_id' => $crmOwner->id,
                        'plate' => $plate,
                        'plate_region' => $region,
                        'make' => $make,
                        'model' => $model,
                        'year' => $year,
                        'mileage_km' => $mileage,
                        'price_rub' => 0,
                        'color' => ['Черный', 'Белый', 'Серый', 'Синий'][$demoCarNo % 4],
                        'city' => 'Москва',
                        'segment' => 'mass',
                        'client_name' => $demoOwner['name'],
                        'client_phone' => $phone,
                        'client_email' => $demoOwner['email'],
                    ],
                );

                $daysAgo = $demoCarNo % 6 === 0 ? 0 : (3 + ($demoCarNo * 4) % 42);
                $visitAt = Carbon::now($tz)->subDays($daysAgo)->setTime(10 + ($demoCarNo % 8), 0, 0);
                $services = $visitServices[$demoCarNo % count($visitServices)];
                CarEvent::query()->firstOrCreate(
                    [
                        'car_id' => $crmCar->id,
                        'title' => 'Демо визит CRM #'.$demoCarNo,
                    ],
                    [
                        'detailing_id' => $studio->id,
                        'owner_id' => $crmOwner->id,
                        'source' => 'service',
                        'is_draft' => false,
                        'allow_public_photos' => false,
                        'at' => $visitAt,
                        'type' => 'visit',
                        'mileage_km' => max(0, (int) $mileage - 120),
                        'services' => $services,
                        'maintenance_services' => [],
                        'note' => 'Демо-визит для проверки кабинета владельца и CRM детейлинга.',
                    ],
                );

                $demoCarNo++;
            }
        }

        if ($this->command) {
            $this->command->info('CRM-демо готово: owner1@demo.car … owner15@demo.car, пароль 1111.');
        }
    }
}
