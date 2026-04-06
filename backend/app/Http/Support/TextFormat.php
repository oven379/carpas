<?php

namespace App\Http\Support;

/**
 * Нормализация отображаемых имён (кириллица и латиница): первая буква строки — в верхнем регистре.
 */
final class TextFormat
{
    public static function mbUcfirst(?string $value): string
    {
        $s = trim((string) $value);
        if ($s === '') {
            return '';
        }
        $enc = 'UTF-8';
        $first = mb_strtoupper(mb_substr($s, 0, 1, $enc), $enc);
        $rest = mb_substr($s, 1, null, $enc);

        return $first.$rest;
    }
}
