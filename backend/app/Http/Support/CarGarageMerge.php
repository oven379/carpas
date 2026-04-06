<?php

namespace App\Http\Support;

use App\Models\Car;
use App\Models\CarDoc;
use App\Models\CarEvent;
use App\Models\Owner;
use Illuminate\Support\Facades\DB;

/**
 * Слияние «личного гаража» с карточкой сервиса: один VIN — одна запись cars после привязки.
 */
final class CarGarageMerge
{
    public static function normCity(?string $s): string
    {
        $t = preg_replace('/\s+/u', ' ', trim((string) $s));

        return mb_strtolower((string) $t, 'UTF-8');
    }

    /** Как на фронте (compact): совпал год или город с карточкой. */
    public static function verifyCompactEvidence(Car $car, string $year, string $city): bool
    {
        $year = trim($year);
        $city = trim($city);
        $yearOk = $year !== '' && (string) ($car->year ?? '') === $year;
        $c1 = self::normCity($city);
        $c2 = self::normCity($car->city ?? '');
        $cityOk = $c1 !== '' && $c2 !== '' && $c1 === $c2;

        return $yearOk || $cityOk;
    }

    /**
     * После привязки владельца к карточке сервиса — сливаем дубликаты с тем же VIN из личного детейлинга владельца.
     */
    public static function mergeOwnerPersonalDuplicatesIntoCar(Car $target, Owner $owner): void
    {
        $vin = mb_strtolower(trim((string) $target->vin), 'UTF-8');
        if ($vin === '') {
            return;
        }

        $dups = Car::query()
            ->where('owner_id', $owner->id)
            ->where('id', '!=', $target->id)
            ->whereRaw('lower(trim(vin)) = ?', [$vin])
            ->with('detailing')
            ->get();

        foreach ($dups as $dup) {
            if (! $dup->detailing || ! $dup->detailing->is_personal) {
                continue;
            }
            DB::transaction(function () use ($dup, $target) {
                CarEvent::query()->where('car_id', $dup->id)->update([
                    'car_id' => $target->id,
                    'detailing_id' => $target->detailing_id,
                ]);
                CarDoc::query()->where('car_id', $dup->id)->update([
                    'car_id' => $target->id,
                    'detailing_id' => $target->detailing_id,
                ]);
                self::fillEmptyScalars($target, $dup);
                Car::withoutEvents(static fn () => $dup->delete());
            });
            $target->refresh();
        }
    }

    private static function fillEmptyScalars(Car $into, Car $from): void
    {
        $scalar = ['make', 'model', 'color', 'city', 'plate', 'plate_region'];
        foreach ($scalar as $f) {
            if (trim((string) $into->{$f}) === '' && trim((string) $from->{$f}) !== '') {
                $into->{$f} = $from->{$f};
            }
        }
        if (trim((string) $into->hero) === '' && trim((string) $from->hero) !== '') {
            $into->hero = $from->hero;
        }
        if ((int) $into->mileage_km <= 0 && (int) $from->mileage_km > 0) {
            $into->mileage_km = $from->mileage_km;
        }
        if ($into->year === null && $from->year !== null) {
            $into->year = $from->year;
        }
        $into->save();
    }

    /**
     * Карточка из личного гаража (личный детейлинг) переносится в кабинет партнёрского сервиса.
     */
    public static function attachPersonalGarageCarToDetailing(Car $car, int $studioDetailingId): void
    {
        DB::transaction(function () use ($car, $studioDetailingId) {
            $car->detailing_id = $studioDetailingId;
            $car->save();
            CarEvent::query()->where('car_id', $car->id)->update(['detailing_id' => $studioDetailingId]);
            CarDoc::query()->where('car_id', $car->id)->update(['detailing_id' => $studioDetailingId]);
        });
    }
}
