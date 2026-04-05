<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Support\ApiResources;
use App\Http\Support\MediaStorage;
use App\Models\Car;
use App\Models\CarDoc;
use App\Models\Owner;
use Illuminate\Http\Request;

class OwnerCarDocController extends Controller
{
    private function assertOwnerCar(Owner $owner, $carId): Car
    {
        return Car::query()->where('owner_id', $owner->id)->findOrFail($carId);
    }

    public function index(Request $request, $carId)
    {
        /** @var Owner $owner */
        $owner = $request->user();
        $car = $this->assertOwnerCar($owner, $carId);

        $docs = CarDoc::query()
            ->where('car_id', $car->id)
            ->orderByDesc('created_at')
            ->get();

        return response()->json($docs->map(fn ($d) => ApiResources::doc($d))->values());
    }

    public function store(Request $request, $carId)
    {
        /** @var Owner $owner */
        $owner = $request->user();
        $car = $this->assertOwnerCar($owner, $carId);

        $data = $request->validate([
            'title' => ['nullable', 'string'],
            'kind' => ['nullable', 'string'],
            'url' => ['nullable', 'string'],
            'eventId' => ['nullable'],
        ]);

        $urlRaw = $data['url'] ?? null;
        $urlStr = is_string($urlRaw) ? trim($urlRaw) : '';
        $urlStored = MediaStorage::ingestScalar(
            $urlStr === '' ? null : $urlStr,
            null,
            'docs/car_'.$car->id,
            'doc_'.str_replace('.', '', uniqid('', true)),
        );

        $doc = CarDoc::query()->create([
            'detailing_id' => $car->detailing_id,
            'car_id' => $car->id,
            'owner_id' => $owner->id,
            'source' => 'owner',
            'event_id' => isset($data['eventId']) && $data['eventId'] !== '' ? (int) $data['eventId'] : null,
            'title' => trim((string) ($data['title'] ?? 'Файл')) ?: 'Файл',
            'kind' => trim((string) ($data['kind'] ?? 'photo')) ?: 'photo',
            'url' => $urlStored,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(ApiResources::doc($doc));
    }

    public function destroy(Request $request, $carId, $id)
    {
        /** @var Owner $owner */
        $owner = $request->user();
        $car = $this->assertOwnerCar($owner, $carId);
        $doc = CarDoc::query()->where('car_id', $car->id)->where('id', $id)->firstOrFail();
        if ($doc->source !== 'owner') {
            abort(403);
        }
        MediaStorage::deleteStoredFileIfManaged($doc->url);
        $doc->delete();

        return response()->json(['ok' => true]);
    }
}
