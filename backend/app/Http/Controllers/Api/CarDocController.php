<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Support\ApiResources;
use App\Http\Support\DetailingCarAccess;
use App\Http\Support\MediaStorage;
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
        DetailingCarAccess::findCarForDetailingOrFail($d, (int) $carId);

        $docs = CarDoc::query()
            ->where('detailing_id', $d->id)
            ->where('car_id', $carId)
            ->orderByDesc('created_at')
            ->get();

        return response()->json($docs->map(fn ($doc) => ApiResources::doc($doc))->values());
    }

    public function store(Request $request, $carId)
    {
        /** @var Detailing $d */
        $d = $request->user();
        DetailingCarAccess::findCarForDetailingOrFail($d, (int) $carId);

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
            'docs/car_'.$carId,
            'doc_'.str_replace('.', '', uniqid('', true)),
        );

        $doc = CarDoc::query()->create([
            'detailing_id' => $d->id,
            'car_id' => $carId,
            'owner_id' => null,
            'source' => 'service',
            'event_id' => isset($data['eventId']) && $data['eventId'] !== '' ? (int) $data['eventId'] : null,
            'title' => trim((string) ($data['title'] ?? 'Файл')) ?: 'Файл',
            'kind' => trim((string) ($data['kind'] ?? 'photo')) ?: 'photo',
            'url' => $urlStored,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(ApiResources::doc($doc));
    }

    public function destroy(Request $request, $id)
    {
        /** @var Detailing $d */
        $d = $request->user();
        $doc = CarDoc::query()->where('detailing_id', $d->id)->findOrFail($id);
        MediaStorage::deleteStoredFileIfManaged($doc->url);
        $doc->delete();

        return response()->json(['ok' => true]);
    }
}
