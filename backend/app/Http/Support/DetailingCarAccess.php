<?php

namespace App\Http\Support;

use App\Models\Car;
use App\Models\CarEvent;
use App\Models\Detailing;
use Illuminate\Database\Eloquent\Builder;
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

    public static function cabinetCarsQuery(Detailing $d): Builder
    {
        return Car::query()->where(function (Builder $query) use ($d) {
            $query->where('detailing_id', $d->id)
                ->orWhereHas('events', fn (Builder $events) => $events
                    ->where('detailing_id', $d->id)
                    ->where('source', 'service'))
                ->orWhere(fn (Builder $cars) => $cars
                    ->whereNull('owner_id')
                    ->whereDoesntHave('detailing', fn (Builder $detailings) => $detailings
                        ->where('email', PendingOwnerPool::DETAILING_EMAIL))
                    ->whereHas('detailingsWithCabinetLink', fn (Builder $detailings) => $detailings->whereKey($d->id)));
        });
    }

    public static function isPendingOwnerCar(Car $car): bool
    {
        return $car->detailing?->email === PendingOwnerPool::DETAILING_EMAIL;
    }

    /**
     * Карточка без владельца (кроме пула «ожидание регистрации»): любой верифицированный партнёр может открыть и вести визиты.
     */
    public static function isUnownedNetworkCar(Car $car): bool
    {
        return $car->owner_id === null && ! self::isPendingOwnerCar($car);
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
