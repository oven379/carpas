<?php

namespace App\Http\Controllers\Api;

use App\Application\Admin\AdminCarDetail;
use App\Application\Admin\AdminCarsList;
use App\Application\Admin\AdminOwnerDetail;
use App\Application\Admin\AdminOwnersList;
use App\Application\Admin\AdminPartnerOperationalSummary;
use App\Http\Controllers\Controller;
use App\Models\Owner;

class AdminRegistryController extends Controller
{
    public function __construct(
        private readonly AdminOwnersList $ownersList,
        private readonly AdminOwnerDetail $ownerDetail,
        private readonly AdminCarsList $carsList,
        private readonly AdminCarDetail $carDetail,
        private readonly AdminPartnerOperationalSummary $partnerSummary,
    ) {}

    public function owners()
    {
        return response()->json(['items' => $this->ownersList->rows()]);
    }

    public function ownerShow(int $id)
    {
        $payload = $this->ownerDetail->forId($id);
        if ($payload === null) {
            return response()->json(['ok' => false, 'message' => 'Пользователь не найден.'], 404);
        }

        return response()->json($payload);
    }

    /** Повысить лимит авто в гараже владельца на 1 (не выше Owner::GARAGE_CAR_LIMIT_MAX). */
    public function increaseOwnerCarLimit(int $id)
    {
        $owner = Owner::query()->find($id);
        if ($owner === null) {
            return response()->json(['ok' => false, 'message' => 'Пользователь не найден.'], 404);
        }

        $current = max(1, (int) ($owner->garage_car_limit ?? 1));
        $next = min(Owner::GARAGE_CAR_LIMIT_MAX, $current + 1);
        $owner->garage_car_limit = $next;
        $owner->save();

        return response()->json([
            'ok' => true,
            'garageCarLimit' => $next,
            'max' => Owner::GARAGE_CAR_LIMIT_MAX,
        ]);
    }

    public function cars()
    {
        return response()->json(['items' => $this->carsList->rows()]);
    }

    public function carShow(int $id)
    {
        $payload = $this->carDetail->forId($id);
        if ($payload === null) {
            return response()->json(['ok' => false, 'message' => 'Автомобиль не найден.'], 404);
        }

        return response()->json($payload);
    }

    public function partnerSummary(int $id)
    {
        $payload = $this->partnerSummary->forDetailingId($id);
        if ($payload === null) {
            return response()->json(['ok' => false, 'message' => 'Партнёр не найден.'], 404);
        }

        return response()->json($payload);
    }
}
