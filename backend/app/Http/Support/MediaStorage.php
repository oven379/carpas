<?php

namespace App\Http\Support;

use Illuminate\Support\Facades\Storage;

final class MediaStorage
{
    public const DISK = 'public';

    public const MEDIA_PREFIX = 'media';

    public static function isDataUri(string $value): bool
    {
        return str_starts_with($value, 'data:') && str_contains($value, ';base64,');
    }

    public static function isHttpUrl(string $value): bool
    {
        return str_starts_with($value, 'http://') || str_starts_with($value, 'https://');
    }

    /** Нормализует абсолютный URL своего приложения к ключу media/… */
    public static function normalizeIncomingString(string $incoming): string
    {
        $incoming = trim($incoming);
        if (! self::isHttpUrl($incoming)) {
            return $incoming;
        }
        $path = parse_url($incoming, PHP_URL_PATH) ?? '';
        if (preg_match('#/storage/(media/.+)$#', $path, $m)) {
            return $m[1];
        }

        return $incoming;
    }

    /**
     * Значение из БД → абсолютный URL для JSON (или data URI / внешний URL как есть).
     */
    public static function publicUrl(?string $stored): string
    {
        if ($stored === null || $stored === '') {
            return '';
        }
        $stored = trim((string) $stored);
        if (self::isHttpUrl($stored)) {
            return $stored;
        }
        if (self::isDataUri($stored)) {
            return $stored;
        }
        $key = self::toDiskKey($stored);
        if ($key !== null) {
            return Storage::disk(self::DISK)->url($key);
        }

        return $stored;
    }

    public static function toDiskKey(?string $stored): ?string
    {
        if ($stored === null || $stored === '') {
            return null;
        }
        $s = trim((string) $stored);
        if (self::isDataUri($s) || self::isHttpUrl($s)) {
            return null;
        }
        if (str_starts_with($s, '/storage/')) {
            $s = substr($s, strlen('/storage/'));
        } elseif (str_starts_with($s, 'storage/')) {
            $s = substr($s, strlen('storage/'));
        }
        if (str_starts_with($s, self::MEDIA_PREFIX.'/')) {
            return $s;
        }

        return null;
    }

    /**
     * @param  string|null  $incoming  data URI, http(s), media/…, /storage/media/…
     * @param  string|null  $previous  предыдущее значение из БД (для удаления файла)
     * @return string|null  строка для БД: ключ media/…, внешний URL или null
     */
    public static function ingestScalar(?string $incoming, ?string $previous, string $pathPrefix, string $basename): ?string
    {
        if ($incoming === null) {
            self::deleteStoredFileIfManaged($previous);

            return null;
        }
        $incoming = self::normalizeIncomingString(is_string($incoming) ? $incoming : '');
        if ($incoming === '') {
            self::deleteStoredFileIfManaged($previous);

            return null;
        }

        if (self::isHttpUrl($incoming)) {
            self::deleteStoredFileIfManaged($previous);

            return $incoming;
        }

        if (! self::isDataUri($incoming)) {
            $key = self::toDiskKey($incoming);
            if ($key !== null) {
                $prevKey = self::toDiskKey($previous);
                if ($prevKey !== null && $prevKey !== $key) {
                    self::deleteStoredFileIfManaged($previous);
                }

                return $key;
            }

            return $incoming;
        }

        $decoded = self::decodeDataUri($incoming);
        if ($decoded === null) {
            return $previous;
        }

        $max = (int) config('media.max_upload_bytes', 12 * 1024 * 1024);
        if (strlen($decoded['binary']) > $max) {
            return $previous;
        }

        $path = self::MEDIA_PREFIX.'/'.trim($pathPrefix, '/').'/'.$basename.'.'.$decoded['ext'];
        $prevKey = self::toDiskKey($previous);
        if ($prevKey !== null && $prevKey !== $path) {
            self::deleteStoredFileIfManaged($previous);
        }

        Storage::disk(self::DISK)->put($path, $decoded['binary']);

        return $path;
    }

    /**
     * @param  list<string>  $incoming
     * @param  list<string>|null  $previous
     * @return list<string>
     */
    public static function ingestWashPhotoList(array $incoming, ?array $previous, int $carId): array
    {
        $previous = array_values(array_filter(
            is_array($previous) ? $previous : [],
            fn ($x) => is_string($x) && $x !== '',
        ));
        $incoming = array_slice(array_values(array_filter(
            $incoming,
            fn ($x) => is_string($x) && trim((string) $x) !== '',
        )), 0, 12);

        $out = [];
        foreach ($incoming as $i => $str) {
            $str = self::normalizeIncomingString(trim((string) $str));
            $prevOne = $previous[$i] ?? null;
            $stored = self::ingestScalar(
                $str,
                is_string($prevOne) ? $prevOne : null,
                'cars/'.$carId.'/wash',
                'w'.$i.'_'.str_replace('.', '', uniqid('', true)),
            );
            if ($stored !== null && $stored !== '') {
                $out[] = $stored;
            }
        }

        $newKeys = array_filter(array_map(fn ($s) => self::toDiskKey($s), $out));
        for ($j = 0; $j < count($previous); $j++) {
            $pk = self::toDiskKey(is_string($previous[$j]) ? $previous[$j] : null);
            if ($pk && ! in_array($pk, $newKeys, true)) {
                Storage::disk(self::DISK)->delete($pk);
            }
        }

        return $out;
    }

    /**
     * @return array{binary: string, ext: string, mime: string}|null
     */
    public static function decodeDataUri(string $dataUri): ?array
    {
        if (! preg_match('#^data:([^;]+);base64,(.+)$#s', $dataUri, $m)) {
            return null;
        }
        $mime = strtolower(trim(explode(';', $m[1])[0]));
        $raw = base64_decode($m[2], true);
        if ($raw === false) {
            return null;
        }
        $ext = match ($mime) {
            'image/jpeg', 'image/jpg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            'image/gif' => 'gif',
            'image/svg+xml' => 'svg',
            'application/pdf' => 'pdf',
            default => null,
        };
        if ($ext === null) {
            return null;
        }

        return ['binary' => $raw, 'ext' => $ext, 'mime' => $mime];
    }

    public static function deleteStoredFileIfManaged(?string $stored): void
    {
        $key = self::toDiskKey($stored);
        if ($key && Storage::disk(self::DISK)->exists($key)) {
            Storage::disk(self::DISK)->delete($key);
        }
    }

    public static function deleteCarMediaDirectory(int $carId): void
    {
        Storage::disk(self::DISK)->deleteDirectory(self::MEDIA_PREFIX.'/cars/'.$carId);
        Storage::disk(self::DISK)->deleteDirectory(self::MEDIA_PREFIX.'/docs/car_'.$carId);
    }

    /**
     * Сохранить бинарные данные по относительному пути под media/ (для команды миграции).
     */
    public static function storeBinaryAt(string $relativePath, string $binary): string
    {
        $path = self::MEDIA_PREFIX.'/'.ltrim($relativePath, '/');
        Storage::disk(self::DISK)->put($path, $binary);

        return $path;
    }
}
