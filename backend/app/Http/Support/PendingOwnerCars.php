<?php

namespace App\Http\Support;

use App\Models\Car;
use App\Models\Owner;

final class PendingOwnerCars
{
    /**
     * Прикрепить карточки, переданные на эту почту до регистрации.
     */
    public static function claimForOwner(Owner $owner): void
    {
        $email = mb_strtolower(trim((string) $owner->email));
        if ($email === '') {
            return;
        }
        Car::query()
            ->whereNull('owner_id')
            ->whereRaw('lower(trim(pending_owner_email)) = ?', [$email])
            ->update([
                'owner_id' => $owner->id,
                'detailing_id' => null,
                'pending_owner_email' => null,
            ]);
    }
}
