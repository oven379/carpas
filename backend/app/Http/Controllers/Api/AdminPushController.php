<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdminActionLog;
use App\Models\DevicePushToken;
use App\Models\Detailing;
use App\Models\Owner;
use App\Services\FcmV1Client;
use App\Services\InternalNotificationService;
use App\Services\PushSettings;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminPushController extends Controller
{
    public function __construct(
        private readonly FcmV1Client $fcm,
        private readonly PushSettings $pushSettings,
        private readonly InternalNotificationService $notifications,
    ) {}

    public function stats()
    {
        $settings = $this->pushSettings->get();

        return response()->json([
            'total' => DevicePushToken::query()->count(),
            'owners' => DevicePushToken::query()->whereNotNull('owner_id')->count(),
            'detailings' => DevicePushToken::query()->whereNotNull('detailing_id')->count(),
            'android' => DevicePushToken::query()->where('platform', 'android')->count(),
            'ios' => DevicePushToken::query()->where('platform', 'ios')->count(),
            'expo' => DevicePushToken::query()->where('platform', 'expo')->count(),
            'last_registered_at' => DevicePushToken::query()->max('updated_at'),
            'fcm_configured' => $this->fcm->isConfigured(),
            'expo_configured' => $this->fcm->isExpoConfigured(),
            'settings' => $settings,
            'last_result' => $this->pushSettings->lastResult(),
        ]);
    }

    public function publicSettings()
    {
        $settings = $this->pushSettings->get();

        return response()->json([
            'enabled' => $settings['enabled'],
            'owners_enabled' => $settings['owners_enabled'],
            'detailings_enabled' => $settings['detailings_enabled'],
        ]);
    }

    public function updateSettings(Request $request)
    {
        $data = $request->validate([
            'enabled' => ['sometimes', 'boolean'],
            'owners_enabled' => ['sometimes', 'boolean'],
            'detailings_enabled' => ['sometimes', 'boolean'],
            'broadcast_enabled' => ['sometimes', 'boolean'],
        ]);

        $settings = $this->pushSettings->update($data);
        AdminActionLog::query()->create([
            'action' => 'push_settings_updated',
            'target_type' => 'push_settings',
            'target_id' => 'push',
            'payload' => $data,
        ]);

        return response()->json([
            'ok' => true,
            'settings' => $settings,
        ]);
    }

    public function broadcast(Request $request)
    {
        if (! $this->fcm->canSendAny()) {
            return response()->json([
                'ok' => false,
                'message' => 'Push не настроен: задайте FCM или включите EXPO_PUSH_ENABLED.',
            ], 503);
        }

        $data = $request->validate([
            'title' => ['required', 'string', 'max:120'],
            'body' => ['required', 'string', 'max:2000'],
            'audience' => ['required', 'string', Rule::in(['all', 'owners', 'detailings'])],
        ]);

        if (! $this->pushSettings->isBroadcastEnabled()) {
            return response()->json([
                'ok' => false,
                'message' => 'Push-рассылка выключена в настройках админ-панели.',
            ], 409);
        }

        if (! $this->pushSettings->isEnabledForAudience($data['audience'])) {
            return response()->json([
                'ok' => false,
                'message' => 'Для выбранной аудитории push-уведомления выключены в настройках.',
            ], 409);
        }

        $q = DevicePushToken::query()->select('token');
        if ($data['audience'] === 'owners') {
            $q->whereNotNull('owner_id');
        } elseif ($data['audience'] === 'detailings') {
            $q->whereNotNull('detailing_id');
        }

        $settings = $this->pushSettings->get();
        if ($data['audience'] === 'all') {
            $q->where(function ($inner) use ($settings) {
                if ($settings['owners_enabled']) {
                    $inner->orWhereNotNull('owner_id');
                }
                if ($settings['detailings_enabled']) {
                    $inner->orWhereNotNull('detailing_id');
                }
            });
        }

        $tokens = $q->pluck('token')->filter()->unique()->values()->all();
        $internal = $this->notifications->broadcast($data['audience'], $data['title'], $data['body'], 'admin_broadcast');

        if ($tokens === []) {
            $result = [
                'type' => 'broadcast',
                'audience' => $data['audience'],
                'sent' => 0,
                'failed' => 0,
                'internal_created' => $internal['created'],
                'errors' => [],
                'message' => 'Нет зарегистрированных устройств.',
            ];
            $this->pushSettings->rememberResult($result);
            AdminActionLog::query()->create([
                'action' => 'push_broadcast_sent',
                'target_type' => 'push_broadcast',
                'target_id' => $data['audience'],
                'payload' => $result,
            ]);

            return response()->json([
                'ok' => true,
                'sent' => 0,
                'failed' => 0,
                'internal_created' => $internal['created'],
                'message' => 'Нет зарегистрированных устройств.',
            ]);
        }

        $result = $this->fcm->sendToTokens($tokens, $data['title'], $data['body']);
        $payload = [
            'type' => 'broadcast',
            'audience' => $data['audience'],
            'sent' => $result['sent'],
            'failed' => $result['failed'],
            'internal_created' => $internal['created'],
            'errors' => $result['errors'],
        ];
        $this->pushSettings->rememberResult($payload);
        AdminActionLog::query()->create([
            'action' => 'push_broadcast_sent',
            'target_type' => 'push_broadcast',
            'target_id' => $data['audience'],
            'payload' => $payload,
        ]);

        return response()->json([
            'ok' => true,
            'sent' => $result['sent'],
            'failed' => $result['failed'],
            'internal_created' => $internal['created'],
            'errors' => $result['errors'],
        ]);
    }

    public function sendTest(Request $request)
    {
        $data = $request->validate([
            'audience' => ['required', 'string', Rule::in(['owner', 'detailing'])],
            'email' => ['required', 'email', 'max:255'],
            'title' => ['required', 'string', 'max:120'],
            'body' => ['required', 'string', 'max:2000'],
        ]);

        if (! $this->pushSettings->isEnabledForAudience($data['audience'] === 'owner' ? 'owners' : 'detailings')) {
            return response()->json([
                'ok' => false,
                'message' => 'Для выбранной аудитории push-уведомления выключены в настройках.',
            ], 409);
        }

        $owner = null;
        $detailing = null;
        if ($data['audience'] === 'owner') {
            $owner = Owner::query()->where('email', $data['email'])->first();
        } else {
            $detailing = Detailing::query()->where('email', $data['email'])->first();
        }

        if (! $owner && ! $detailing) {
            return response()->json(['ok' => false, 'message' => 'Аккаунт с такой почтой не найден.'], 404);
        }

        $tokenQuery = DevicePushToken::query()->select('token');
        if ($owner) {
            $tokenQuery->where('owner_id', $owner->id);
            $this->notifications->createForOwner($owner, $data['title'], $data['body'], 'admin_test', [], true);
        } else {
            $tokenQuery->where('detailing_id', $detailing->id);
            $this->notifications->createForDetailing($detailing, $data['title'], $data['body'], 'admin_test', [], true);
        }

        $tokens = $tokenQuery->pluck('token')->filter()->unique()->values()->all();
        if ($tokens === []) {
            $payload = [
                'type' => 'test',
                'audience' => $data['audience'],
                'email' => $data['email'],
                'sent' => 0,
                'failed' => 0,
                'internal_created' => 1,
                'errors' => [],
                'message' => 'У аккаунта нет зарегистрированных устройств.',
            ];
            $this->pushSettings->rememberResult($payload);
            AdminActionLog::query()->create([
                'action' => 'push_test_sent',
                'target_type' => $data['audience'],
                'target_id' => $data['email'],
                'payload' => $payload,
            ]);

            return response()->json([
                'ok' => true,
                'sent' => 0,
                'failed' => 0,
                'internal_created' => 1,
                'message' => 'Внутреннее уведомление создано, но устройства с push-токеном нет.',
            ]);
        }

        $result = $this->fcm->sendToTokens($tokens, $data['title'], $data['body']);
        $this->pushSettings->rememberResult([
            'type' => 'test',
            'audience' => $data['audience'],
            'email' => $data['email'],
            'sent' => $result['sent'],
            'failed' => $result['failed'],
            'internal_created' => 1,
            'errors' => $result['errors'],
        ]);
        AdminActionLog::query()->create([
            'action' => 'push_test_sent',
            'target_type' => $data['audience'],
            'target_id' => $data['email'],
            'payload' => [
                'type' => 'test',
                'audience' => $data['audience'],
                'email' => $data['email'],
                'sent' => $result['sent'],
                'failed' => $result['failed'],
                'internal_created' => 1,
                'errors' => $result['errors'],
            ],
        ]);

        return response()->json([
            'ok' => true,
            'sent' => $result['sent'],
            'failed' => $result['failed'],
            'internal_created' => 1,
            'errors' => $result['errors'],
        ]);
    }
}
