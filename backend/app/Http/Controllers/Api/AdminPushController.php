<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DevicePushToken;
use App\Services\FcmV1Client;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminPushController extends Controller
{
    public function __construct(
        private readonly FcmV1Client $fcm
    ) {}

    public function stats()
    {
        return response()->json([
            'total' => DevicePushToken::query()->count(),
            'owners' => DevicePushToken::query()->whereNotNull('owner_id')->count(),
            'detailings' => DevicePushToken::query()->whereNotNull('detailing_id')->count(),
            'android' => DevicePushToken::query()->where('platform', 'android')->count(),
            'ios' => DevicePushToken::query()->where('platform', 'ios')->count(),
            'fcm_configured' => $this->fcm->isConfigured(),
        ]);
    }

    public function broadcast(Request $request)
    {
        if (! $this->fcm->isConfigured()) {
            return response()->json([
                'ok' => false,
                'message' => 'FCM не настроен: задайте FIREBASE_PROJECT_ID и JSON сервисного аккаунта (см. backend/.env.example).',
            ], 503);
        }

        $data = $request->validate([
            'title' => ['required', 'string', 'max:120'],
            'body' => ['required', 'string', 'max:2000'],
            'audience' => ['required', 'string', Rule::in(['all', 'owners', 'detailings'])],
        ]);

        $q = DevicePushToken::query()->select('token');
        if ($data['audience'] === 'owners') {
            $q->whereNotNull('owner_id');
        } elseif ($data['audience'] === 'detailings') {
            $q->whereNotNull('detailing_id');
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
