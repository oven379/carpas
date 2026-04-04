<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Support\ApiResources;
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

        return response()->json($events->map(fn ($e) => ApiResources::event($e))->values());
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
            'maintenanceServices' => ['nullable', 'array'],
            'note' => ['nullable', 'string'],
        ]);

        $evt = CarEvent::query()->create([
            'detailing_id' => $d->id,
            'car_id' => $carId,
            'owner_id' => null,
            'source' => 'service',
            'at' => $data['at'] ?? now()->toISOString(),
            'type' => $data['type'] ?? 'visit',
            'title' => trim((string) ($data['title'] ?? '')),
            'mileage_km' => isset($data['mileageKm']) ? (int) $data['mileageKm'] : 0,
            'services' => $data['services'] ?? [],
            'maintenance_services' => $data['maintenanceServices'] ?? [],
            'note' => $data['note'] ?? null,
        ]);

        return response()->json(ApiResources::event($evt));
    }

    public function update(Request $request, $id)
    {
        /** @var Detailing $d */
        $d = $request->user();
        $evt = CarEvent::query()->where('detailing_id', $d->id)->findOrFail($id);
        Car::query()->where('detailing_id', $d->id)->findOrFail($evt->car_id);

        $data = $request->all();
        if (array_key_exists('at', $data)) {
            $evt->at = $data['at'];
        }
        if (array_key_exists('type', $data)) {
            $evt->type = (string) $data['type'];
        }
        if (array_key_exists('title', $data)) {
            $evt->title = trim((string) $data['title']);
        }
        if (array_key_exists('mileageKm', $data)) {
            $evt->mileage_km = (int) $data['mileageKm'];
        }
        if (array_key_exists('services', $data) && is_array($data['services'])) {
            $evt->services = $data['services'];
        }
        if (array_key_exists('maintenanceServices', $data) && is_array($data['maintenanceServices'])) {
            $evt->maintenance_services = $data['maintenanceServices'];
        }
        if (array_key_exists('note', $data)) {
            $evt->note = $data['note'];
        }
        $evt->save();

        return response()->json(ApiResources::event($evt->fresh()));
    }

    public function destroy(Request $request, $id)
    {
        /** @var Detailing $d */
        $d = $request->user();
        $evt = CarEvent::query()->where('detailing_id', $d->id)->findOrFail($id);
        $evt->delete();

        return response()->json(['ok' => true]);
    }
}
