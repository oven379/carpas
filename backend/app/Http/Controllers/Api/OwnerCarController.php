<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Support\ApiResources;
use App\Http\Support\VinPlateValidator;
use App\Models\Car;
use App\Models\Detailing;
use App\Models\Owner;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class OwnerCarController extends Controller
{
    /** Не даём двум карточкам одного владельца с тем же VIN или той же парой госномер+регион. */
    private function assertOwnerCarIdentifiersUnique(Owner $owner, string $vin, string $plate, string $region, ?int $exceptCarId = null): void
    {
        $vin = trim($vin);
        $plate = trim($plate);
        $region = trim($region);

        if ($vin !== '') {
            $q = Car::query()
                ->where('owner_id', $owner->id)
                ->whereRaw('lower(trim(vin)) = ?', [mb_strtolower($vin, 'UTF-8')]);
            if ($exceptCarId !== null) {
                $q->where('id', '!=', $exceptCarId);
            }
            if ($q->exists()) {
                throw ValidationException::withMessages([
                    'vin' => ['У вас уже есть автомобиль с таким VIN. Откройте существующую карточку или укажите другой VIN.'],
                ]);
            }
        }

        if ($plate !== '' && $region !== '') {
            $q = Car::query()
                ->where('owner_id', $owner->id)
                ->whereRaw('lower(trim(plate)) = ?', [mb_strtolower($plate, 'UTF-8')])
                ->whereRaw('lower(trim(plate_region)) = ?', [mb_strtolower($region, 'UTF-8')]);
            if ($exceptCarId !== null) {
                $q->where('id', '!=', $exceptCarId);
            }
            if ($q->exists()) {
                throw ValidationException::withMessages([
                    'plate' => ['У вас уже есть автомобиль с таким госномером. Откройте существующую карточку или исправьте номер.'],
                ]);
            }
        }
    }

    private function personalDetailing(Owner $owner): Detailing
    {
        return Detailing::query()
            ->where('owner_id', $owner->id)
            ->where('is_personal', true)
            ->firstOrFail();
    }

    public function index(Request $request)
    {
        /** @var Owner $owner */
        $owner = $request->user();
        $cars = Car::query()
            ->where('owner_id', $owner->id)
            ->with('owner')
            ->orderByDesc('updated_at')
            ->get();

        return response()->json($cars->map(fn ($c) => ApiResources::car($c))->values());
    }

    public function show(Request $request, $id)
    {
        /** @var Owner $owner */
        $owner = $request->user();
        $car = Car::query()->where('owner_id', $owner->id)->with('owner')->findOrFail($id);

        return response()->json(ApiResources::car($car));
    }

    public function store(Request $request)
    {
        /** @var Owner $owner */
        $owner = $request->user();
        $pd = $this->personalDetailing($owner);

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

        $this->assertOwnerCarIdentifiersUnique($owner, $vin, $plate, $region, null);

        $car = Car::query()->create([
            'detailing_id' => $pd->id,
            'owner_id' => $owner->id,
            'vin' => $vin,
            'plate' => $plate,
            'plate_region' => $region,
            'make' => trim((string) ($data['make'] ?? '')),
            'model' => trim((string) ($data['model'] ?? '')),
            'year' => isset($data['year']) ? (int) $data['year'] : null,
            'mileage_km' => isset($data['mileageKm']) ? (int) $data['mileageKm'] : 0,
            'price_rub' => isset($data['priceRub']) ? (int) $data['priceRub'] : 0,
            'color' => trim((string) ($data['color'] ?? '')),
            'city' => trim((string) ($data['city'] ?? '')),
            'hero' => isset($data['hero']) ? (string) $data['hero'] : null,
            'segment' => trim((string) ($data['segment'] ?? 'mass')) ?: 'mass',
            'seller' => ['name' => 'Владелец', 'type' => 'owner'],
            'wash_photos' => [],
        ]);

        return response()->json(ApiResources::car($car->load('owner')));
    }

    public function update(Request $request, $id)
    {
        /** @var Owner $owner */
        $owner = $request->user();
        $car = Car::query()->where('owner_id', $owner->id)->with('owner')->findOrFail($id);

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
            'hero' => 'hero',
            'segment' => 'segment',
        ];
        foreach ($map as $json => $col) {
            if (array_key_exists($json, $data)) {
                $car->{$col} = is_string($data[$json]) ? trim($data[$json]) : $data[$json];
            }
        }
        if (array_key_exists('year', $data)) {
            $car->year = $data['year'] === null ? null : (int) $data['year'];
        }
        if (array_key_exists('mileageKm', $data)) {
            $car->mileage_km = (int) ($data['mileageKm'] ?? 0);
        }
        if (array_key_exists('priceRub', $data)) {
            $car->price_rub = (int) ($data['priceRub'] ?? 0);
        }
        if (array_key_exists('washPhotos', $data) && is_array($data['washPhotos'])) {
            $car->wash_photos = array_slice(array_values(array_filter(array_map('strval', $data['washPhotos']))), 0, 12);
        }

        $this->assertOwnerCarIdentifiersUnique(
            $owner,
            (string) ($car->vin ?? ''),
            (string) ($car->plate ?? ''),
            (string) ($car->plate_region ?? ''),
            (int) $car->id,
        );

        $car->save();

        return response()->json(ApiResources::car($car->fresh()->load('owner')));
    }

    public function destroy(Request $request, $id)
    {
        /** @var Owner $owner */
        $owner = $request->user();
        $car = Car::query()->where('owner_id', $owner->id)->findOrFail($id);
        $car->delete();

        return response()->json(['ok' => true]);
    }
}
