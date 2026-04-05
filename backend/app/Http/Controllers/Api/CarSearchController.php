<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Support\ApiResources;
use App\Models\Car;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class CarSearchController extends Controller
{
    /** 10 цифр номера для сравнения (как после +7 на фронте). */
    private static function comparablePhoneDigits(?string $raw): string
    {
        $d = preg_replace('/\D+/', '', (string) $raw);
        if ($d === '') {
            return '';
        }
        if (str_starts_with($d, '8')) {
            $d = '7'.substr($d, 1);
        }
        if (str_starts_with($d, '7') && strlen($d) === 11) {
            $d = substr($d, 1);
        }
        if (strlen($d) > 10) {
            $d = substr($d, -10);
        }

        return $d;
    }

    private static function nonPersonalCarsQuery()
    {
        return Car::query()
            ->whereHas('detailing', fn ($q) => $q->where('is_personal', false))
            ->with(['detailing', 'owner']);
    }

    private static function mapCarRows(Collection $cars)
    {
        return $cars
            ->unique('id')
            ->sortByDesc('updated_at')
            ->take(20)
            ->values()
            ->map(function (Car $c) {
                $row = ApiResources::car($c);
                $row['detailingName'] = $c->detailing?->name ?? '';

                return $row;
            });
    }

    /**
     * Кабинет партнёра: поиск карточек до создания дубля — по VIN и/или паре телефон + почта клиента.
     */
    public function duplicateCandidatesForDetailing(Request $request)
    {
        $vin = mb_strtolower(trim((string) $request->query('vin', '')));
        $phoneRaw = trim((string) $request->query('clientPhone', ''));
        $email = mb_strtolower(trim((string) $request->query('clientEmail', '')));

        $wantVin = $vin !== '';
        $phoneCmp = self::comparablePhoneDigits($phoneRaw);
        $wantContact = $email !== '' && $phoneCmp !== '';

        if (! $wantVin && ! $wantContact) {
            return response()->json([]);
        }

        $found = collect();

        if ($wantVin) {
            $found = $found->merge(
                self::nonPersonalCarsQuery()
                    ->whereRaw('lower(trim(vin)) = ?', [$vin])
                    ->orderByDesc('updated_at')
                    ->limit(50)
                    ->get(),
            );
        }

        if ($wantContact) {
            $candidates = self::nonPersonalCarsQuery()
                ->whereRaw('lower(trim(client_email)) = ?', [$email])
                ->orderByDesc('updated_at')
                ->limit(80)
                ->get();
            foreach ($candidates as $c) {
                if (self::comparablePhoneDigits($c->client_phone) === $phoneCmp) {
                    $found->push($c);
                }
            }
        }

        return response()->json(self::mapCarRows($found));
    }

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
