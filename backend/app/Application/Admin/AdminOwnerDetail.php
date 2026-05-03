<?php

namespace App\Application\Admin;

use App\Models\Car;
use App\Models\CarDoc;
use App\Models\CarEvent;
use App\Models\Owner;
use App\Models\SupportTicket;

final class AdminOwnerDetail
{
    /**
     * @return array<string, mixed>|null
     */
    public function forId(int $id): ?array
    {
        $o = Owner::query()->find($id);
        if ($o === null) {
            return null;
        }

        $carIds = Car::query()->where('owner_id', $id)->pluck('id')->all();
        $eventsTotal = $carIds === [] ? 0 : CarEvent::query()->whereIn('car_id', $carIds)->count();
        $docsTotal = $carIds === [] ? 0 : CarDoc::query()->whereIn('car_id', $carIds)->count();

        $supportTotal = SupportTicket::query()->where('owner_id', $id)->count();
        $supportAwaitingAdmin = SupportTicket::query()
            ->where('owner_id', $id)
            ->where(function ($q) {
                $q->whereNull('admin_reply')->orWhere('admin_reply', '');
            })
            ->count();

        return [
            'owner' => [
                'id' => (string) $o->id,
                'email' => $o->email,
                'name' => (string) ($o->name ?? ''),
                'phone' => (string) ($o->phone ?? ''),
                'garageSlug' => (string) ($o->garage_slug ?? ''),
                'garageCity' => (string) ($o->garage_city ?? ''),
                'isPremium' => (bool) $o->is_premium,
                'createdAt' => optional($o->created_at)->toISOString(),
            ],
            'stats' => [
                'carsTotal' => Car::query()->where('owner_id', $id)->count(),
                'carEventsTotal' => $eventsTotal,
                'carDocsTotal' => $docsTotal,
                'supportTicketsTotal' => $supportTotal,
                'supportTicketsAwaitingAdminReply' => $supportAwaitingAdmin,
            ],
        ];
    }
}
