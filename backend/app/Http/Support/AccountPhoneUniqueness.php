<?php

namespace App\Http\Support;

use App\Models\Detailing;
use App\Models\Owner;
use Illuminate\Validation\ValidationException;

/**
 * Один номер — один кабинет: владелец (owners) или партнёрский детейлинг (detailings, без служебных записей пула).
 * Нормализация совпадает с фронтом comparablePhoneDigitsRu.
 */
final class AccountPhoneUniqueness
{
    public const DUPLICATE_PHONE_MESSAGE = 'Этот номер телефона уже привязан к другому кабинету (владелец или сервис). Укажите другой или войдите в существующий аккаунт.';

    /**
     * 10 цифр национальной части РФ для сравнения (8→7, срез ведущей 7 страны, хвост 10 цифр).
     */
    public static function comparableDigitsRu(?string $raw): string
    {
        $d = preg_replace('/\D/u', '', (string) $raw);
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

    /**
     * @param  string  $phone  сырое значение поля телефона
     * @param  int|null  $exceptOwnerId  при смене телефона владельца
     * @param  int|null  $exceptDetailingId  при смене телефона детейлинга (партнёрского)
     */
    public static function assertUniqueAcrossAccounts(
        string $phone,
        ?int $exceptOwnerId = null,
        ?int $exceptDetailingId = null,
    ): void {
        $cmp = self::comparableDigitsRu($phone);
        if ($cmp === '') {
            return;
        }

        foreach (Owner::query()->cursor() as $o) {
            if ($exceptOwnerId !== null && (int) $o->id === $exceptOwnerId) {
                continue;
            }
            if (self::comparableDigitsRu($o->phone ?? '') === $cmp) {
                throw ValidationException::withMessages(['phone' => self::DUPLICATE_PHONE_MESSAGE]);
            }
        }

        foreach (Detailing::query()->where('email', '!=', PendingOwnerPool::DETAILING_EMAIL)->cursor() as $d) {
            if ($exceptDetailingId !== null && (int) $d->id === $exceptDetailingId) {
                continue;
            }
            if (self::comparableDigitsRu($d->phone ?? '') === $cmp) {
                throw ValidationException::withMessages(['phone' => self::DUPLICATE_PHONE_MESSAGE]);
            }
        }
    }
}
