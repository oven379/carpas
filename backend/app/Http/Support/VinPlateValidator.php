<?php

namespace App\Http\Support;

/**
 * Правила как на фронте (src/lib/format.js): VIN ISO 3779 + контрольная цифра;
 * госномер РФ — только буквы АВЕКМНОРСТУХ (латиница на табличке).
 */
final class VinPlateValidator
{
    private const RU_PLATE_LETTERS = 'ABEKMHOPCTYX';

    private const PLATE_BASE_PATTERN = '/^[ABEKMHOPCTYX]\d{3}[ABEKMHOPCTYX]{2}$/';

    /** @var array<string, int> */
    private const VIN_LETTER_VALUES = [
        'A' => 1, 'B' => 2, 'C' => 3, 'D' => 4, 'E' => 5, 'F' => 6, 'G' => 7, 'H' => 8,
        'J' => 1, 'K' => 2, 'L' => 3, 'M' => 4, 'N' => 5, 'P' => 7, 'R' => 9,
        'S' => 2, 'T' => 3, 'U' => 4, 'V' => 5, 'W' => 6, 'X' => 7, 'Y' => 8, 'Z' => 9,
    ];

    private const VIN_WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

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
            if ($ch === 'I' || $ch === 'O' || $ch === 'Q') {
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
            return 'VIN — ровно 17 символов латиницы и цифр (без I, O, Q) либо оставьте поле пустым.';
        }
        if (! self::vinCheckDigitValid($normalized)) {
            return '9-й символ VIN — контрольный: он не совпадает с расчётом по стандарту. Проверьте опечатки. Буквы I, O, Q в VIN не используются.';
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
            return 'Формат как у легкового номера РФ: буква из набора А В Е К М Н О Р С Т У Х, три цифры, две буквы из того же набора. Другие латинские буквы на таких номерах не используются.';
        }
        $rl = strlen($plateRegion);
        if ($rl < 2 || $rl > 3) {
            return 'Код региона — 2 или 3 цифры (как на табличке справа).';
        }

        return null;
    }

    public static function vinCheckDigitValid(string $normalized17): bool
    {
        $v = strtoupper($normalized17);
        if (strlen($v) !== 17) {
            return false;
        }
        $sum = 0;
        for ($i = 0; $i < 17; $i++) {
            $c = $v[$i];
            if ($c >= '0' && $c <= '9') {
                $n = ord($c) - 48;
            } else {
                $n = self::VIN_LETTER_VALUES[$c] ?? null;
            }
            if ($n === null) {
                return false;
            }
            $sum += $n * self::VIN_WEIGHTS[$i];
        }
        $mod = $sum % 11;
        $expected = $mod === 10 ? 'X' : (string) $mod;

        return $v[8] === $expected;
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
