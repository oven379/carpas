<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Support\ApiResources;
use App\Models\AppNotification;
use App\Models\Car;
use App\Models\CarEvent;
use App\Models\Owner;
use App\Models\ServiceBookingRequest;
use App\Services\InternalNotificationService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ServiceBookingRequestController extends Controller
{
    public function __construct(private readonly InternalNotificationService $notifications) {}

    public function storeOwner(Request $request)
    {
        /** @var Owner $owner */
        $owner = $request->user();
        $data = $request->validate([
            'carId' => ['required', 'integer'],
            'eventId' => ['required', 'integer'],
            'message' => ['nullable', 'string', 'max:500'],
        ]);

        $car = Car::query()
            ->where('owner_id', $owner->id)
            ->findOrFail((int) $data['carId']);

        $event = CarEvent::query()
            ->where('car_id', $car->id)
            ->where('source', 'service')
            ->where('is_draft', false)
            ->whereNotNull('detailing_id')
            ->findOrFail((int) $data['eventId']);

        $requestRow = ServiceBookingRequest::query()
            ->where('owner_id', $owner->id)
            ->where('detailing_id', $event->detailing_id)
            ->where('car_id', $car->id)
            ->where('car_event_id', $event->id)
            ->whereIn('status', [ServiceBookingRequest::STATUS_NEW, ServiceBookingRequest::STATUS_IN_WORK])
            ->first();

        if (! $requestRow) {
            $requestRow = ServiceBookingRequest::query()->create([
                'owner_id' => $owner->id,
                'detailing_id' => $event->detailing_id,
                'car_id' => $car->id,
                'car_event_id' => $event->id,
                'status' => ServiceBookingRequest::STATUS_NEW,
                'message' => trim((string) ($data['message'] ?? '')),
            ]);
        }

        if ($requestRow->wasRecentlyCreated) {
            $carName = trim(implode(' ', array_filter([(string) $car->make, (string) $car->model]))) ?: 'автомобиль';
            $ownerName = trim((string) ($owner->name ?: $car->client_name ?: 'Клиент'));
            $ownerPhone = trim((string) ($owner->phone ?: $car->client_phone ?: $car->owner_phone ?: ''));
            $this->notifications->createForOwner(
                $owner,
                'Заявка отправлена',
                'Мы передали заявку в сервис. Менеджер свяжется с вами и подберёт время для '.$carName.'.',
                'owner_booking_request_sent',
                [
                    'bookingRequestId' => (string) $requestRow->id,
                    'carId' => (string) $car->id,
                    'eventId' => (string) $event->id,
                    'detailingId' => (string) $event->detailing_id,
                    'ownerName' => $ownerName,
                    'ownerPhone' => $ownerPhone,
                    'carName' => $carName,
                    'requestType' => 'owner_booking',
                    'requestTypeLabel' => 'Запись от владельца',
                ],
            );
            $this->notifications->createForDetailing(
                (int) $event->detailing_id,
                'Клиент хочет записаться',
                $ownerName.' хочет записать '.$carName.' на повторный визит. Свяжитесь с клиентом для выбора времени.',
                'owner_booking_request',
                [
                    'bookingRequestId' => (string) $requestRow->id,
                    'ownerId' => (string) $owner->id,
                    'carId' => (string) $car->id,
                    'eventId' => (string) $event->id,
                    'detailingId' => (string) $event->detailing_id,
                    'ownerName' => $ownerName,
                    'ownerPhone' => $ownerPhone,
                    'carName' => $carName,
                    'requestType' => 'owner_booking',
                    'requestTypeLabel' => 'Запись от владельца',
                ],
            );
        }

        return response()->json([
            'ok' => true,
            'item' => $this->resource($requestRow->fresh(['owner', 'car', 'event'])),
            'message' => $requestRow->wasRecentlyCreated
                ? 'Заявка отправлена. Менеджер сервиса свяжется с вами.'
                : 'Заявка уже есть в CRM сервиса.',
        ], $requestRow->wasRecentlyCreated ? 201 : 200);
    }

    public function updateDetailing(Request $request, int $id)
    {
        $detailing = $request->user();
        $data = $request->validate([
            'status' => ['required', 'string', Rule::in([
                ServiceBookingRequest::STATUS_NEW,
                ServiceBookingRequest::STATUS_IN_WORK,
                ServiceBookingRequest::STATUS_CLOSED,
            ])],
        ]);

        $requestRow = ServiceBookingRequest::query()
            ->where('detailing_id', $detailing->id)
            ->findOrFail($id);

        $requestRow->status = $data['status'];
        $requestRow->closed_at = $data['status'] === ServiceBookingRequest::STATUS_CLOSED ? now() : null;
        $requestRow->save();

        if ($data['status'] === ServiceBookingRequest::STATUS_CLOSED) {
            AppNotification::query()
                ->where('detailing_id', $detailing->id)
                ->where('kind', 'owner_booking_request')
                ->where('data->bookingRequestId', (string) $requestRow->id)
                ->whereNull('read_at')
                ->update(['read_at' => now(), 'updated_at' => now()]);
        }

        return response()->json([
            'ok' => true,
            'item' => $this->resource($requestRow->fresh(['owner', 'car', 'event'])),
        ]);
    }

    public static function resource(ServiceBookingRequest $requestRow): array
    {
        $requestRow->loadMissing(['owner', 'car', 'event']);
        $car = $requestRow->car;
        $owner = $requestRow->owner;

        return [
            'id' => (string) $requestRow->id,
            'status' => $requestRow->status,
            'message' => (string) ($requestRow->message ?? ''),
            'createdAt' => optional($requestRow->created_at)->toISOString(),
            'closedAt' => optional($requestRow->closed_at)->toISOString(),
            'owner' => $owner ? [
                'id' => (string) $owner->id,
                'name' => trim((string) $owner->name),
                'email' => trim((string) $owner->email),
                'phone' => trim((string) $owner->phone),
            ] : null,
            'car' => $car ? ApiResources::car($car) : null,
            'eventId' => $requestRow->car_event_id ? (string) $requestRow->car_event_id : null,
        ];
    }
}
