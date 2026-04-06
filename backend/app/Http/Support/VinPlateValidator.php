<?php

namespace App\Http\Support;

/**
 * Правила как на фронте (src/lib/format.js): VIN — 17 символов A–Z и 0–9;
 * контрольная цифра на 9-й позиции не проверяется. Госномер РФ — буквы АВЕКМНОРСТУХ.
 */
final class VinPlateValidator
{
    private const RU_PLATE_LETTERS = 'ABEKMHOPCTYX';

    private const PLATE_BASE_PATTERN = '/^[ABEKMHOPCTYX]\d{3}[ABEKMHOPCTYX]{2}$/';

    public static function normalizeVin(string $raw): string
    {
        $s = mb_strtoupper($raw, 'UTF-8');
        $out = '';
        $len = mb_strlen($s, 'UTF-8');
        for ($i = 0; $i < $len; $i++) {
            if (strlen($out) >= 17) {
                break;
            }
            $ch = mb_substr($s, $i, 1, 'UTF-8');
            if (in_array($ch, [' ', '-', '_', "\n", "\r", "\t"], true)) {
                continue;
            }
            if (strlen($ch) === 1 && ctype_digit($ch)) {
                $out .= $ch;
                continue;
            }
            if (strlen($ch) === 1 && $ch >= 'A' && $ch <= 'Z') {
                $out .= $ch;
            }
        }

        return $out;
    }

    public static function normalizePlateBase(string $raw): string
    {
        $out = '';
        $len = mb_strlen($raw, 'UTF-8');
        for ($i = 0; $i < $len; $i++) {
            if (strlen($out) >= 6) {
                break;
            }
            $ch = mb_substr($raw, $i, 1, 'UTF-8');
            $x = self::plateCharToLatinUpper($ch);
            if ($x === '') {
                continue;
            }
            if (strlen($x) === 1 && ctype_digit($x)) {
                $out .= $x;
                continue;
            }
            if (strlen($x) === 1 && $x >= 'A' && $x <= 'Z' && str_contains(self::RU_PLATE_LETTERS, $x)) {
                $out .= $x;
            }
        }

        return $out;
    }

    public static function normalizePlateRegion(string $raw): string
    {
        $digits = preg_replace('/\D/', '', $raw) ?? '';
        if ($digits === '') {
            return '';
        }
        $digits = substr($digits, 0, 3);
        $n = (int) $digits;

        return (string) max(0, min(999, $n));
    }

    public static function vinError(string $normalized): ?string
    {
        if ($normalized === '') {
            return null;
        }
        if (strlen($normalized) !== 17) {
            return 'VIN — ровно 17 символов латиницы (A–Z) и цифр либо оставьте поле пустым.';
        }

        return null;
    }

    public static function ruPlatePairError(string $plateBase, string $plateRegion): ?string
    {
        if ($plateBase === '' && $plateRegion === '') {
            return null;
        }
        if ($plateBase === '' || $plateRegion === '') {
            return 'Укажите основную часть номера и код региона (2–3 цифры) либо оставьте госномер пустым.';
        }
        if (! preg_match(self::PLATE_BASE_PATTERN, $plateBase)) {
            return 'Первая часть: буква из АВЕКМНОРСТУХ, три цифры, две буквы (например А777АА). Регион — во втором поле.';
        }
        $rl = strlen($plateRegion);
        if ($rl < 2 || $rl > 3) {
            return 'Регион — 2 или 3 цифры.';
        }

        return null;
    }

    private static function plateCharToLatinUpper(string $ch): string
    {
        static $map = [
            'А' => 'A', 'В' => 'B', 'Е' => 'E', 'К' => 'K', 'М' => 'M',
            'Н' => 'H', 'О' => 'O', 'Р' => 'P', 'С' => 'C', 'Т' => 'T',
            'У' => 'Y', 'Х' => 'X',
        ];
        $u = mb_strtoupper($ch, 'UTF-8');
        if (isset($map[$u])) {
            return $map[$u];
        }
        if (mb_strlen($u, 'UTF-8') === 1 && ctype_digit($u)) {
            return $u;
        }
        if (mb_strlen($u, 'UTF-8') === 1 && $u >= 'A' && $u <= 'Z') {
            return $u;
        }

        return '';
    }
}
