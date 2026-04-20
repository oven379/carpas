<?php

namespace App\Http\Support;

use App\Models\Detailing;
use Illuminate\Support\Str;

class DetailingPublicSlug
{
    public static function baseFromName(string $name): string
    {
        $s = Str::slug(trim($name), '-');
        if ($s === '') {
            $s = 'service';
        }

        return self::clampLength($s, 180);
    }

    public static function assignUnique(Detailing $d, ?string $nameSource = null, bool $persist = true): string
    {
        $name = $nameSource ?? (string) $d->name;
        $base = self::baseFromName($name);
        $slug = self::firstAvailable($base, $d->exists ? (int) $d->id : null);
        $d->public_slug = $slug;
        if ($persist) {
            $d->saveQuietly();
        }

        return $slug;
    }

    public static function firstAvailable(string $base, ?int $exceptId): string
    {
        $candidate = $base;
        $n = 2;
        while (self::isTaken($candidate, $exceptId)) {
            $suffix = '-'.$n;
            $candidate = self::clampLength(substr($base, 0, 180 - strlen($suffix)).$suffix, 180);
            $n++;
        }

        return $candidate;
    }

    public static function isTaken(string $slug, ?int $exceptId): bool
    {
        $q = Detailing::query()->where('public_slug', $slug);
        if ($exceptId !== null) {
            $q->where('id', '!=', $exceptId);
        }

        return $q->exists();
    }

    protected static function clampLength(string $s, int $maxBytes): string
    {
        if (strlen($s) <= $maxBytes) {
            return $s;
        }

        return substr($s, 0, $maxBytes);
    }
}
