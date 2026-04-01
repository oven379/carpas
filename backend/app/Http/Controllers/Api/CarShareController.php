<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Car;
use App\Models\CarShare;
use App\Models\Detailing;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CarShareController extends Controller
{
    public function store(Request $request, $carId)
    {
        /** @var Detailing $d */
        $d = $request->user();
        Car::query()->where('detailing_id', $d->id)->findOrFail($carId);

        $share = CarShare::query()->create([
            'car_id' => $carId,
            'token' => Str::random(32),
            'created_at' => now(),
            'revoked_at' => null,
        ]);

        return response()->json($this->share($share));
    }

    public function index(Request $request, $carId)
    {
        /** @var Detailing $d */
        $d = $request->user();
        Car::query()->where('detailing_id', $d->id)->findOrFail($carId);

        $shares = CarShare::query()
            ->where('car_id', $carId)
            ->orderByDesc('created_at')
            ->get();

        return response()->json($shares->map(fn ($s) => $this->share($s))->values());
    }

    public function revoke(Request $request, $token)
    {
        $share = CarShare::query()->where('token', $token)->firstOrFail();
        $share->revoked_at = now();
        $share->save();
        return response()->json(['ok' => true]);
    }

    public function byToken(Request $request, $token)
    {
        $share = CarShare::query()->where('token', $token)->whereNull('revoked_at')->first();
        if (!$share) return response()->json(null, 404);

        $car = Car::query()->find($share->car_id);
        if (!$car) return response()->json(null, 404);

        return response()->json([
            'car' => [
                'id' => (string) $car->id,
                'detailingId' => (string) $car->detailing_id,
                'vin' => '', // публичная выдача без VIN (MVP)
                'plate' => $car->plate ?? '',
                'make' => $car->make ?? '',
                'model' => $car->model ?? '',
                'year' => $car->year,
                'mileageKm' => (int) ($car->mileage_km ?? 0),
                'priceRub' => (int) ($car->price_rub ?? 0),
                'color' => $car->color ?? '',
                'city' => $car->city ?? '',
                'hero' => $car->hero,
                'segment' => $car->segment ?? 'mass',
                'seller' => $car->seller,
                'createdAt' => optional($car->created_at)->toISOString(),
                'updatedAt' => optional($car->updated_at)->toISOString(),
            ],
            'share' => $this->share($share),
        ]);
    }

    private function share(CarShare $s): array
    {
        return [
            'id' => (string) $s->id,
            'carId' => (string) $s->car_id,
            'token' => $s->token,
            'createdAt' => optional($s->created_at)->toISOString(),
            'revokedAt' => optional($s->revoked_at)->toISOString(),
        ];
    }
}
