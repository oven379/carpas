<?php

namespace App\Application\Admin;

use App\Models\Owner;

final class AdminOwnersList
{
    /**
     * @return list<array<string, mixed>>
     */
    public function rows(): array
    {
        return Owner::query()
            ->select(['id', 'email', 'name', 'phone', 'garage_slug', 'is_premium', 'created_at'])
            ->withCount(['cars', 'supportTickets'])
            ->orderByDesc('id')
            ->limit(400)
            ->get()
            ->map(fn (Owner $o) => [
                'id' => (string) $o->id,
                'email' => $o->email,
                'name' => (string) ($o->name ?? ''),
                'phone' => (string) ($o->phone ?? ''),
                'garageSlug' => (string) ($o->garage_slug ?? ''),
                'isPremium' => (bool) $o->is_premium,
                'createdAt' => optional($o->created_at)->toISOString(),
                'carsCount' => (int) ($o->cars_count ?? 0),
                'supportTicketsCount' => (int) ($o->support_tickets_count ?? 0),
            ])
            ->values()
            ->all();
    }
}
