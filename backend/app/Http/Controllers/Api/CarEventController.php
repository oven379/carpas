<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Support\ApiResources;
use App\Http\Support\CareTips;
use App\Http\Support\CarMileageSync;
use App\Http\Support\DetailingCarAccess;
use App\Models\Car;
use App\Models\CarEvent;
use App\Models\Detailing;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class CarEventController extends Controller
{
    private function assertDetailingOwnsServiceEvent(Detailing $d, CarEvent $evt): void
    {
        if (($evt->source ?? '') !== 'service') {
            throw new HttpResponseException(response()->json([
                'message' => 'Сервис может изменять только записи, созданные сервисом.',
            ], 403));
        }
        if ((int) $evt->detailing_id !== (int) $d->id) {
            throw new HttpResponseException(response()->json(['message' => 'Нет доступа к записи.'], 403));
        }
    }

    private function assertDetailingMayEditFinalizedServiceVisit(Detailing $d, CarEvent $evt): void
    {
        $this->assertDetailingOwnsServiceEvent($d, $evt);
        $at = $evt->at;
        if (! $at) {
            throw new HttpResponseException(response()->json(['message' => 'У визита не задана дата.'], 422));
        }
        $tz = (string) config('app.visit_edit_timezone', 'Europe/Moscow');
        $visitDay = $at->copy()->timezone($tz)->format('Y-m-d');
        $today = now()->timezone($tz)->format('Y-m-d');
        if ($visitDay !== $today) {
            throw new HttpResponseException(response()->json([
                'message' => 'Редактирование визита доступно только в календарный день визита.',
            ], 403));
        }
    }

    private function assertDetailingMayMutateServiceVisit(Detailing $d, CarEvent $evt): void
    {
        if ($evt->is_draft) {
            $this->assertDetailingOwnsServiceEvent($d, $evt);

            return;
        }
        $this->assertDetailingMayEditFinalizedServiceVisit($d, $evt);
    }

    private function assertFinalizeDraftPayload(CarEvent $evt): void
    {
        if (trim((string) $evt->title) === '') {
            throw new HttpResponseException(response()->json([
                'message' => 'Укажите заголовок визита перед сохранением.',
            ], 422));
        }
        if ((int) $evt->mileage_km < 1) {
            throw new HttpResponseException(response()->json([
                'message' => 'Укажите пробег перед сохранением визита.',
            ], 422));
        }
        $svc = is_array($evt->services) ? $evt->services : [];
        $ms = is_array($evt->maintenance_services) ? $evt->maintenance_services : [];
        if (count($svc) + count($ms) < 1) {
            throw new HttpResponseException(response()->json([
                'message' => 'Выберите хотя бы одну услугу (детейлинг или ТО) перед сохранением.',
            ], 422));
        }
    }

    public function index(Request $request, $carId)
    {
        /** @var Detailing $d */
        $d = $request->user();
        DetailingCarAccess::findCarForDetailingOrFail($d, (int) $carId);

        $events = CarEvent::query()
            ->with('detailing')
            ->where('detailing_id', $d->id)
            ->where('car_id', $carId)
            ->where('source', 'service')
            ->orderByDesc('is_draft')
            ->orderByDesc('at')
            ->get();

        return response()->json($events->map(fn ($e) => ApiResources::event($e, true))->values());
    }

    public function store(Request $request, $carId)
    {
        /** @var Detailing $d */
        $d = $request->user();

        $data = $request->validate([
            'at' => ['nullable', 'string'],
            'type' => ['nullable', 'string'],
            'title' => ['nullable', 'string'],
            'mileageKm' => ['nullable'],
            'services' => ['nullable', 'array'],
            'maintenanceServices' => ['nullable', 'array'],
            'note' => ['nullable', 'string'],
            'reason' => ['nullable', 'string', 'max:1000'],
            'specialNotes' => ['nullable', 'string', 'max:3000'],
            'masterName' => ['nullable', 'string', 'max:255'],
            'workItems' => ['nullable', 'array'],
            'partsItems' => ['nullable', 'array'],
            'internalNote' => ['nullable', 'string', 'max:1000'],
            'nextContactAt' => ['nullable', 'string'],
            'careTips' => ['nullable', 'array'],
            'isDraft' => ['nullable'],
            'allowPublicPhotos' => ['nullable'],
        ]);

        $isDraft = $request->boolean('isDraft');
        $allowPublic = $request->has('allowPublicPhotos')
            ? $request->boolean('allowPublicPhotos')
            : true;

        $car = DetailingCarAccess::findCarForDetailingOrFail($d, (int) $carId);
        $incomingKm = isset($data['mileageKm']) ? (int) $data['mileageKm'] : 0;
        if (! $isDraft) {
            if (trim((string) ($data['title'] ?? '')) === '') {
                throw new HttpResponseException(response()->json([
                    'message' => 'Укажите заголовок визита перед сохранением.',
                ], 422));
            }
            $serviceCount = count(is_array($data['services'] ?? null) ? $data['services'] : [])
                + count(is_array($data['maintenanceServices'] ?? null) ? $data['maintenanceServices'] : []);
            if ($serviceCount < 1) {
                throw new HttpResponseException(response()->json([
                    'message' => 'Выберите хотя бы одну услугу (детейлинг или ТО) перед сохранением.',
                ], 422));
            }
            $min = CarMileageSync::minAllowedMileageForVisit($car, null);
            if ($incomingKm <= $min) {
                throw ValidationException::withMessages([
                    'mileageKm' => ['Пробег визита должен быть больше текущего по карточке и истории ('.$min.' км).'],
                ]);
            }
        }

        if ($isDraft) {
            $existing = CarEvent::query()
                ->where('detailing_id', $d->id)
                ->where('car_id', $carId)
                ->where('source', 'service')
                ->where('is_draft', true)
                ->orderByDesc('updated_at')
                ->first();
            if ($existing) {
                return response()->json(ApiResources::event($existing, true));
            }
        }

        $evt = CarEvent::query()->create([
            'detailing_id' => $d->id,
            'car_id' => $carId,
            'owner_id' => null,
            'source' => 'service',
            'is_draft' => $isDraft,
            'allow_public_photos' => $allowPublic,
            'at' => $data['at'] ?? now()->toISOString(),
            'type' => $data['type'] ?? 'visit',
            'title' => trim((string) ($data['title'] ?? '')),
            'mileage_km' => $incomingKm,
            'services' => $data['services'] ?? [],
            'maintenance_services' => $data['maintenanceServices'] ?? [],
            'note' => $data['note'] ?? null,
            'reason' => isset($data['reason']) ? trim((string) $data['reason']) : null,
            'special_notes' => isset($data['specialNotes']) ? trim((string) $data['specialNotes']) : null,
            'master_name' => isset($data['masterName']) ? trim((string) $data['masterName']) : null,
            'work_items' => isset($data['workItems']) && is_array($data['workItems']) ? $data['workItems'] : [],
            'parts_items' => isset($data['partsItems']) && is_array($data['partsItems']) ? $data['partsItems'] : [],
            'internal_note' => $data['internalNote'] ?? null,
            'next_contact_at' => $data['nextContactAt'] ?? null,
            'care_tips' => CareTips::normalize($data['careTips'] ?? null),
        ]);

        if (! $isDraft) {
            CarMileageSync::bumpCarMileageFromEvents($car->fresh());
            if (! $evt->order_number) {
                $evt->order_number = 'ЗН-'.$evt->id;
                $evt->save();
            }
        }

        return response()->json(ApiResources::event($evt, true));
    }

    public function update(Request $request, $id)
    {
        /** @var Detailing $d */
        $d = $request->user();
        $evt = CarEvent::query()->where('detailing_id', $d->id)->findOrFail($id);
        DetailingCarAccess::findCarForDetailingOrFail($d, (int) $evt->car_id);

        $wasDraft = (bool) $evt->is_draft;

        $this->assertDetailingMayMutateServiceVisit($d, $evt);

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
        if (array_key_exists('reason', $data)) {
            $evt->reason = $data['reason'] !== null ? trim((string) $data['reason']) : null;
        }
        if (array_key_exists('specialNotes', $data)) {
            $evt->special_notes = $data['specialNotes'] !== null ? trim((string) $data['specialNotes']) : null;
        }
        if (array_key_exists('masterName', $data)) {
            $evt->master_name = $data['masterName'] !== null ? trim((string) $data['masterName']) : null;
        }
        if (array_key_exists('workItems', $data) && is_array($data['workItems'])) {
            $evt->work_items = $data['workItems'];
        }
        if (array_key_exists('partsItems', $data) && is_array($data['partsItems'])) {
            $evt->parts_items = $data['partsItems'];
        }
        if (array_key_exists('internalNote', $data)) {
            $evt->internal_note = $data['internalNote'];
        }
        if (array_key_exists('nextContactAt', $data)) {
            $evt->next_contact_at = $data['nextContactAt'];
        }
        if (array_key_exists('careTips', $data)) {
            $evt->care_tips = CareTips::normalize($data['careTips']);
        }
        if (array_key_exists('isDraft', $data)) {
            $evt->is_draft = $request->boolean('isDraft');
        }
        if (array_key_exists('allowPublicPhotos', $data)) {
            $evt->allow_public_photos = $request->boolean('allowPublicPhotos');
        }

        if ($wasDraft && ! $evt->is_draft) {
            if (! $evt->at) {
                $evt->at = now();
            }
            $this->assertFinalizeDraftPayload($evt);
        }

        $car = DetailingCarAccess::findCarForDetailingOrFail($d, (int) $evt->car_id);
        $willBeFinalized = ! $evt->is_draft;
        if ($willBeFinalized && ($wasDraft || array_key_exists('mileageKm', $data))) {
            $min = CarMileageSync::minAllowedMileageForVisit($car, (int) $evt->id);
            if ((int) $evt->mileage_km <= $min) {
                throw ValidationException::withMessages([
                    'mileageKm' => ['Пробег визита должен быть больше текущего по карточке и истории ('.$min.' км).'],
                ]);
            }
        }

        $evt->save();

        if ($willBeFinalized) {
            CarMileageSync::bumpCarMileageFromEvents($car->fresh());
            $evt->refresh();
            if (! $evt->order_number) {
                $evt->order_number = 'ЗН-'.$evt->id;
                $evt->save();
            }
        }

        return response()->json(ApiResources::event($evt->fresh(), true));
    }

    public function destroy(Request $request, $id)
    {
        /** @var Detailing $d */
        $d = $request->user();
        $evt = CarEvent::query()->where('detailing_id', $d->id)->findOrFail($id);
        $this->assertDetailingMayMutateServiceVisit($d, $evt);
        $carId = (int) $evt->car_id;
        $evt->delete();
        $car = Car::query()->find($carId);
        if ($car) {
            CarMileageSync::refreshCarMileageAfterEventDeleted($car->fresh());
        }

        return response()->json(['ok' => true]);
    }
}
