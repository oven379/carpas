<?php

namespace App\Http\Support;

use App\Models\Car;
use App\Models\CarEvent;
use App\Models\Detailing;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * Доступ кабинета детейлинга к карточке: своя запись или есть сервисные визиты по этому car_id.
 */
final class DetailingCarAccess
{
    public static function detailingOwnsCarRow(Detailing $d, Car $car): bool
    {
        return (int) $car->detailing_id === (int) $d->id;
    }

    public static function detailingHasServiceHistoryForCar(Detailing $d, Car $car): bool
    {
        return CarEvent::query()
            ->where('car_id', $car->id)
            ->where('detailing_id', $d->id)
            ->where('source', 'service')
            ->exists();
    }

    public static function detailingMayAccessCar(Detailing $d, Car $car): bool
    {
        return self::detailingOwnsCarRow($d, $car) || self::detailingHasServiceHistoryForCar($d, $car);
    }

    public static function findCarForDetailingOrFail(Detailing $d, int $carId): Car
    {
        $car = Car::query()->with('owner')->find($carId);
        if (! $car instanceof Car) {
            throw (new ModelNotFoundException)->setModel(Car::class, [$carId]);
        }
        if (! self::detailingMayAccessCar($d, $car)) {
            throw (new ModelNotFoundException)->setModel(Car::class, [$carId]);
        }

        return $car;
    }
}
