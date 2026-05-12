<?php

namespace App\Services;

use App\Models\AppSetting;

class PushSettings
{
    public const KEY = 'push';

    private const DEFAULTS = [
        'enabled' => true,
        'owners_enabled' => true,
        'detailings_enabled' => true,
        'broadcast_enabled' => true,
    ];

    /**
     * @return array{enabled: bool, owners_enabled: bool, detailings_enabled: bool, broadcast_enabled: bool}
     */
    public function get(): array
    {
        $row = AppSetting::query()->where('key', self::KEY)->first();
        $value = is_array($row?->value) ? $row->value : [];

        return [
            'enabled' => $this->bool($value['enabled'] ?? self::DEFAULTS['enabled']),
            'owners_enabled' => $this->bool($value['owners_enabled'] ?? self::DEFAULTS['owners_enabled']),
            'detailings_enabled' => $this->bool($value['detailings_enabled'] ?? self::DEFAULTS['detailings_enabled']),
            'broadcast_enabled' => $this->bool($value['broadcast_enabled'] ?? self::DEFAULTS['broadcast_enabled']),
        ];
    }

    /**
     * @param array<string, mixed> $patch
     * @return array{enabled: bool, owners_enabled: bool, detailings_enabled: bool, broadcast_enabled: bool}
     */
    public function update(array $patch): array
    {
        $current = $this->get();
        foreach (array_keys(self::DEFAULTS) as $key) {
            if (array_key_exists($key, $patch)) {
                $current[$key] = $this->bool($patch[$key]);
            }
        }

        AppSetting::query()->updateOrCreate(
            ['key' => self::KEY],
            ['value' => $current]
        );

        return $current;
    }

    public function isEnabledForAudience(string $audience): bool
    {
        $settings = $this->get();
        if (! $settings['enabled']) {
            return false;
        }

        if ($audience === 'owners') {
            return $settings['owners_enabled'];
        }

        if ($audience === 'detailings') {
            return $settings['detailings_enabled'];
        }

        return $settings['owners_enabled'] || $settings['detailings_enabled'];
    }

    public function isBroadcastEnabled(): bool
    {
        $settings = $this->get();

        return $settings['enabled'] && $settings['broadcast_enabled'];
    }

    private function bool(mixed $value): bool
    {
        return filter_var($value, FILTER_VALIDATE_BOOLEAN);
    }
}
