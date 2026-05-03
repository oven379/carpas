<?php

namespace App\Http\Controllers\Api;

use App\Application\Admin\AdminCarDetail;
use App\Application\Admin\AdminCarsList;
use App\Application\Admin\AdminOwnerDetail;
use App\Application\Admin\AdminOwnersList;
use App\Application\Admin\AdminPartnerOperationalSummary;
use App\Http\Controllers\Controller;

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
