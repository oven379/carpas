<?php

namespace Database\Seeders;

use App\Http\Support\MediaStorage;
use App\Models\AppNotification;
use App\Models\Car;
use App\Models\CarDoc;
use App\Models\CarEvent;
use App\Models\Detailing;
use App\Models\DetailingClientNote;
use App\Models\Owner;
use App\Models\ServiceBookingRequest;
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
        $clientNotes = [
            1 => 'Звонить после 18:00. Просит всегда присылать фото до/после.',
            2 => 'Предпочитает запись на будние дни утром, сообщения читает редко.',
            3 => 'Любит подробные рекомендации мастера и просит напоминать о повторном уходе.',
            5 => 'Перед визитом уточнять состояние салона и наличие детского кресла.',
        ];
        $assetRoot = base_path('store-assets');
        if (! is_dir($assetRoot)) {
            $assetRoot = base_path('database/seeders/demo-assets');
        }
        $avatarsRoot = $assetRoot.DIRECTORY_SEPARATOR.'demo-crm-avatars';
        $carsRoot = $assetRoot.DIRECTORY_SEPARATOR.'demo-car-photos';
        $visitPhotos = [
            'visit-01-wash-foam.png' => 'Фото визита: мойка и активная пена',
            'visit-02-polishing.png' => 'Фото визита: полировка кузова',
            'visit-03-interior-cleaning.png' => 'Фото визита: химчистка салона',
            'visit-04-wheels-tires.png' => 'Фото визита: диски и резина',
            'visit-05-paint-inspection.png' => 'Фото визита: осмотр ЛКП',
            'visit-06-microfiber-drying.png' => 'Фото визита: сушка кузова',
            'visit-07-interior-aftercare.png' => 'Фото визита: уход за салоном',
            'visit-08-final-delivery.png' => 'Фото визита: выдача автомобиля',
        ];

        $demoCarNo = 1;
        foreach ($demoOwners as $ownerIndex => $demoOwner) {
            $n = $ownerIndex + 1;
            $phone = '+7999000'.str_pad((string) $n, 4, '0', STR_PAD_LEFT);
            $avatar = $this->storeDemoAsset(
                $avatarsRoot.DIRECTORY_SEPARATOR.sprintf('owner%02d-avatar.png', $n),
                sprintf('demo-crm/owners/owner%02d/avatar.png', $n),
            );
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
                    'garage_avatar' => $avatar,
                ],
            );
            if (isset($clientNotes[$n])) {
                DetailingClientNote::query()->updateOrCreate(
                    [
                        'detailing_id' => $studio->id,
                        'client_key' => 'owner:'.$crmOwner->id,
                    ],
                    [
                        'owner_id' => $crmOwner->id,
                        'note' => $clientNotes[$n],
                    ],
                );
            }

            foreach ($demoOwner['cars'] as $carIndex => $carData) {
                [$make, $model, $year, $mileage, $plate, $region] = $carData;
                $vin = 'DEMOCRM'.str_pad((string) $demoCarNo, 10, '0', STR_PAD_LEFT);
                $carFolder = sprintf(
                    'owner%02d-car%02d-%s',
                    $n,
                    $carIndex + 1,
                    $this->demoSlug($make.'-'.$model.'-'.$year),
                );
                $carAssetRoot = $carsRoot.DIRECTORY_SEPARATOR.$carFolder;
                $hero = $this->storeDemoAsset(
                    $carAssetRoot.DIRECTORY_SEPARATOR.'garage.png',
                    'demo-crm/cars/'.$vin.'/garage.png',
                );
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
                        'hero' => $hero,
                        'segment' => 'mass',
                        'client_name' => $demoOwner['name'],
                        'client_phone' => $phone,
                        'client_email' => $demoOwner['email'],
                    ],
                );

                $daysAgo = $demoCarNo % 6 === 0 ? 0 : (3 + ($demoCarNo * 4) % 42);
                $visitAt = Carbon::now($tz)->subDays($daysAgo)->setTime(10 + ($demoCarNo % 8), 0, 0);
                $services = $visitServices[$demoCarNo % count($visitServices)];
                $visit = CarEvent::query()->firstOrCreate(
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

                foreach ($visitPhotos as $fileName => $title) {
                    $stored = $this->storeDemoAsset(
                        $carAssetRoot.DIRECTORY_SEPARATOR.$fileName,
                        'demo-crm/cars/'.$vin.'/'.$fileName,
                    );
                    if ($stored === null) {
                        continue;
                    }

                    CarDoc::query()->updateOrCreate(
                        [
                            'car_id' => $crmCar->id,
                            'event_id' => $visit->id,
                            'title' => $title,
                        ],
                        [
                            'detailing_id' => $studio->id,
                            'owner_id' => $crmOwner->id,
                            'source' => 'service',
                            'kind' => 'photo',
                            'url' => $stored,
                            'created_at' => $visitAt,
                            'updated_at' => $visitAt,
                        ],
                    );
                }

                $demoCarNo++;
            }
        }

        $demoOwner = Owner::query()->where('email', 'owner3@demo.car')->first();
        $demoCar = $demoOwner
            ? Car::query()
                ->where('detailing_id', $studio->id)
                ->where('owner_id', $demoOwner->id)
                ->orderBy('id')
                ->first()
            : null;
        $demoVisit = $demoCar
            ? CarEvent::query()
                ->where('detailing_id', $studio->id)
                ->where('car_id', $demoCar->id)
                ->where('source', 'service')
                ->where('is_draft', false)
                ->orderByDesc('at')
                ->first()
            : null;

        if ($demoOwner && $demoCar && $demoVisit) {
            $bookingRequest = ServiceBookingRequest::query()->updateOrCreate(
                [
                    'owner_id' => $demoOwner->id,
                    'detailing_id' => $studio->id,
                    'car_id' => $demoCar->id,
                    'car_event_id' => $demoVisit->id,
                    'status' => ServiceBookingRequest::STATUS_NEW,
                ],
                [
                    'message' => 'Хочу записаться на повторный уход, подберите удобное время.',
                    'closed_at' => null,
                ],
            );

            $carName = trim(implode(' ', array_filter([(string) $demoCar->make, (string) $demoCar->model]))) ?: 'автомобиль';
            AppNotification::query()->updateOrCreate(
                [
                    'owner_id' => $demoOwner->id,
                    'detailing_id' => null,
                    'kind' => 'owner_booking_request_sent',
                    'title' => 'Заявка отправлена',
                    'body' => 'Мы передали заявку в сервис. Менеджер свяжется с вами и подберёт время для '.$carName.'.',
                ],
                [
                    'data' => [
                        'bookingRequestId' => (string) $bookingRequest->id,
                        'carId' => (string) $demoCar->id,
                        'eventId' => (string) $demoVisit->id,
                        'detailingId' => (string) $studio->id,
                        'ownerName' => (string) $demoOwner->name,
                        'carName' => $carName,
                        'requestType' => 'owner_booking',
                        'requestTypeLabel' => 'Запись от владельца',
                    ],
                    'sent_by_admin' => false,
                    'push_sent' => false,
                    'push_failed' => false,
                    'read_at' => null,
                ],
            );
            AppNotification::query()->updateOrCreate(
                [
                    'detailing_id' => $studio->id,
                    'owner_id' => null,
                    'kind' => 'owner_booking_request',
                    'title' => 'Клиент хочет записаться',
                    'body' => $demoOwner->name.' хочет записать '.$carName.' на повторный визит. Свяжитесь с клиентом для выбора времени.',
                ],
                [
                    'data' => [
                        'bookingRequestId' => (string) $bookingRequest->id,
                        'ownerId' => (string) $demoOwner->id,
                        'carId' => (string) $demoCar->id,
                        'eventId' => (string) $demoVisit->id,
                        'detailingId' => (string) $studio->id,
                        'ownerName' => (string) $demoOwner->name,
                        'ownerPhone' => (string) $demoOwner->phone,
                        'carName' => $carName,
                        'requestType' => 'owner_booking',
                        'requestTypeLabel' => 'Запись от владельца',
                    ],
                    'sent_by_admin' => false,
                    'push_sent' => false,
                    'push_failed' => false,
                    'read_at' => null,
                ],
            );
        }

        $reminderOwner = Owner::query()->where('email', 'owner5@demo.car')->first();
        $reminderCar = $reminderOwner
            ? Car::query()
                ->where('detailing_id', $studio->id)
                ->where('owner_id', $reminderOwner->id)
                ->orderBy('id')
                ->first()
            : null;
        $reminderVisit = $reminderCar
            ? CarEvent::query()
                ->where('detailing_id', $studio->id)
                ->where('car_id', $reminderCar->id)
                ->where('source', 'service')
                ->where('is_draft', false)
                ->orderByDesc('at')
                ->first()
            : null;

        if ($reminderOwner && $reminderCar && $reminderVisit) {
            $reminderAt = Carbon::now($tz)->subDay()->setTime(11, 0, 0);
            $reminderVisit->forceFill(['next_contact_at' => $reminderAt])->save();
            $reminderCarName = trim(implode(' ', array_filter([(string) $reminderCar->make, (string) $reminderCar->model]))) ?: 'автомобиль';

            AppNotification::query()->updateOrCreate(
                [
                    'detailing_id' => $studio->id,
                    'owner_id' => null,
                    'kind' => 'crm_next_contact',
                    'title' => 'Рекомендованное время контакта',
                ],
                [
                    'body' => $reminderOwner->name.': '.$reminderCarName.'. Подошло время повторного ухода, свяжитесь с клиентом.',
                    'data' => [
                        'ownerId' => (string) $reminderOwner->id,
                        'carId' => (string) $reminderCar->id,
                        'eventId' => (string) $reminderVisit->id,
                        'detailingId' => (string) $studio->id,
                        'nextContactAt' => $reminderAt->toISOString(),
                        'ownerName' => (string) $reminderOwner->name,
                        'ownerPhone' => (string) $reminderOwner->phone,
                        'carName' => $reminderCarName,
                        'requestType' => 'next_contact',
                        'requestTypeLabel' => 'Время от мастера',
                    ],
                    'sent_by_admin' => false,
                    'push_sent' => false,
                    'push_failed' => false,
                    'read_at' => null,
                ],
            );
        }

        if ($this->command) {
            $this->command->info('CRM-демо готово: owner1@demo.car … owner15@demo.car, пароль 1111.');
        }
    }

    private function storeDemoAsset(string $sourcePath, string $targetPath): ?string
    {
        if (! is_file($sourcePath)) {
            return null;
        }

        return MediaStorage::storeBinaryAt($targetPath, (string) file_get_contents($sourcePath));
    }

    private function demoSlug(string $value): string
    {
        $slug = strtolower(trim($value));
        $slug = preg_replace('/[^a-z0-9]+/', '-', $slug) ?: '';

        return trim($slug, '-');
    }
}
