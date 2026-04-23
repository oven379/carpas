<?php

namespace App\Http\Support;

use App\Models\Car;
use App\Models\CarEvent;
use App\Models\Detailing;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * Доступ кабинета детейлинга к карточке: своя запись, визиты или «сетевая» карточка без владельца (не пул ожидания).
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

    /**
     * Карточка без владельца (кроме пула «ожидание регистрации»): любой верифицированный партнёр может открыть и вести визиты.
     */
    public static function isUnownedNetworkCar(Car $car): bool
    {
        if ($car->owner_id !== null) {
            return false;
        }
        if ($car->detailing_id !== null && PendingOwnerPool::isPoolDetailingId((int) $car->detailing_id)) {
            return false;
        }

        return true;
    }

    /** Просмотр карточки, история визитов, создание визита. */
    public static function detailingMayViewCar(Detailing $d, Car $car): bool
    {
        return self::detailingOwnsCarRow($d, $car)
            || self::detailingHasServiceHistoryForCar($d, $car)
            || self::isUnownedNetworkCar($car);
    }

    /** Редактирование полей карточки (PATCH /cars/{id}). */
    public static function detailingMayEditCarScalars(Detailing $d, Car $car): bool
    {
        return self::detailingOwnsCarRow($d, $car) || self::detailingHasServiceHistoryForCar($d, $car);
    }

    public static function findCarForDetailingOrFail(Detailing $d, int $carId): Car
    {
        $car = Car::query()->with('owner')->find($carId);
        if (! $car instanceof Car) {
            throw (new ModelNotFoundException)->setModel(Car::class, [$carId]);
        }
        if (! self::detailingMayViewCar($d, $car)) {
            throw (new ModelNotFoundException)->setModel(Car::class, [$carId]);
        }

        return $car;
    }

    public static function findCarForDetailingEditableOrFail(Detailing $d, int $carId): Car
    {
        $car = Car::query()->with('owner')->find($carId);
        if (! $car instanceof Car) {
            throw (new ModelNotFoundException)->setModel(Car::class, [$carId]);
        }
        if (! self::detailingMayEditCarScalars($d, $car)) {
            throw (new ModelNotFoundException)->setModel(Car::class, [$carId]);
        }

        return $car;
    }
}
