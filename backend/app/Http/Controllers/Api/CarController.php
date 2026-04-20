<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Support\ApiResources;
use App\Http\Support\CarGarageMerge;
use App\Http\Support\CarMileageSync;
use App\Http\Support\DetailingCarAccess;
use App\Http\Support\MediaStorage;
use App\Http\Support\VinPlateValidator;
use App\Models\Car;
use App\Models\CarEvent;
use App\Models\Detailing;
use App\Models\Owner;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class CarController extends Controller
{
    public function index(Request $request)
    {
        /** @var Detailing $d */
        $d = $request->user();
        $fromEvents = CarEvent::query()
            ->where('detailing_id', $d->id)
            ->where('source', 'service')
            ->distinct()
            ->pluck('car_id');
        $fromHome = Car::query()->where('detailing_id', $d->id)->pluck('id');
        $ids = $fromEvents->merge($fromHome)->unique()->filter()->values();
        $cars = Car::query()
            ->whereIn('id', $ids)
            ->with('owner')
            ->orderByDesc('updated_at')
            ->get();

        return response()->json($cars->map(fn ($c) => ApiResources::car($c))->values());
    }

    public function show(Request $request, $id)
    {
        /** @var Detailing $d */
        $d = $request->user();
        $car = DetailingCarAccess::findCarForDetailingOrFail($d, (int) $id);

        return response()->json(ApiResources::car($car));
    }

    /**
     * Минимальная карточка под визит по VIN (кабинет партнёра). Не «добавление авто владельцем».
     */
    public function storeForVisit(Request $request)
    {
        /** @var Detailing $d */
        $d = $request->user();
        if ($d->is_personal) {
            throw ValidationException::withMessages([
                'vin' => ['Этот метод только для кабинета партнёра.'],
            ]);
        }

        $data = $request->validate([
            'vin' => ['required', 'string'],
            'clientName' => ['nullable', 'string'],
            'clientPhone' => ['nullable', 'string'],
            'clientEmail' => ['nullable', 'string'],
        ]);

        $vin = VinPlateValidator::normalizeVin(trim((string) ($data['vin'] ?? '')));
        if ($msg = VinPlateValidator::vinError($vin)) {
            throw ValidationException::withMessages(['vin' => [$msg]]);
        }
        if (strlen($vin) !== 17) {
            throw ValidationException::withMessages(['vin' => ['Укажите полный VIN из 17 символов.']]);
        }

        $existing = Car::query()
            ->where('detailing_id', $d->id)
            ->whereRaw('lower(trim(vin)) = ?', [mb_strtolower($vin, 'UTF-8')])
            ->first();
        if ($existing) {
            return response()->json(ApiResources::car($existing->load('owner')));
        }

        $car = Car::query()->create([
            'detailing_id' => $d->id,
            'owner_id' => null,
            'vin' => $vin,
            'plate' => '',
            'plate_region' => '',
            'make' => '',
            'model' => '',
            'year' => null,
            'mileage_km' => 0,
            'price_rub' => 0,
            'color' => '',
            'city' => '',
            'hero' => null,
            'segment' => 'mass',
            'seller' => ['id' => (string) $d->id, 'name' => $d->name, 'type' => 'service'],
            'owner_phone' => '',
            'client_name' => trim((string) ($data['clientName'] ?? '')),
            'client_phone' => trim((string) ($data['clientPhone'] ?? '')),
            'client_email' => trim((string) ($data['clientEmail'] ?? '')),
            'wash_photos' => [],
        ]);

        return response()->json(ApiResources::car($car->load('owner')));
    }

    public function store(Request $request)
    {
        /** @var Detailing $d */
        $d = $request->user();
        if (! $d->is_personal) {
            throw ValidationException::withMessages([
                'vin' => ['Создание карточки через этот запрос отключено: добавьте визит по VIN (эндпоинт /cars/for-visit).'],
            ]);
        }

        $data = $request->validate([
            'vin' => ['nullable', 'string'],
            'plate' => ['nullable', 'string'],
            'plateRegion' => ['nullable', 'string'],
            'make' => ['nullable', 'string'],
            'model' => ['nullable', 'string'],
            'year' => ['nullable'],
            'mileageKm' => ['nullable'],
            'priceRub' => ['nullable'],
            'color' => ['nullable', 'string'],
            'city' => ['nullable', 'string'],
            'hero' => ['nullable', 'string'],
            'segment' => ['nullable', 'string'],
            'seller' => ['nullable'],
            'ownerPhone' => ['nullable', 'string'],
            'clientName' => ['nullable', 'string'],
            'clientPhone' => ['nullable', 'string'],
            'clientEmail' => ['nullable', 'string'],
        ]);

        $vin = VinPlateValidator::normalizeVin(trim((string) ($data['vin'] ?? '')));
        $plate = VinPlateValidator::normalizePlateBase(trim((string) ($data['plate'] ?? '')));
        $region = VinPlateValidator::normalizePlateRegion(trim((string) ($data['plateRegion'] ?? '')));
        if ($msg = VinPlateValidator::vinError($vin)) {
            throw ValidationException::withMessages(['vin' => [$msg]]);
        }
        if ($msg = VinPlateValidator::ruPlatePairError($plate, $region)) {
            throw ValidationException::withMessages(['plate' => [$msg]]);
        }

        $car = Car::query()->create([
            'detailing_id' => $d->id,
            'owner_id' => null,
            'vin' => $vin,
            'plate' => $plate,
            'plate_region' => $region,
            'make' => trim((string) ($data['make'] ?? '')),
            'model' => trim((string) ($data['model'] ?? '')),
            'year' => VinPlateValidator::normalizeOptionalYear($data['year'] ?? null),
            'mileage_km' => isset($data['mileageKm']) ? (int) $data['mileageKm'] : 0,
            'price_rub' => isset($data['priceRub']) ? (int) $data['priceRub'] : 0,
            'color' => trim((string) ($data['color'] ?? '')),
            'city' => trim((string) ($data['city'] ?? '')),
            'hero' => null,
            'segment' => trim((string) ($data['segment'] ?? 'mass')) ?: 'mass',
            'seller' => $data['seller'] ?? ['id' => (string) $d->id, 'name' => $d->name, 'type' => 'service'],
            'owner_phone' => trim((string) ($data['ownerPhone'] ?? '')),
            'client_name' => trim((string) ($data['clientName'] ?? '')),
            'client_phone' => trim((string) ($data['clientPhone'] ?? '')),
            'client_email' => trim((string) ($data['clientEmail'] ?? '')),
            'wash_photos' => [],
        ]);

        if (array_key_exists('hero', $data) && is_string($data['hero']) && trim($data['hero']) !== '') {
            $car->hero = MediaStorage::ingestScalar(
                trim($data['hero']),
                null,
                'cars/'.$car->id,
                'hero',
            );
            $car->save();
        }

        return response()->json(ApiResources::car($car->load('owner')));
    }

    public function update(Request $request, $id)
    {
        /** @var Detailing $d */
        $d = $request->user();
        $car = Car::query()->where('detailing_id', $d->id)->with('owner')->findOrFail($id);

        $data = $request->all();

        $nextVin = array_key_exists('vin', $data)
            ? VinPlateValidator::normalizeVin(is_string($data['vin'] ?? null) ? trim((string) $data['vin']) : '')
            : (string) ($car->vin ?? '');
        $nextPlate = array_key_exists('plate', $data)
            ? VinPlateValidator::normalizePlateBase(is_string($data['plate'] ?? null) ? trim((string) $data['plate']) : '')
            : (string) ($car->plate ?? '');
        $nextRegion = array_key_exists('plateRegion', $data)
            ? VinPlateValidator::normalizePlateRegion(is_string($data['plateRegion'] ?? null) ? trim((string) $data['plateRegion']) : '')
            : (string) ($car->plate_region ?? '');

        if (array_key_exists('vin', $data) && ($msg = VinPlateValidator::vinError($nextVin))) {
            throw ValidationException::withMessages(['vin' => [$msg]]);
        }
        if (
            (array_key_exists('plate', $data) || array_key_exists('plateRegion', $data))
            && ($msg = VinPlateValidator::ruPlatePairError($nextPlate, $nextRegion))
        ) {
            throw ValidationException::withMessages(['plate' => [$msg]]);
        }

        if (array_key_exists('vin', $data)) {
            $car->vin = $nextVin;
        }
        if (array_key_exists('plate', $data)) {
            $car->plate = $nextPlate;
        }
        if (array_key_exists('plateRegion', $data)) {
            $car->plate_region = $nextRegion;
        }

        $map = [
            'make' => 'make',
            'model' => 'model',
            'color' => 'color',
            'city' => 'city',
            'segment' => 'segment',
        ];
        foreach ($map as $json => $col) {
            if (array_key_exists($json, $data)) {
                $car->{$col} = is_string($data[$json]) ? trim($data[$json]) : $data[$json];
            }
        }
        if (array_key_exists('year', $data)) {
            $car->year = VinPlateValidator::normalizeOptionalYear($data['year']);
        }
        if (array_key_exists('mileageKm', $data)) {
            $next = (int) ($data['mileageKm'] ?? 0);
            $floor = CarMileageSync::maxMileageAmongFinalizedEvents((int) $car->id);
            if ($next < $floor) {
                throw ValidationException::withMessages([
                    'mileageKm' => ['Не меньше '.$floor.' км — по сохранённым визитам в истории.'],
                ]);
            }
            $car->mileage_km = $next;
        }
        if (array_key_exists('priceRub', $data)) {
            $car->price_rub = (int) ($data['priceRub'] ?? 0);
        }
        if (array_key_exists('seller', $data)) {
            $car->seller = $data['seller'];
        }
        if (array_key_exists('ownerPhone', $data)) {
            $car->owner_phone = trim((string) $data['ownerPhone']);
        }
        if (array_key_exists('clientName', $data)) {
            $car->client_name = trim((string) $data['clientName']);
        }
        if (array_key_exists('clientPhone', $data)) {
            $car->client_phone = trim((string) $data['clientPhone']);
        }
        if (array_key_exists('clientEmail', $data)) {
            $car->client_email = trim((string) $data['clientEmail']);
        }
        if (array_key_exists('hero', $data)) {
            $raw = is_string($data['hero'] ?? null) ? trim((string) $data['hero']) : '';
            $car->hero = MediaStorage::ingestScalar(
                $raw === '' ? null : $raw,
                $car->hero,
                'cars/'.$car->id,
                'hero',
            );
        }
        if (array_key_exists('washPhotos', $data) && is_array($data['washPhotos'])) {
            $car->wash_photos = MediaStorage::ingestWashPhotoList(
                $data['washPhotos'],
                $car->wash_photos,
                (int) $car->id,
            );
        }
        if (array_key_exists('ownerEmail', $data)) {
            $em = mb_strtolower(trim((string) $data['ownerEmail']));
            if ($em === '') {
                $car->owner_id = null;
            } else {
                $owner = Owner::query()->where('email', $em)->first();
                $car->owner_id = $owner?->id;
            }
        }

        $car->save();

        return response()->json(ApiResources::car($car->fresh()->load('owner')));
    }

    public function destroy(Request $request, $id)
    {
        /** @var Detailing $d */
        $d = $request->user();
        $car = Car::query()->where('detailing_id', $d->id)->findOrFail($id);
        if (! DetailingCarAccess::detailingOwnsCarRow($d, $car)) {
            abort(404);
        }
        $car->delete();

        return response()->json(['ok' => true]);
    }

    /**
     * Перенос карточки из личного гаража владельца в кабинет партнёрского сервиса (тот же VIN, проверка года/города).
     */
    public function linkFromPersonalGarage(Request $request)
    {
        /** @var Detailing $d */
        $d = $request->user();
        $data = $request->validate([
            'carId' => ['required'],
            'year' => ['nullable', 'string'],
            'city' => ['nullable', 'string'],
        ]);

        $carId = (int) $data['carId'];
        $car = Car::query()->with('detailing')->findOrFail($carId);

        if (! $car->owner_id) {
            throw ValidationException::withMessages([
                'carId' => ['Карточка без владельца — привязка из гаража недоступна.'],
            ]);
        }
        if (! $car->detailing || ! $car->detailing->is_personal) {
            throw ValidationException::withMessages([
                'carId' => ['Доступно только для авто из личного гаража владельца. У другого сервиса создайте новую карточку или дождитесь заявки клиента.'],
            ]);
        }
        if ((int) $car->detailing_id === (int) $d->id) {
            throw ValidationException::withMessages([
                'carId' => ['Эта карточка уже в вашем кабинете.'],
            ]);
        }

        $year = trim((string) ($data['year'] ?? ''));
        $city = trim((string) ($data['city'] ?? ''));
        if (! CarGarageMerge::verifyCompactEvidence($car, $year, $city)) {
            throw ValidationException::withMessages([
                'year' => ['Укажите год и/или город как в карточке владельца (хотя бы одно совпадение).'],
            ]);
        }

        CarGarageMerge::attachPersonalGarageCarToDetailing($car, (int) $d->id);

        return response()->json(ApiResources::car($car->fresh()->load('owner')));
    }
}
