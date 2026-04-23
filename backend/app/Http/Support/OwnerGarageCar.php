<?php

namespace App\Http\Support;

use App\Models\Car;

/**
 * Авто в кабинете владельца без привязки к партнёрскому детейлингу.
 */
final class OwnerGarageCar
{
    public static function isGarageOnly(Car $car): bool
    {
        return $car->owner_id !== null && $car->detailing_id === null;
    }
}
