<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Support\ApiResources;
use App\Http\Support\VinPlateValidator;
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
                $row['vinHitFromOwnerGarage'] = (bool) ($c->detailing?->is_personal ?? false);

                return $row;
            });
    }

    /**
     * Карточки с совпадением нормализованного телефона (client_phone, owner_phone на авто, phone владельца в ЛК).
     *
     * @param  bool  $includePersonalGarageCars  Для поиска дублей в кабинете партнёра — true; для заявки владельца по авто в сервисе — только false (без личных гаражей).
     */
    private static function carsMatchingPhoneDigits(string $phoneCmp, bool $includePersonalGarageCars = true): Collection
    {
        if (strlen($phoneCmp) < 10) {
            return collect();
        }
        $tail = substr($phoneCmp, -7);
        $found = collect();

        $pushMatches = function (Collection $batch) use (&$found, $phoneCmp) {
            foreach ($batch as $c) {
                $c->loadMissing('owner');
                if (self::comparablePhoneDigits($c->client_phone) === $phoneCmp) {
                    $found->push($c);

                    continue;
                }
                if (self::comparablePhoneDigits($c->owner_phone) === $phoneCmp) {
                    $found->push($c);

                    continue;
                }
                if ($c->owner && self::comparablePhoneDigits($c->owner->phone) === $phoneCmp) {
                    $found->push($c);
                }
            }
        };

        $narrowAndLoad = function ($base) use ($tail) {
            return $base
                ->where(function ($q) use ($tail) {
                    $q->where('client_phone', 'like', '%'.$tail.'%')
                        ->orWhere('owner_phone', 'like', '%'.$tail.'%')
                        ->orWhereHas('owner', function ($oq) use ($tail) {
                            $oq->where('phone', 'like', '%'.$tail.'%');
                        });
                })
                ->with(['detailing', 'owner'])
                ->orderByDesc('updated_at')
                ->limit(150)
                ->get();
        };

        $pushMatches($narrowAndLoad(self::nonPersonalCarsQuery()));
        if ($includePersonalGarageCars) {
            $pushMatches($narrowAndLoad(
                Car::query()->whereHas('detailing', fn ($q) => $q->where('is_personal', true)),
            ));
        }

        return $found;
    }

    /**
     * Кабинет владельца: найти карточки партнёрских сервисов по VIN, телефону или e-mail клиента в карточке.
     */
    public function forOwnerClaim(Request $request)
    {
        $raw = trim((string) $request->query('q', ''));
        if ($raw === '') {
            return response()->json([]);
        }

        if (str_contains($raw, '@')) {
            $email = mb_strtolower($raw);
            $cars = self::nonPersonalCarsQuery()
                ->whereRaw('lower(trim(client_email)) = ?', [$email])
                ->orderByDesc('updated_at')
                ->limit(50)
                ->get();

            return response()->json(self::mapCarRows($cars));
        }

        $vinNorm = VinPlateValidator::normalizeVin($raw);
        if ($vinNorm !== '' && VinPlateValidator::vinError($vinNorm) === null) {
            $vin = mb_strtolower($vinNorm, 'UTF-8');
            $cars = Car::query()
                ->whereRaw('lower(trim(vin)) = ?', [$vin])
                ->whereHas('detailing', fn ($q) => $q->where('is_personal', false))
                ->with(['detailing', 'owner'])
                ->orderByDesc('updated_at')
                ->limit(50)
                ->get();

            return response()->json(self::mapCarRows($cars));
        }

        $phoneCmp = self::comparablePhoneDigits($raw);
        if (strlen($phoneCmp) >= 10) {
            return response()->json(self::mapCarRows(self::carsMatchingPhoneDigits($phoneCmp, false)));
        }

        return response()->json([]);
    }

    /**
     * Кабинет партнёра: поиск карточек до создания дубля — по VIN, по телефону (как запасной фактор), и/или паре телефон + почта клиента.
     */
    public function duplicateCandidatesForDetailing(Request $request)
    {
        $vinNorm = VinPlateValidator::normalizeVin(trim((string) $request->query('vin', '')));
        $vin = mb_strtolower($vinNorm, 'UTF-8');
        $phoneRaw = trim((string) $request->query('clientPhone', ''));
        $email = mb_strtolower(trim((string) $request->query('clientEmail', '')));

        $wantVin = $vin !== '';
        $phoneCmp = self::comparablePhoneDigits($phoneRaw);
        $wantContact = $email !== '' && $phoneCmp !== '';
        $wantPhoneSolo = $phoneCmp !== '' && strlen($phoneCmp) >= 10 && $email === '' && ! $wantVin;

        if (! $wantVin && ! $wantContact && ! $wantPhoneSolo) {
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
            $found = $found->merge(
                Car::query()
                    ->whereHas('detailing', fn ($q) => $q->where('is_personal', true))
                    ->whereRaw('lower(trim(vin)) = ?', [$vin])
                    ->with(['detailing', 'owner'])
                    ->orderByDesc('updated_at')
                    ->limit(50)
                    ->get(),
            );
        }

        if ($wantPhoneSolo) {
            $found = $found->merge(self::carsMatchingPhoneDigits($phoneCmp));
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
        $vinNorm = VinPlateValidator::normalizeVin(trim((string) $request->query('vin', '')));
        $vin = mb_strtolower($vinNorm, 'UTF-8');
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
