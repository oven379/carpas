<?php

namespace App\Http\Support;

use App\Models\Detailing;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Служебный кабинет детейлинга: карточки, переданные по email ещё незарегистрированному владельцу.
 */
final class PendingOwnerPool
{
    public const DETAILING_EMAIL = 'carpas-pending-owner-pool@system.invalid';

    public static function detailing(): Detailing
    {
        return Detailing::query()->firstOrCreate(
            ['email' => self::DETAILING_EMAIL],
            [
                'name' => 'Ожидание владельца (системный)',
                'password' => Hash::make(Str::random(64)),
                'is_personal' => false,
                'profile_completed' => true,
            ],
        );
    }

    public static function detailingId(): int
    {
        return (int) self::detailing()->id;
    }

    public static function isPoolDetailingId(int $id): bool
    {
        return $id === self::detailingId();
    }
}
