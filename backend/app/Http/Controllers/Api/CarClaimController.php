<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Support\ApiResources;
use App\Http\Support\CarGarageMerge;
use App\Models\Car;
use App\Models\CarClaim;
use App\Models\Detailing;
use App\Models\Owner;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class CarClaimController extends Controller
{
    public function store(Request $request)
    {
        /** @var Owner $owner */
        $owner = $request->user();

        $data = $request->validate([
            'carId' => ['required', 'string'],
            'evidence' => ['nullable', 'array'],
        ]);

        $car = Car::query()->findOrFail((int) $data['carId']);
        $det = Detailing::query()->findOrFail($car->detailing_id);
        if ($det->is_personal) {
            abort(422, 'invalid_car');
        }

        $pending = CarClaim::query()
            ->where('car_id', $car->id)
            ->where('owner_id', $owner->id)
            ->where('status', 'pending')
            ->exists();
        if ($pending) {
            throw ValidationException::withMessages(['carId' => 'already_pending']);
        }

        $claim = CarClaim::query()->create([
            'car_id' => $car->id,
            'owner_id' => $owner->id,
            'detailing_id' => $car->detailing_id,
            'status' => 'pending',
            'evidence' => $data['evidence'] ?? [],
        ]);
        $claim->load('owner');

        return response()->json(ApiResources::claim($claim));
    }

    public function mine(Request $request)
    {
        /** @var Owner $owner */
        $owner = $request->user();
        $claims = CarClaim::query()
            ->where('owner_id', $owner->id)
            ->with('owner')
            ->orderByDesc('created_at')
            ->get();

        return response()->json($claims->map(fn ($c) => ApiResources::claim($c))->values());
    }

    public function inbox(Request $request)
    {
        /** @var Detailing $d */
        $d = $request->user();
        $claims = CarClaim::query()
            ->where('detailing_id', $d->id)
            ->with('owner')
            ->orderByDesc('created_at')
            ->get();

        return response()->json($claims->map(fn ($c) => ApiResources::claim($c))->values());
    }

    public function review(Request $request, $id)
    {
        /** @var Detailing $d */
        $d = $request->user();
        $data = $request->validate([
            'status' => ['required', 'string', 'in:approved,rejected'],
        ]);

        $claim = CarClaim::query()
            ->where('detailing_id', $d->id)
            ->where('id', $id)
            ->firstOrFail();

        if (!in_array($claim->status, ['pending'], true)) {
            abort(422, 'already_reviewed');
        }

        $claim->status = $data['status'];
        $claim->reviewed_at = now();
        $claim->save();

        if ($data['status'] === 'approved') {
            $car = Car::query()->findOrFail($claim->car_id);
            $car->owner_id = $claim->owner_id;
            $car->save();
            $owner = Owner::query()->find($claim->owner_id);
            if ($owner) {
                CarGarageMerge::mergeOwnerPersonalDuplicatesIntoCar($car, $owner);
            }
        }

        $claim->load('owner');

        return response()->json(ApiResources::claim($claim));
    }
}
