<?php

namespace App\Http\Support;

use App\Models\Car;
use App\Models\CarEvent;

class CarMileageSync
{
    /** Максимальный пробег среди финальных событий карточки (черновики не учитываются). */
    public static function maxMileageAmongFinalizedEvents(int $carId): int
    {
        $max = 0;
        $rows = CarEvent::query()
            ->where('car_id', $carId)
            ->where('is_draft', false)
            ->get(['mileage_km']);
        foreach ($rows as $r) {
            $m = (int) ($r->mileage_km ?? 0);
            if ($m > $max) {
                $max = $m;
            }
        }

        return $max;
    }

    /**
     * Подтянуть пробег в строке авто к факту по истории (не уменьшаем карточку).
     */
    public static function bumpCarMileageFromEvents(Car $car): void
    {
        $fromEvents = self::maxMileageAmongFinalizedEvents((int) $car->id);
        $current = (int) ($car->mileage_km ?? 0);
        $next = max($current, $fromEvents);
        if ($next !== $current) {
            $car->mileage_km = $next;
            $car->save();
        }
    }

    /**
     * Минимально допустимый пробег для нового/обновляёмого визита (остальные финальные + карточка).
     *
     * @param  int|null  $exceptEventId  id события, которое исключаем (при обновлении)
     */
    public static function minAllowedMileageForVisit(Car $car, ?int $exceptEventId = null): int
    {
        $carKm = (int) ($car->mileage_km ?? 0);
        $q = CarEvent::query()
            ->where('car_id', $car->id)
            ->where('is_draft', false);
        if ($exceptEventId !== null) {
            $q->where('id', '!=', $exceptEventId);
        }
        $maxOther = (int) $q->max('mileage_km');

        return max($carKm, $maxOther);
    }

    /**
     * После удаления визита: уменьшить пробег в карточке, если он опирался на удалённый максимум.
     */
    public static function refreshCarMileageAfterEventDeleted(Car $car): void
    {
        $peak = self::maxMileageAmongFinalizedEvents((int) $car->id);
        $current = (int) ($car->mileage_km ?? 0);
        if ($peak > 0 && $peak < $current) {
            $car->mileage_km = $peak;
            $car->save();
        }
    }
}
