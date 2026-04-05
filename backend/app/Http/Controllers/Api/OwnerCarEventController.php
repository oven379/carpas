<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Support\ApiResources;
use App\Models\Car;
use App\Models\CarEvent;
use App\Models\Owner;
use Illuminate\Http\Request;

class OwnerCarEventController extends Controller
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

        $events = CarEvent::query()
            ->with('detailing')
            ->where('car_id', $car->id)
            ->where('is_draft', false)
            ->orderByDesc('at')
            ->get();

        return response()->json($events->map(fn ($e) => ApiResources::event($e))->values());
    }

    public function store(Request $request, $carId)
    {
        /** @var Owner $owner */
        $owner = $request->user();
        $car = $this->assertOwnerCar($owner, $carId);

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
            'detailing_id' => $car->detailing_id,
            'car_id' => $car->id,
            'owner_id' => $owner->id,
            'source' => 'owner',
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

    public function update(Request $request, $carId, $id)
    {
        /** @var Owner $owner */
        $owner = $request->user();
        $car = $this->assertOwnerCar($owner, $carId);
        $evt = CarEvent::query()->where('car_id', $car->id)->where('id', $id)->firstOrFail();
        if ($evt->source !== 'owner') {
            abort(403);
        }

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

    public function destroy(Request $request, $carId, $id)
    {
        /** @var Owner $owner */
        $owner = $request->user();
        $car = $this->assertOwnerCar($owner, $carId);
        $evt = CarEvent::query()->where('car_id', $car->id)->where('id', $id)->firstOrFail();
        if ($evt->source !== 'owner') {
            abort(403);
        }
        $evt->delete();

        return response()->json(['ok' => true]);
    }
}
