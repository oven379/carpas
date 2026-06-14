<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Support\ApiResources;
use App\Http\Support\DetailingCarAccess;
use App\Models\Car;
use App\Models\CarDoc;
use App\Models\CarEvent;
use App\Models\DevicePushToken;
use App\Models\Detailing;
use App\Models\DetailingClientNote;
use App\Models\ServiceBookingRequest;
use App\Services\FcmV1Client;
use App\Services\InternalNotificationService;
use App\Services\PushSettings;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;

class DetailingCrmController extends Controller
{
    public function __construct(
        private readonly FcmV1Client $fcm,
        private readonly PushSettings $pushSettings,
        private readonly InternalNotificationService $notifications,
    ) {}

    public function clients(Request $request)
    {
        /** @var Detailing $d */
        $d = $request->user();

        $fromEvents = CarEvent::query()
            ->where('detailing_id', $d->id)
            ->where('source', 'service')
            ->distinct()
            ->pluck('car_id');
        $fromHome = Car::query()->where('detailing_id', $d->id)->pluck('id');
        $ids = $fromEvents->merge($fromHome)->unique()->filter()->values();

        $cars = Car::query()
            ->whereIn('id', $ids)
            ->with(['owner', 'detailing'])
            ->withCount([
                'events as service_visits_count' => fn ($q) => $q
                    ->where('detailing_id', $d->id)
                    ->where('source', 'service'),
                'docs as docs_count',
            ])
            ->orderByDesc('updated_at')
            ->get();

        $lastEvents = CarEvent::query()
            ->where('detailing_id', $d->id)
            ->where('source', 'service')
            ->whereIn('car_id', $ids)
            ->orderByDesc('at')
            ->orderByDesc('created_at')
            ->get()
            ->groupBy('car_id')
            ->map(fn ($group) => $group->first());

        $docsByEvent = CarDoc::query()
            ->whereIn('event_id', $lastEvents->pluck('id')->filter()->values())
            ->whereNotNull('url')
            ->where('url', '!=', '')
            ->orderByDesc('created_at')
            ->get()
            ->groupBy('event_id');

        $bookingRequests = ServiceBookingRequest::query()
            ->with(['owner', 'car', 'event'])
            ->where('detailing_id', $d->id)
            ->whereIn('car_id', $ids)
            ->whereIn('status', [ServiceBookingRequest::STATUS_NEW, ServiceBookingRequest::STATUS_IN_WORK])
            ->orderByDesc('created_at')
            ->get()
            ->groupBy('car_id');

        $noteKeys = $cars
            ->map(fn (Car $car) => self::clientNoteKey($car))
            ->filter()
            ->unique()
            ->values();
        $clientNotes = DetailingClientNote::query()
            ->where('detailing_id', $d->id)
            ->whereIn('client_key', $noteKeys)
            ->get()
            ->keyBy('client_key');

        $rows = $cars->map(function (Car $car) use ($lastEvents, $docsByEvent, $bookingRequests, $clientNotes) {
            $last = $lastEvents->get($car->id);
            $clientNoteKey = self::clientNoteKey($car);
            $clientNote = $clientNoteKey ? $clientNotes->get($clientNoteKey) : null;
            $requests = $bookingRequests
                ->get($car->id, collect())
                ->map(fn (ServiceBookingRequest $request) => ServiceBookingRequestController::resource($request))
                ->values()
                ->all();
            $lastAt = $last?->at ? Carbon::parse($last->at) : ($last?->created_at ? Carbon::parse($last->created_at) : null);
            $nextAt = $last?->next_contact_at
                ? Carbon::parse($last->next_contact_at)
                : null;
            $daysUntilNext = $nextAt ? now()->startOfDay()->diffInDays($nextAt->copy()->startOfDay(), false) : null;
            $needsReminder = $daysUntilNext !== null && $daysUntilNext <= 5;
            $isNew = (int) ($car->service_visits_count ?? 0) === 0;
            $carData = ApiResources::car($car);

            return [
                'id' => (string) $car->id,
                'car' => $carData,
                'client' => [
                    'name' => trim((string) ($car->client_name ?: $car->owner?->name ?: '')),
                    'phone' => trim((string) ($car->client_phone ?: $car->owner?->phone ?: $car->owner_phone ?: '')),
                    'email' => trim((string) ($car->client_email ?: $car->owner?->email ?: '')),
                    'note' => trim((string) ($clientNote?->note ?? '')),
                    'discountPercent' => $clientNote?->discount_percent !== null ? (int) $clientNote->discount_percent : null,
                    'isRegisteredOwner' => $car->owner_id !== null,
                    'garageSlug' => trim((string) ($car->owner?->garage_slug ?? '')),
                ],
                'lastVisit' => $last ? [
                    'id' => (string) $last->id,
                    'title' => trim((string) ($last->title ?: 'Визит')),
                    'at' => optional($lastAt)->toISOString(),
                    'mileageKm' => $last->mileage_km,
                    'internalNote' => $last->internal_note ?? '',
                    'nextContactAt' => optional($last->next_contact_at)->toISOString(),
                    'services' => array_values(array_filter(array_merge(
                        is_array($last->services) ? $last->services : [],
                        is_array($last->maintenance_services) ? $last->maintenance_services : [],
                    ))),
                    'photos' => $docsByEvent
                        ->get($last->id, collect())
                        ->take(8)
                        ->map(fn (CarDoc $doc) => ApiResources::doc($doc))
                        ->values()
                        ->all(),
                ] : null,
                'nextReminder' => $nextAt ? [
                    'at' => $nextAt->toISOString(),
                    'daysLeft' => $daysUntilNext,
                    'label' => $needsReminder ? 'Пора напомнить' : 'Запланировано',
                    'recommendedAction' => $needsReminder
                        ? 'Отправить клиенту напоминание о повторном уходе'
                        : 'Контроль состояния после визита',
                ] : null,
                'stats' => [
                    'visitsCount' => (int) ($car->service_visits_count ?? 0),
                    'docsCount' => (int) ($car->docs_count ?? 0),
                ],
                'bookingRequests' => $requests,
                'bookingRequestsCount' => count($requests),
                'latestBookingRequest' => $requests[0] ?? null,
                'flags' => [
                    'needsReminder' => $needsReminder,
                    'isNew' => $isNew,
                    'hasVisits' => (int) ($car->service_visits_count ?? 0) > 0,
                    'vip' => false,
                ],
                'updatedAt' => optional($car->updated_at)->toISOString(),
            ];
        })
            ->sort(function (array $a, array $b) {
                $aVisit = ! empty($a['lastVisit']['at']);
                $bVisit = ! empty($b['lastVisit']['at']);
                if ($aVisit !== $bVisit) {
                    return $aVisit ? -1 : 1;
                }

                $aTime = (string) ($a['lastVisit']['at'] ?? $a['updatedAt'] ?? '');
                $bTime = (string) ($b['lastVisit']['at'] ?? $b['updatedAt'] ?? '');

                return strcmp($bTime, $aTime);
            })
            ->values();

        return response()->json([
            'items' => $rows,
            'stats' => [
                'clients' => $rows->map(fn ($row) => mb_strtolower($row['client']['email'] ?: $row['client']['phone'] ?: $row['id']))->unique()->count(),
                'cars' => $rows->count(),
                'visitsThisMonth' => CarEvent::query()
                    ->where('detailing_id', $d->id)
                    ->where('source', 'service')
                    ->where('at', '>=', now()->startOfMonth())
                    ->count(),
                'remindersDue' => $rows->filter(fn ($row) => $row['flags']['needsReminder'])->count(),
                'withVisits' => $rows->filter(fn ($row) => $row['flags']['hasVisits'])->count(),
            ],
        ]);
    }

    public function updateClientNote(Request $request, $carId)
    {
        /** @var Detailing $d */
        $d = $request->user();
        $car = DetailingCarAccess::findCarForDetailingOrFail($d, (int) $carId);

        $data = $request->validate([
            'note' => ['nullable', 'string', 'max:1000'],
            'discountPercent' => ['nullable', 'integer', 'min:0', 'max:100'],
        ]);

        $key = self::clientNoteKey($car);
        $noteText = trim((string) ($data['note'] ?? ''));

        $values = [
            'owner_id' => $car->owner_id,
            'note' => $noteText,
        ];
        if (array_key_exists('discountPercent', $data)) {
            $values['discount_percent'] = $data['discountPercent'] !== null ? (int) $data['discountPercent'] : null;
        }

        $note = DetailingClientNote::query()->updateOrCreate(
            [
                'detailing_id' => $d->id,
                'client_key' => $key,
            ],
            $values,
        );

        return response()->json([
            'clientNote' => trim((string) $note->note),
            'discountPercent' => $note->discount_percent !== null ? (int) $note->discount_percent : null,
        ]);
    }

    private static function clientNoteKey(Car $car): string
    {
        if ($car->owner_id) {
            return 'owner:'.(string) $car->owner_id;
        }

        $email = mb_strtolower(trim((string) $car->client_email));
        if ($email !== '') {
            return 'email:'.$email;
        }

        $phone = preg_replace('/\D+/', '', (string) ($car->client_phone ?: $car->owner_phone));
        if ($phone !== '') {
            return 'phone:'.$phone;
        }

        return 'car:'.(string) $car->id;
    }

    public function sendOwnerPush(Request $request, $carId)
    {
        /** @var Detailing $d */
        $d = $request->user();
        $car = DetailingCarAccess::findCarForDetailingOrFail($d, (int) $carId);

        $data = $request->validate([
            'kind' => ['required', 'string', Rule::in(['reminder', 'wash_complete', 'car_ready'])],
            'body' => ['nullable', 'string', 'max:300'],
        ]);

        if (! $this->pushSettings->isEnabledForAudience('owners')) {
            return response()->json([
                'ok' => false,
                'message' => 'Push для владельцев выключен в админ-панели.',
            ], 409);
        }

        if (! $this->fcm->canSendAny()) {
            return response()->json([
                'ok' => false,
                'message' => 'Push не настроен: задайте FCM или включите EXPO_PUSH_ENABLED.',
            ], 503);
        }

        if (! $car->owner_id) {
            return response()->json([
                'ok' => false,
                'message' => 'У клиента нет аккаунта владельца в приложении. Push можно отправить только владельцу, который вошёл в приложение и разрешил уведомления.',
            ], 422);
        }

        $carName = trim(implode(' ', array_filter([(string) $car->make, (string) $car->model]))) ?: 'Ваш автомобиль';
        $serviceName = trim((string) $d->name) ?: 'КарПас';
        $kind = (string) $data['kind'];
        $isReady = in_array($kind, ['wash_complete', 'car_ready'], true);
        $title = $isReady ? 'Машина готова' : 'Напоминание от сервиса';
        $defaultBody = $isReady
            ? $carName.' готов. '.$serviceName.' ждёт вас.'
            : $serviceName.' напоминает: пора проверить состояние '.$carName.' после визита.';
        $body = trim((string) ($data['body'] ?? '')) ?: $defaultBody;

        $tokens = DevicePushToken::query()
            ->where('owner_id', $car->owner_id)
            ->pluck('token')
            ->filter()
            ->unique()
            ->values()
            ->all();

        if ($tokens === []) {
            $this->notifications->createForOwner(
                (int) $car->owner_id,
                $title,
                $body,
                $isReady ? 'car_ready' : 'service_reminder',
                ['carId' => (string) $car->id, 'detailingId' => (string) $d->id],
                false,
                false,
                false,
            );

            return response()->json([
                'ok' => true,
                'sent' => 0,
                'failed' => 0,
                'internal_created' => 1,
                'message' => 'Внутреннее уведомление создано. У владельца пока нет устройства с разрешёнными push-уведомлениями.',
            ]);
        }

        $result = $this->fcm->sendToTokens($tokens, $title, $body);
        $this->notifications->createForOwner(
            (int) $car->owner_id,
            $title,
            $body,
            $isReady ? 'car_ready' : 'service_reminder',
            ['carId' => (string) $car->id, 'detailingId' => (string) $d->id],
            false,
            $result['sent'] > 0,
            $result['failed'] > 0,
        );

        return response()->json([
            'ok' => true,
            'sent' => $result['sent'],
            'failed' => $result['failed'],
            'internal_created' => 1,
            'errors' => $result['errors'],
            'message' => $result['sent'] > 0 ? 'Push отправлен.' : 'Push не доставлен.',
        ]);
    }
}
