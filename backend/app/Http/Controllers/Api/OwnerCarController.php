<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Support\ApiResources;
use App\Models\Car;
use App\Models\Detailing;
use App\Models\Owner;
use Illuminate\Http\Request;

class OwnerCarController extends Controller
{
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

        $car = Car::query()->create([
            'detailing_id' => $pd->id,
            'owner_id' => $owner->id,
            'vin' => trim((string) ($data['vin'] ?? '')),
            'plate' => trim((string) ($data['plate'] ?? '')),
            'plate_region' => trim((string) ($data['plateRegion'] ?? '')),
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
        $map = [
            'vin' => 'vin',
            'plate' => 'plate',
            'plateRegion' => 'plate_region',
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
