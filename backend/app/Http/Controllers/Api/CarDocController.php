<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Car;
use App\Models\CarDoc;
use App\Models\Detailing;
use Illuminate\Http\Request;

class CarDocController extends Controller
{
    public function index(Request $request, $carId)
    {
        /** @var Detailing $d */
        $d = $request->user();
        Car::query()->where('detailing_id', $d->id)->findOrFail($carId);

        $docs = CarDoc::query()
            ->where('detailing_id', $d->id)
            ->where('car_id', $carId)
            ->orderByDesc('created_at')
            ->get();

        return response()->json($docs->map(fn ($doc) => $this->doc($doc))->values());
    }

    public function store(Request $request, $carId)
    {
        /** @var Detailing $d */
        $d = $request->user();
        Car::query()->where('detailing_id', $d->id)->findOrFail($carId);

        $data = $request->validate([
            'title' => ['nullable', 'string'],
            'kind' => ['nullable', 'string'],
            'url' => ['nullable', 'string'],
            'eventId' => ['nullable'],
        ]);

        $doc = CarDoc::query()->create([
            'detailing_id' => $d->id,
            'car_id' => $carId,
            'event_id' => isset($data['eventId']) && $data['eventId'] !== '' ? (int) $data['eventId'] : null,
            'title' => trim((string) ($data['title'] ?? 'Файл')) ?: 'Файл',
            'kind' => trim((string) ($data['kind'] ?? 'photo')) ?: 'photo',
            'url' => $data['url'] ?? null,
            'created_at' => now(),
        ]);

        return response()->json($this->doc($doc));
    }

    public function destroy(Request $request, $id)
    {
        /** @var Detailing $d */
        $d = $request->user();
        $doc = CarDoc::query()->where('detailing_id', $d->id)->findOrFail($id);
        $doc->delete();
        return response()->json(['ok' => true]);
    }

    private function doc(CarDoc $d): array
    {
        return [
            'id' => (string) $d->id,
            'detailingId' => (string) $d->detailing_id,
            'carId' => (string) $d->car_id,
            'title' => $d->title ?? 'Файл',
            'kind' => $d->kind ?? 'photo',
            'url' => $d->url ?? '',
            'eventId' => $d->event_id ? (string) $d->event_id : null,
            'createdAt' => optional($d->created_at)->toISOString(),
        ];
    }
}
