<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Support\ApiResources;
use App\Models\Car;
use Illuminate\Http\Request;

class CarSearchController extends Controller
{
    public function byVin(Request $request)
    {
        $vin = mb_strtolower(trim((string) $request->query('vin', '')));
        if ($vin === '') {
            return response()->json([]);
        }

        $cars = Car::query()
            ->whereRaw('lower(trim(vin)) = ?', [$vin])
            ->whereHas('detailing', fn ($q) => $q->where('is_personal', false))
            ->with(['detailing', 'owner'])
            ->orderByDesc('updated_at')
            ->limit(50)
            ->get();

        return response()->json(
            $cars->map(function (Car $c) {
                $row = ApiResources::car($c);
                $row['detailingName'] = $c->detailing?->name ?? '';

                return $row;
            })->values(),
        );
    }

    public function byPlate(Request $request)
    {
        $plate = mb_strtolower(trim((string) $request->query('plate', '')));
        $region = mb_strtolower(trim((string) $request->query('plateRegion', '')));
        if ($plate === '') {
            return response()->json([]);
        }

        $cars = Car::query()
            ->whereRaw('lower(trim(plate)) = ?', [$plate])
            ->whereRaw('lower(trim(plate_region)) = ?', [$region])
            ->whereHas('detailing', fn ($q) => $q->where('is_personal', false))
            ->with(['detailing', 'owner'])
            ->orderByDesc('updated_at')
            ->limit(50)
            ->get();

        return response()->json(
            $cars->map(function (Car $c) {
                $row = ApiResources::car($c);
                $row['detailingName'] = $c->detailing?->name ?? '';

                return $row;
            })->values(),
        );
    }
}
