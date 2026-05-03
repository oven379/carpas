<?php

namespace App\Application\Admin;

use App\Http\Support\PendingOwnerPool;
use App\Models\Detailing;

/**
 * Список партнёров для админки: сначала заявки на подтверждение, затем подтверждённые.
 */
final class AdminPartnersDirectory
{
    /**
     * Только заявки (совместимо с прежним GET …/partner-registrations/pending).
     *
     * @return list<array<string, mixed>>
     */
    public function pendingRegistrationRows(): array
    {
        return $this->pendingQuery()
            ->get()
            ->map(fn (Detailing $d) => $this->serializeRegistrationPending($d))
            ->values()
            ->all();
    }

    /**
     * Заявки сверху, затем подтверждённые партнёры (новые заявки — по убыванию даты создания).
     *
     * @return array{items: list<array<string, mixed>>}
     */
    public function combinedDirectory(): array
    {
        $pending = $this->pendingQuery()->get();
        $approved = Detailing::query()
            ->withCount('cars')
            ->where('email', '!=', PendingOwnerPool::DETAILING_EMAIL)
            ->whereNotNull('verification_approved_at')
            ->orderByDesc('updated_at')
            ->limit(300)
            ->get();

        $items = $pending
            ->map(fn (Detailing $d) => $this->serializeRegistrationPending($d))
            ->concat($approved->map(fn (Detailing $d) => $this->serializeApprovedPartner($d)))
            ->values()
            ->all();

        return ['items' => $items];
    }

    /**
     * @return \Illuminate\Database\Eloquent\Builder<Detailing>
     */
    private function pendingQuery()
    {
        return Detailing::query()
            ->where('email', '!=', PendingOwnerPool::DETAILING_EMAIL)
            ->whereNull('verification_approved_at')
            ->orderByDesc('created_at')
            ->limit(200);
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeRegistrationPending(Detailing $d): array
    {
        $det = is_array($d->services_offered) ? $d->services_offered : [];
        $maint = is_array($d->maintenance_services_offered) ? $d->maintenance_services_offered : [];

        return [
            'kind' => 'registration_pending',
            'id' => (string) $d->id,
            'publicSlug' => trim((string) ($d->public_slug ?? '')),
            'name' => $d->name,
            'email' => $d->email,
            'contactName' => $d->contact_name ?? '',
            'phone' => $d->phone ?? '',
            'city' => $d->city ?? '',
            'address' => $d->address ?? '',
            'description' => $d->description ?? '',
            'createdAt' => optional($d->created_at)->toISOString(),
            'servicesOfferedCount' => count(array_merge($det, $maint)),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeApprovedPartner(Detailing $d): array
    {
        return [
            'kind' => 'partner',
            'id' => (string) $d->id,
            'publicSlug' => trim((string) ($d->public_slug ?? '')),
            'name' => $d->name,
            'email' => $d->email,
            'contactName' => $d->contact_name ?? '',
            'phone' => $d->phone ?? '',
            'city' => $d->city ?? '',
            'verificationApprovedAt' => optional($d->verification_approved_at)->toISOString(),
            'createdAt' => optional($d->created_at)->toISOString(),
            'carsCount' => (int) ($d->cars_count ?? 0),
        ];
    }
}
