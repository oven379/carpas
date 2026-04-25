<?php

namespace App\Application\Admin;

use App\Http\Support\ApiResources;
use App\Http\Support\PendingOwnerPool;
use App\Models\Car;
use App\Models\CarClaim;
use App\Models\CarEvent;
use App\Models\Detailing;
use App\Models\SupportTicket;

final class AdminPartnerOperationalSummary
{
    /**
     * @return array<string, mixed>|null
     */
    public function forDetailingId(int $id): ?array
    {
        $d = Detailing::query()
            ->where('id', $id)
            ->where('email', '!=', PendingOwnerPool::DETAILING_EMAIL)
            ->first();

        if ($d === null) {
            return null;
        }

        $isPending = $d->verification_approved_at === null;

        return [
            'profile' => ApiResources::detailing($d),
            'isPendingVerification' => $isPending,
            'stats' => [
                'carsTotal' => Car::query()->where('detailing_id', $id)->count(),
                'carEventsTotal' => CarEvent::query()->where('detailing_id', $id)->count(),
                'claimsPending' => CarClaim::query()->where('detailing_id', $id)->where('status', 'pending')->count(),
                'claimsTotal' => CarClaim::query()->where('detailing_id', $id)->count(),
                'supportTicketsTotal' => SupportTicket::query()->where('detailing_id', $id)->count(),
            ],
        ];
    }
}
