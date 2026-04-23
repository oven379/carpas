<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Support\ApiResources;
use App\Http\Support\TextFormat;
use App\Models\Detailing;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Tigusigalpa\YandexID\Exceptions\ApiException;
use Tigusigalpa\YandexID\Exceptions\InvalidRequestException;
use Tigusigalpa\YandexID\Facades\YandexId;

class DetailingYandexOAuthController extends Controller
{
    public function url(Request $request)
    {
        if (!$this->isConfigured()) {
            return response()->json(['ok' => false, 'reason' => 'yandex_oauth_not_configured'], 503);
        }

        $state = Str::random(48);
        Cache::put($this->stateCacheKey($state), true, now()->addMinutes(15));

        $authUrl = YandexId::authUrl($state);

        return response()->json([
            'ok' => true,
            'url' => $authUrl,
            'state' => $state,
        ]);
    }

    public function callback(Request $request)
    {
        if (!$this->isConfigured()) {
            return response()->json(['ok' => false, 'reason' => 'yandex_oauth_not_configured'], 503);
        }

        $data = $request->validate([
            'code' => ['required', 'string'],
            'state' => ['required', 'string'],
        ]);

        if (!Cache::pull($this->stateCacheKey($data['state']))) {
            return response()->json(['ok' => false, 'reason' => 'invalid_state'], 422);
        }

        try {
            $tokenResponse = YandexId::exchangeCode($data['code']);
            $profile = YandexId::getUserInfo($tokenResponse->accessToken);
        } catch (InvalidRequestException $e) {
            return response()->json([
                'ok' => false,
                'reason' => 'oauth_error',
                'message' => $e->getMessage(),
            ], 422);
        } catch (ApiException $e) {
            report($e);

            return response()->json(['ok' => false, 'reason' => 'yandex_api_error'], 502);
        }

        $yandexId = $profile->id;
        if ($yandexId === '') {
            return response()->json(['ok' => false, 'reason' => 'profile_incomplete'], 422);
        }

        $emailRaw = $profile->getPrimaryEmail();
        $email = $emailRaw ? mb_strtolower(trim($emailRaw)) : '';

        $detailing = Detailing::query()->where('yandex_id', $yandexId)->first();

        if (!$detailing && $email !== '') {
            $existing = Detailing::query()->where('email', $email)->first();
            if ($existing) {
                if ($existing->yandex_id !== null && $existing->yandex_id !== $yandexId) {
                    return response()->json(['ok' => false, 'reason' => 'email_yandex_conflict'], 409);
                }
                $existing->yandex_id = $yandexId;
                if (trim((string) $existing->name) === '') {
                    $dn = $profile->getDisplayName();
                    if ($dn) {
                        $existing->name = TextFormat::mbUcfirst($dn);
                    }
                }
                $existing->save();
                $detailing = $existing->fresh();
            }
        }

        if (!$detailing) {
            $finalEmail = $email !== '' ? $email : ('yandex+'.$yandexId.'@oauth.local');
            if (Detailing::query()->where('email', $finalEmail)->exists()) {
                return response()->json(['ok' => false, 'reason' => 'email_taken'], 409);
            }

            $detailing = Detailing::query()->create([
                'name' => TextFormat::mbUcfirst($profile->getDisplayName() ?: 'Детейлинг'),
                'email' => $finalEmail,
                'password' => Hash::make(Str::random(64)),
                'yandex_id' => $yandexId,
                'profile_completed' => false,
                'verification_approved_at' => now(),
            ]);
        }

        if ($detailing->verification_approved_at === null) {
            return response()->json([
                'ok' => false,
                'reason' => 'pending_verification',
                'message' => 'Аккаунт ещё на проверке. Мы свяжемся с вами для верификации; после подтверждения вход через Яндекс станет доступен.',
            ], 422);
        }

        $plain = $detailing->createToken('detailing')->plainTextToken;

        return response()->json([
            'ok' => true,
            'detailing' => ApiResources::detailing($detailing),
            'token' => $plain,
        ]);
    }

    private function isConfigured(): bool
    {
        $c = config('yandexid', []);

        return !empty($c['client_id'])
            && !empty($c['client_secret'])
            && !empty($c['redirect_uri']);
    }

    private function stateCacheKey(string $state): string
    {
        return 'yandex_oauth_state:'.hash('sha256', $state);
    }

}
