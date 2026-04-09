<?php

namespace App\Http\Support;

/** Нормализация JSON `careTips`: { important, tips: string[] } для car_events. */
final class CareTips
{
    /** @param  mixed  $raw  JSON body `careTips` */
    public static function normalize(mixed $raw): ?array
    {
        if (! is_array($raw)) {
            return null;
        }
        $tipsIn = $raw['tips'] ?? [];
        if (! is_array($tipsIn)) {
            $tipsIn = [];
        }
        $tips = [];
        foreach ($tipsIn as $t) {
            $one = trim((string) $t);
            if ($one !== '') {
                $tips[] = $one;
            }
        }
        $important = trim((string) ($raw['important'] ?? ''));
        $tips = array_values($tips);
        if ($important === '' && $tips === []) {
            return null;
        }

        return [
            'important' => $important,
            'tips' => $tips,
        ];
    }
}
