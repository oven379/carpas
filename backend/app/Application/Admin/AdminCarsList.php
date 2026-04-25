<?php

namespace App\Application\Admin;

use App\Models\Car;

final class AdminCarsList
{
    /**
     * @return list<array<string, mixed>>
     */
    public function rows(): array
    {
        return Car::query()
            ->with(['owner:id,email,name', 'detailing:id,name'])
            ->withCount(['events', 'docs'])
            ->orderByDesc('updated_at')
            ->limit(400)
            ->get()
            ->map(function (Car $c) {
                $plate = trim((string) ($c->plate ?? '').' '.(string) ($c->plate_region ?? ''));

                return [
                    'id' => (string) $c->id,
                    'vin' => (string) ($c->vin ?? ''),
                    'plate' => trim($plate) !== '' ? trim($plate) : '—',
                    'make' => (string) ($c->make ?? ''),
                    'model' => (string) ($c->model ?? ''),
                    'year' => $c->year,
                    'ownerId' => $c->owner_id !== null ? (string) $c->owner_id : '',
                    'ownerEmail' => $c->owner ? (string) $c->owner->email : '',
                    'ownerName' => $c->owner ? (string) ($c->owner->name ?? '') : '',
                    'detailingId' => $c->detailing_id !== null ? (string) $c->detailing_id : '',
                    'detailingName' => $c->detailing ? (string) ($c->detailing->name ?? '') : '',
                    'eventsCount' => (int) ($c->events_count ?? 0),
                    'docsCount' => (int) ($c->docs_count ?? 0),
                    'updatedAt' => optional($c->updated_at)->toISOString(),
                ];
            })
            ->values()
            ->all();
    }
}
