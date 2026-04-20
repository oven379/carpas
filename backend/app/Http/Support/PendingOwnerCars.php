<?php

namespace App\Http\Support;

use App\Models\Car;
use App\Models\Detailing;
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
        $pd = Detailing::query()->where('owner_id', $owner->id)->where('is_personal', true)->first();
        if (! $pd) {
            return;
        }
        Car::query()
            ->whereNull('owner_id')
            ->whereRaw('lower(trim(pending_owner_email)) = ?', [$email])
            ->update([
                'owner_id' => $owner->id,
                'detailing_id' => $pd->id,
                'pending_owner_email' => null,
            ]);
    }
}
