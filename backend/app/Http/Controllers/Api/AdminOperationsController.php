<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdminActionLog;
use App\Models\AppNotification;
use App\Models\AppSetting;
use App\Models\CarEvent;
use App\Models\DevicePushToken;
use App\Models\ServiceBookingRequest;
use Illuminate\Http\Request;

class AdminOperationsController extends Controller
{
    public function index()
    {
        $bookingRows = ServiceBookingRequest::query()
            ->with([
                'owner:id,email,name,phone',
                'detailing:id,name,email,city',
                'car:id,make,model,year,vin,plate,plate_region,mileage_km',
            ])
            ->latest()
            ->limit(80)
            ->get()
            ->map(fn (ServiceBookingRequest $row) => $this->bookingResource($row))
            ->values();

        $notificationRows = AppNotification::query()
            ->with(['owner:id,email,name,phone', 'detailing:id,name,email,city'])
            ->whereIn('kind', ['owner_booking_request', 'crm_next_contact', 'admin_broadcast', 'admin_test'])
            ->latest()
            ->limit(100)
            ->get()
            ->map(fn (AppNotification $row) => $this->notificationResource($row))
            ->values();

        $dueEventIds = CarEvent::query()
            ->where('source', 'service')
            ->where('is_draft', false)
            ->whereNotNull('detailing_id')
            ->whereNotNull('next_contact_at')
            ->where('next_contact_at', '<=', now())
            ->pluck('id')
            ->map(fn ($id) => (string) $id)
            ->all();
        $notifiedEventIds = AppNotification::query()
            ->where('kind', 'crm_next_contact')
            ->get()
            ->map(fn (AppNotification $n) => (string) (($n->data['eventId'] ?? '') ?: ''))
            ->filter()
            ->unique()
            ->all();
        $dueWithoutNotification = count(array_diff($dueEventIds, $notifiedEventIds));

        $scheduler = AppSetting::query()
            ->where('key', 'next_contact_scheduler')
            ->first()?->value ?? [];

        $pushLastResult = AppSetting::query()
            ->where('key', 'push_last_result')
            ->first()?->value ?? null;

        $logs = AdminActionLog::query()
            ->latest()
            ->limit(50)
            ->get()
            ->map(fn (AdminActionLog $log) => [
                'id' => (string) $log->id,
                'action' => (string) $log->action,
                'targetType' => $log->target_type,
                'targetId' => $log->target_id,
                'payload' => is_array($log->payload) ? $log->payload : [],
                'createdAt' => optional($log->created_at)->toISOString(),
            ])
            ->values();

        return response()->json([
            'summary' => [
                'bookingOpen' => ServiceBookingRequest::query()
                    ->whereIn('status', [ServiceBookingRequest::STATUS_NEW, ServiceBookingRequest::STATUS_IN_WORK])
                    ->count(),
                'bookingNew' => ServiceBookingRequest::query()->where('status', ServiceBookingRequest::STATUS_NEW)->count(),
                'nextContactUnread' => AppNotification::query()
                    ->where('kind', 'crm_next_contact')
                    ->whereNull('read_at')
                    ->count(),
                'dueWithoutNotification' => $dueWithoutNotification,
                'pushTokens' => DevicePushToken::query()->count(),
                'pushTokensStale30d' => DevicePushToken::query()->where('updated_at', '<', now()->subDays(30))->count(),
            ],
            'bookings' => $bookingRows,
            'notifications' => $notificationRows,
            'scheduler' => [
                'lastRunAt' => $scheduler['last_run_at'] ?? null,
                'lastCreated' => $scheduler['created'] ?? null,
                'lastDryRun' => $scheduler['dry_run'] ?? null,
                'dueWithoutNotification' => $dueWithoutNotification,
            ],
            'pushLastResult' => $pushLastResult,
            'logs' => $logs,
        ]);
    }

    public function pushDevices()
    {
        $rows = DevicePushToken::query()
            ->with(['owner:id,email,name,phone', 'detailing:id,name,email,city'])
            ->latest('updated_at')
            ->limit(200)
            ->get()
            ->map(fn (DevicePushToken $row) => [
                'id' => (string) $row->id,
                'audience' => $row->owner_id ? 'owner' : 'detailing',
                'platform' => (string) $row->platform,
                'tokenPreview' => substr((string) $row->token, 0, 18).'…'.substr((string) $row->token, -8),
                'account' => $row->owner_id ? [
                    'id' => (string) $row->owner_id,
                    'email' => $row->owner?->email,
                    'name' => $row->owner?->name,
                    'phone' => $row->owner?->phone,
                ] : [
                    'id' => (string) $row->detailing_id,
                    'email' => $row->detailing?->email,
                    'name' => $row->detailing?->name,
                    'city' => $row->detailing?->city,
                ],
                'createdAt' => optional($row->created_at)->toISOString(),
                'updatedAt' => optional($row->updated_at)->toISOString(),
                'isStale' => $row->updated_at ? $row->updated_at->lt(now()->subDays(30)) : true,
            ])
            ->values();

        return response()->json(['items' => $rows]);
    }

    public function deletePushDevice(int $id)
    {
        $row = DevicePushToken::query()->findOrFail($id);
        $payload = [
            'platform' => $row->platform,
            'owner_id' => $row->owner_id,
            'detailing_id' => $row->detailing_id,
        ];
        $row->delete();
        AdminActionLog::query()->create([
            'action' => 'push_device_deleted',
            'target_type' => 'device_push_token',
            'target_id' => (string) $id,
            'payload' => $payload,
        ]);

        return response()->json(['ok' => true]);
    }

    private function bookingResource(ServiceBookingRequest $row): array
    {
        $carName = trim(implode(' ', array_filter([
            (string) $row->car?->make,
            (string) $row->car?->model,
        ]))) ?: 'Автомобиль';

        return [
            'id' => (string) $row->id,
            'status' => (string) $row->status,
            'message' => (string) ($row->message ?? ''),
            'owner' => [
                'id' => $row->owner_id ? (string) $row->owner_id : null,
                'email' => $row->owner?->email,
                'name' => $row->owner?->name,
                'phone' => $row->owner?->phone,
            ],
            'detailing' => [
                'id' => $row->detailing_id ? (string) $row->detailing_id : null,
                'name' => $row->detailing?->name,
                'email' => $row->detailing?->email,
                'city' => $row->detailing?->city,
            ],
            'car' => [
                'id' => $row->car_id ? (string) $row->car_id : null,
                'name' => $carName,
                'year' => $row->car?->year,
                'plate' => trim((string) ($row->car?->plate ?? '').' '.(string) ($row->car?->plate_region ?? '')),
                'vin' => $row->car?->vin,
                'mileageKm' => $row->car?->mileage_km,
            ],
            'createdAt' => optional($row->created_at)->toISOString(),
            'updatedAt' => optional($row->updated_at)->toISOString(),
            'closedAt' => optional($row->closed_at)->toISOString(),
        ];
    }

    private function notificationResource(AppNotification $row): array
    {
        $data = is_array($row->data) ? $row->data : [];

        return [
            'id' => (string) $row->id,
            'kind' => (string) $row->kind,
            'title' => (string) $row->title,
            'body' => (string) $row->body,
            'data' => $data,
            'readAt' => optional($row->read_at)->toISOString(),
            'sentByAdmin' => (bool) $row->sent_by_admin,
            'pushSent' => (bool) $row->push_sent,
            'pushFailed' => (bool) $row->push_failed,
            'owner' => $row->owner ? [
                'id' => (string) $row->owner->id,
                'email' => $row->owner->email,
                'name' => $row->owner->name,
                'phone' => $row->owner->phone,
            ] : null,
            'detailing' => $row->detailing ? [
                'id' => (string) $row->detailing->id,
                'email' => $row->detailing->email,
                'name' => $row->detailing->name,
                'city' => $row->detailing->city,
            ] : null,
            'createdAt' => optional($row->created_at)->toISOString(),
        ];
    }
}
