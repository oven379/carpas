<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DevicePushToken;
use App\Services\FcmV1Client;
use App\Services\PushSettings;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminPushController extends Controller
{
    public function __construct(
        private readonly FcmV1Client $fcm,
        private readonly PushSettings $pushSettings
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
            'fcm_configured' => $this->fcm->isConfigured(),
            'expo_configured' => $this->fcm->isExpoConfigured(),
            'settings' => $settings,
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

        return response()->json([
            'ok' => true,
            'settings' => $this->pushSettings->update($data),
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

        if ($tokens === []) {
            return response()->json([
                'ok' => true,
                'sent' => 0,
                'failed' => 0,
                'message' => 'Нет зарегистрированных устройств.',
            ]);
        }

        $result = $this->fcm->sendToTokens($tokens, $data['title'], $data['body']);

        return response()->json([
            'ok' => true,
            'sent' => $result['sent'],
            'failed' => $result['failed'],
            'errors' => $result['errors'],
        ]);
    }
}
