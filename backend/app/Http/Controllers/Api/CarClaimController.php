<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Support\ApiResources;
use App\Http\Support\CarGarageMerge;
use App\Models\Car;
use App\Models\CarClaim;
use App\Models\Detailing;
use App\Models\Owner;
use App\Services\InternalNotificationService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class CarClaimController extends Controller
{
    public function __construct(private readonly InternalNotificationService $notifications) {}

    public function store(Request $request)
    {
        /** @var Owner $owner */
        $owner = $request->user();

        $data = $request->validate([
            'carId' => ['required', 'string'],
            'evidence' => ['nullable', 'array'],
        ]);

        $car = Car::query()->findOrFail((int) $data['carId']);
        if (! $car->detailing_id) {
            abort(422, 'invalid_car');
        }

        $pending = CarClaim::query()
            ->where('car_id', $car->id)
            ->where('owner_id', $owner->id)
            ->where('direction', 'owner_to_detailing')
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
            'direction' => 'owner_to_detailing',
            'evidence' => $data['evidence'] ?? [],
        ]);
        $claim->load('owner');

        return response()->json(ApiResources::claim($claim));
    }

    public function storeDetailing(Request $request)
    {
        /** @var Detailing $detailing */
        $detailing = $request->user();

        $data = $request->validate([
            'carId' => ['required', 'integer'],
            'message' => ['nullable', 'string', 'max:500'],
        ]);

        $car = Car::query()->with('owner')->findOrFail((int) $data['carId']);
        if (! $car->owner_id || ! $car->owner) {
            abort(422, 'owner_required');
        }
        if ((int) ($car->detailing_id ?? 0) === (int) $detailing->id) {
            abort(422, 'already_linked');
        }

        $claim = $this->createDetailingToOwnerClaim($car, $detailing, trim((string) ($data['message'] ?? '')));

        return response()->json(ApiResources::claim($claim->fresh('owner')), $claim->wasRecentlyCreated ? 201 : 200);
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
            ->where('direction', 'owner_to_detailing')
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

    public function reviewByOwner(Request $request, $id)
    {
        /** @var Owner $owner */
        $owner = $request->user();
        $data = $request->validate([
            'status' => ['required', 'string', 'in:approved,rejected'],
        ]);

        $claim = CarClaim::query()
            ->where('owner_id', $owner->id)
            ->where('direction', 'detailing_to_owner')
            ->where('id', $id)
            ->firstOrFail();

        if (! in_array($claim->status, ['pending'], true)) {
            abort(422, 'already_reviewed');
        }

        $claim->status = $data['status'];
        $claim->reviewed_at = now();
        $claim->save();

        if ($data['status'] === 'approved') {
            $car = Car::query()->findOrFail($claim->car_id);
            if ((int) ($car->owner_id ?? 0) !== (int) $owner->id) {
                abort(422, 'owner_mismatch');
            }
            $car->detailing_id = $claim->detailing_id;
            $car->save();
        }

        $claim->load('owner');

        return response()->json(ApiResources::claim($claim));
    }

    public function createDetailingToOwnerClaim(Car $car, Detailing $detailing, string $message = ''): CarClaim
    {
        $claim = CarClaim::query()->firstOrCreate(
            [
                'car_id' => $car->id,
                'owner_id' => $car->owner_id,
                'detailing_id' => $detailing->id,
                'direction' => 'detailing_to_owner',
                'status' => 'pending',
            ],
            [
                'evidence' => [
                    'message' => $message,
                    'detailingName' => $detailing->name,
                    'detailingPhone' => $detailing->phone,
                ],
            ],
        );

        if ($claim->wasRecentlyCreated && $car->owner_id) {
            $carName = trim(implode(' ', array_filter([(string) $car->make, (string) $car->model]))) ?: 'ваш автомобиль';
            $this->notifications->createForOwner(
                (int) $car->owner_id,
                'Сервис хочет добавить авто',
                trim((string) $detailing->name) !== ''
                    ? $detailing->name.' хочет добавить '.$carName.' в свой кабинет.'
                    : 'Сервис хочет добавить '.$carName.' в свой кабинет.',
                'detailing_car_add_request',
                [
                    'claimId' => (string) $claim->id,
                    'carId' => (string) $car->id,
                    'detailingId' => (string) $detailing->id,
                    'requestType' => 'detailing_car_add',
                ],
            );
        }

        return $claim;
    }
}
