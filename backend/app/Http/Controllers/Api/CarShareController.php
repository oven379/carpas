<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Support\ApiResources;
use App\Http\Support\DetailingCarAccess;
use App\Models\Car;
use App\Models\CarDoc;
use App\Models\CarEvent;
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
        DetailingCarAccess::findCarForDetailingOrFail($d, (int) $carId);

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
        DetailingCarAccess::findCarForDetailingOrFail($d, (int) $carId);

        $shares = CarShare::query()
            ->where('car_id', $carId)
            ->orderByDesc('created_at')
            ->get();

        return response()->json($shares->map(fn ($s) => $this->share($s))->values());
    }

    public function revoke(Request $request, $token)
    {
        /** @var Detailing $d */
        $d = $request->user();
        $share = CarShare::query()->where('token', $token)->firstOrFail();
        DetailingCarAccess::findCarForDetailingOrFail($d, (int) $share->car_id);
        $share->revoked_at = now();
        $share->save();

        return response()->json(['ok' => true]);
    }

    public function byToken(Request $request, $token)
    {
        $share = CarShare::query()->where('token', $token)->whereNull('revoked_at')->first();
        if (!$share) {
            return response()->json(null, 404);
        }

        $car = Car::query()->with('owner')->find($share->car_id);
        if (!$car) {
            return response()->json(null, 404);
        }

        $ownerEvents = CarEvent::query()
            ->where('car_id', $car->id)
            ->where('source', 'owner')
            ->orderByDesc('at')
            ->get();

        /* Вложения без привязки к визиту — только в гараже владельца, не в публичной ссылке */
        $ownerDocs = CarDoc::query()
            ->where('car_id', $car->id)
            ->where('source', 'owner')
            ->whereNotNull('event_id')
            ->orderByDesc('created_at')
            ->get();

        $publicCar = ApiResources::car($car);
        $publicCar['vin'] = '';

        return response()->json([
            'car' => $publicCar,
            'share' => $this->share($share),
            'ownerEvents' => $ownerEvents->map(fn ($e) => ApiResources::event($e))->values(),
            'ownerDocs' => $ownerDocs->map(fn ($d) => ApiResources::doc($d))->values(),
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
