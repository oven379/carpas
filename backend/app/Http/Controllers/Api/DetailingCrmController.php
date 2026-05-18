<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Support\ApiResources;
use App\Http\Support\DetailingCarAccess;
use App\Models\Car;
use App\Models\CarEvent;
use App\Models\DevicePushToken;
use App\Models\Detailing;
use App\Services\FcmV1Client;
use App\Services\PushSettings;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;

class DetailingCrmController extends Controller
{
    public function __construct(
        private readonly FcmV1Client $fcm,
        private readonly PushSettings $pushSettings
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

        $rows = $cars->map(function (Car $car) use ($lastEvents) {
            $last = $lastEvents->get($car->id);
            $lastAt = $last?->at ? Carbon::parse($last->at) : ($last?->created_at ? Carbon::parse($last->created_at) : null);
            $nextAt = $lastAt ? $lastAt->copy()->addDays(30) : null;
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
                    'isRegisteredOwner' => $car->owner_id !== null,
                    'garageSlug' => trim((string) ($car->owner?->garage_slug ?? '')),
                ],
                'lastVisit' => $last ? [
                    'id' => (string) $last->id,
                    'title' => trim((string) ($last->title ?: 'Визит')),
                    'at' => optional($lastAt)->toISOString(),
                    'mileageKm' => $last->mileage_km,
                    'services' => array_values(array_filter(array_merge(
                        is_array($last->services) ? $last->services : [],
                        is_array($last->maintenance_services) ? $last->maintenance_services : [],
                    ))),
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
                'flags' => [
                    'needsReminder' => $needsReminder,
                    'isNew' => $isNew,
                    'hasVisits' => (int) ($car->service_visits_count ?? 0) > 0,
                    'vip' => false,
                ],
                'updatedAt' => optional($car->updated_at)->toISOString(),
            ];
        })->values();

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

        $tokens = DevicePushToken::query()
            ->where('owner_id', $car->owner_id)
            ->pluck('token')
            ->filter()
            ->unique()
            ->values()
            ->all();

        if ($tokens === []) {
            return response()->json([
                'ok' => true,
                'sent' => 0,
                'failed' => 0,
                'message' => 'У владельца пока нет устройства с разрешёнными push-уведомлениями.',
            ]);
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

        $result = $this->fcm->sendToTokens($tokens, $title, $body);

        return response()->json([
            'ok' => true,
            'sent' => $result['sent'],
            'failed' => $result['failed'],
            'errors' => $result['errors'],
            'message' => $result['sent'] > 0 ? 'Push отправлен.' : 'Push не доставлен.',
        ]);
    }
}
