<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Car;
use App\Models\CarEvent;
use App\Models\Detailing;
use Illuminate\Http\Request;

class CarEventController extends Controller
{
    public function index(Request $request, $carId)
    {
        /** @var Detailing $d */
        $d = $request->user();
        Car::query()->where('detailing_id', $d->id)->findOrFail($carId);

        $events = CarEvent::query()
            ->where('detailing_id', $d->id)
            ->where('car_id', $carId)
            ->orderByDesc('at')
            ->get();

        return response()->json($events->map(fn ($e) => $this->evt($e))->values());
    }

    public function store(Request $request, $carId)
    {
        /** @var Detailing $d */
        $d = $request->user();
        Car::query()->where('detailing_id', $d->id)->findOrFail($carId);

        $data = $request->validate([
            'at' => ['nullable', 'string'],
            'type' => ['nullable', 'string'],
            'title' => ['nullable', 'string'],
            'mileageKm' => ['nullable'],
            'services' => ['nullable', 'array'],
            'note' => ['nullable', 'string'],
        ]);

        $evt = CarEvent::query()->create([
            'detailing_id' => $d->id,
            'car_id' => $carId,
            'at' => $data['at'] ?? now()->toISOString(),
            'type' => $data['type'] ?? 'visit',
            'title' => trim((string) ($data['title'] ?? '')),
            'mileage_km' => isset($data['mileageKm']) ? (int) $data['mileageKm'] : 0,
            'services' => $data['services'] ?? [],
            'note' => $data['note'] ?? null,
        ]);

        return response()->json($this->evt($evt));
    }

    public function destroy(Request $request, $id)
    {
        /** @var Detailing $d */
        $d = $request->user();
        $evt = CarEvent::query()->where('detailing_id', $d->id)->findOrFail($id);
        $evt->delete();
        return response()->json(['ok' => true]);
    }

    private function evt(CarEvent $e): array
    {
        return [
            'id' => (string) $e->id,
            'detailingId' => (string) $e->detailing_id,
            'carId' => (string) $e->car_id,
            'at' => optional($e->at)->toISOString(),
            'type' => $e->type ?? 'visit',
            'title' => $e->title ?? '',
            'mileageKm' => (int) ($e->mileage_km ?? 0),
            'services' => $e->services ?? [],
            'note' => $e->note ?? '',
        ];
    }
}
