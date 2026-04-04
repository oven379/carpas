<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Car;
use App\Models\CarShare;
use App\Models\Owner;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class OwnerCarShareController extends Controller
{
    private function assertOwnerCar(Owner $owner, $carId): Car
    {
        return Car::query()->where('owner_id', $owner->id)->findOrFail($carId);
    }

    private function shareOut(CarShare $s): array
    {
        return [
            'id' => (string) $s->id,
            'carId' => (string) $s->car_id,
            'token' => $s->token,
            'createdAt' => optional($s->created_at)->toISOString(),
            'revokedAt' => optional($s->revoked_at)->toISOString(),
        ];
    }

    public function store(Request $request, $carId)
    {
        /** @var Owner $owner */
        $owner = $request->user();
        $this->assertOwnerCar($owner, $carId);

        $share = CarShare::query()->create([
            'car_id' => $carId,
            'token' => Str::random(32),
            'created_at' => now(),
            'revoked_at' => null,
        ]);

        return response()->json($this->shareOut($share));
    }

    public function index(Request $request, $carId)
    {
        /** @var Owner $owner */
        $owner = $request->user();
        $this->assertOwnerCar($owner, $carId);

        $shares = CarShare::query()
            ->where('car_id', $carId)
            ->orderByDesc('created_at')
            ->get();

        return response()->json($shares->map(fn ($s) => $this->shareOut($s))->values());
    }

    public function revoke(Request $request, $token)
    {
        /** @var Owner $owner */
        $owner = $request->user();
        $share = CarShare::query()->where('token', $token)->firstOrFail();
        $this->assertOwnerCar($owner, $share->car_id);
        $share->revoked_at = now();
        $share->save();

        return response()->json(['ok' => true]);
    }
}
