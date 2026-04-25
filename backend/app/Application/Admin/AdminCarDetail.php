<?php

namespace App\Application\Admin;

use App\Models\Car;

final class AdminCarDetail
{
    /**
     * @return array<string, mixed>|null
     */
    public function forId(int $id): ?array
    {
        $c = Car::query()
            ->with(['owner:id,email,name,phone', 'detailing:id,name,email,city'])
            ->withCount(['events', 'docs'])
            ->find($id);

        if ($c === null) {
            return null;
        }

        return [
            'car' => [
                'id' => (string) $c->id,
                'vin' => (string) ($c->vin ?? ''),
                'plate' => (string) ($c->plate ?? ''),
                'plateRegion' => (string) ($c->plate_region ?? ''),
                'make' => (string) ($c->make ?? ''),
                'model' => (string) ($c->model ?? ''),
                'year' => $c->year,
                'mileageKm' => (int) ($c->mileage_km ?? 0),
                'city' => (string) ($c->city ?? ''),
                'clientName' => (string) ($c->client_name ?? ''),
                'clientPhone' => (string) ($c->client_phone ?? ''),
                'clientEmail' => (string) ($c->client_email ?? ''),
                'ownerPhone' => (string) ($c->owner_phone ?? ''),
                'ownerId' => $c->owner_id !== null ? (string) $c->owner_id : null,
                'detailingId' => $c->detailing_id !== null ? (string) $c->detailing_id : null,
                'createdAt' => optional($c->created_at)->toISOString(),
                'updatedAt' => optional($c->updated_at)->toISOString(),
            ],
            'owner' => $c->owner ? [
                'id' => (string) $c->owner->id,
                'email' => $c->owner->email,
                'name' => (string) ($c->owner->name ?? ''),
                'phone' => (string) ($c->owner->phone ?? ''),
            ] : null,
            'detailing' => $c->detailing ? [
                'id' => (string) $c->detailing->id,
                'name' => (string) ($c->detailing->name ?? ''),
                'email' => (string) ($c->detailing->email ?? ''),
                'city' => (string) ($c->detailing->city ?? ''),
            ] : null,
            'stats' => [
                'eventsCount' => (int) ($c->events_count ?? 0),
                'docsCount' => (int) ($c->docs_count ?? 0),
            ],
        ];
    }
}
