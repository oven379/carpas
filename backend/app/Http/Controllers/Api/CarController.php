<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Car;
use App\Models\Detailing;
use Illuminate\Http\Request;

class CarController extends Controller
{
    public function index(Request $request)
    {
        /** @var Detailing $d */
        $d = $request->user();
        $cars = Car::query()
            ->where('detailing_id', $d->id)
            ->orderByDesc('updated_at')
            ->get();

        return response()->json($cars->map(fn ($c) => $this->car($c))->values());
    }

    public function show(Request $request, $id)
    {
        /** @var Detailing $d */
        $d = $request->user();
        $car = Car::query()->where('detailing_id', $d->id)->findOrFail($id);
        return response()->json($this->car($car));
    }

    public function store(Request $request)
    {
        /** @var Detailing $d */
        $d = $request->user();

        $data = $request->validate([
            'vin' => ['nullable', 'string'],
            'plate' => ['nullable', 'string'],
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
        ]);

        $car = Car::query()->create([
            'detailing_id' => $d->id,
            'vin' => trim((string) ($data['vin'] ?? '')),
            'plate' => trim((string) ($data['plate'] ?? '')),
            'make' => trim((string) ($data['make'] ?? '')),
            'model' => trim((string) ($data['model'] ?? '')),
            'year' => isset($data['year']) ? (int) $data['year'] : null,
            'mileage_km' => isset($data['mileageKm']) ? (int) $data['mileageKm'] : 0,
            'price_rub' => isset($data['priceRub']) ? (int) $data['priceRub'] : 0,
            'color' => trim((string) ($data['color'] ?? '')),
            'city' => trim((string) ($data['city'] ?? '')),
            'hero' => isset($data['hero']) ? (string) $data['hero'] : null,
            'segment' => trim((string) ($data['segment'] ?? 'mass')) ?: 'mass',
            'seller' => $data['seller'] ?? null,
        ]);

        return response()->json($this->car($car));
    }

    public function update(Request $request, $id)
    {
        /** @var Detailing $d */
        $d = $request->user();
        $car = Car::query()->where('detailing_id', $d->id)->findOrFail($id);

        $data = $request->all();
        $patch = [];
        $map = [
            'vin' => 'vin',
            'plate' => 'plate',
            'make' => 'make',
            'model' => 'model',
            'color' => 'color',
            'city' => 'city',
            'hero' => 'hero',
            'segment' => 'segment',
        ];
        foreach ($map as $k => $col) {
            if (array_key_exists($k, $data)) {
                $patch[$col] = is_string($data[$k]) ? trim($data[$k]) : $data[$k];
            }
        }
        if (array_key_exists('year', $data)) $patch['year'] = $data['year'] === null ? null : (int) $data['year'];
        if (array_key_exists('mileageKm', $data)) $patch['mileage_km'] = (int) ($data['mileageKm'] ?? 0);
        if (array_key_exists('priceRub', $data)) $patch['price_rub'] = (int) ($data['priceRub'] ?? 0);
        if (array_key_exists('seller', $data)) $patch['seller'] = $data['seller'];

        $car->fill($patch);
        $car->save();

        return response()->json($this->car($car->fresh()));
    }

    public function destroy(Request $request, $id)
    {
        /** @var Detailing $d */
        $d = $request->user();
        $car = Car::query()->where('detailing_id', $d->id)->findOrFail($id);
        $car->delete();
        return response()->json(['ok' => true]);
    }

    private function car(Car $c): array
    {
        return [
            'id' => (string) $c->id,
            'detailingId' => (string) $c->detailing_id,
            'vin' => $c->vin ?? '',
            'plate' => $c->plate ?? '',
            'make' => $c->make ?? '',
            'model' => $c->model ?? '',
            'year' => $c->year,
            'mileageKm' => (int) ($c->mileage_km ?? 0),
            'priceRub' => (int) ($c->price_rub ?? 0),
            'color' => $c->color ?? '',
            'city' => $c->city ?? '',
            'hero' => $c->hero,
            'segment' => $c->segment ?? 'mass',
            'seller' => $c->seller,
            'createdAt' => optional($c->created_at)->toISOString(),
            'updatedAt' => optional($c->updated_at)->toISOString(),
        ];
    }
}
