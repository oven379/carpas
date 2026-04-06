<?php

namespace App\Http\Support;

/**
 * Те же правила, что и `normalizeGarageSlugInput` во фронте (format.js).
 */
final class GarageSlug
{
    /** @var array<string, string> */
    private const CYR_TO_LATIN = [
        'а' => 'a', 'б' => 'b', 'в' => 'v', 'г' => 'g', 'д' => 'd', 'е' => 'e', 'ё' => 'e',
        'ж' => 'zh', 'з' => 'z', 'и' => 'i', 'й' => 'y', 'к' => 'k', 'л' => 'l', 'м' => 'm',
        'н' => 'n', 'о' => 'o', 'п' => 'p', 'р' => 'r', 'с' => 's', 'т' => 't', 'у' => 'u',
        'ф' => 'f', 'х' => 'h', 'ц' => 'c', 'ч' => 'ch', 'ш' => 'sh', 'щ' => 'sch',
        'ъ' => '', 'ы' => 'y', 'ь' => '', 'э' => 'e', 'ю' => 'yu', 'я' => 'ya',
        'і' => 'i', 'ї' => 'yi', 'є' => 'e', 'ґ' => 'g',
    ];

    public static function normalize(string $raw): string
    {
        $s = self::translit(mb_strtolower(trim($raw)));
        $s = preg_replace('/\s+/u', '-', $s) ?? '';
        $s = preg_replace('/[^a-z0-9\-]/', '', $s) ?? '';
        $s = preg_replace('/-+/', '-', $s) ?? '';
        $s = trim($s, '-');
        if (mb_strlen($s) > 40) {
            $s = mb_substr($s, 0, 40);
            $s = rtrim($s, '-');
        }

        return $s;
    }

    private static function translit(string $s): string
    {
        $out = '';
        $len = mb_strlen($s);
        for ($i = 0; $i < $len; $i++) {
            $ch = mb_substr($s, $i, 1);
            $low = mb_strtolower($ch);
            $out .= array_key_exists($low, self::CYR_TO_LATIN) ? self::CYR_TO_LATIN[$low] : $ch;
        }

        return $out;
    }
}
