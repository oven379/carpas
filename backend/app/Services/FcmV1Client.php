<?php

namespace App\Services;

use App\Models\DevicePushToken;
use Google\Auth\Credentials\ServiceAccountCredentials;
use Google\Auth\HttpHandler\HttpHandlerFactory;
use GuzzleHttp\Client;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;

class FcmV1Client
{
    private ?array $serviceAccount = null;

    private ?string $projectId = null;

    public function __construct()
    {
        $this->projectId = (string) config('firebase.project_id');
        $this->serviceAccount = $this->resolveServiceAccount();
    }

    public function isConfigured(): bool
    {
        return $this->projectId !== '' && $this->serviceAccount !== null
            && isset($this->serviceAccount['private_key'], $this->serviceAccount['client_email']);
    }

    public function isExpoConfigured(): bool
    {
        return (bool) config('firebase.expo_push_enabled', true);
    }

    public function canSendAny(): bool
    {
        return $this->isConfigured() || $this->isExpoConfigured();
    }

    /**
     * @return array{sent: int, failed: int, errors: list<string>}
     */
    public function sendToTokens(array $tokens, string $title, string $body): array
    {
        $expoTokens = [];
        $fcmTokens = [];
        foreach (array_unique($tokens) as $token) {
            $token = trim((string) $token);
            if ($token === '') {
                continue;
            }
            if ($this->isExpoPushToken($token)) {
                $expoTokens[] = $token;
            } else {
                $fcmTokens[] = $token;
            }
        }

        $sent = 0;
        $failed = 0;
        $errors = [];

        if ($expoTokens !== []) {
            $result = $this->sendExpoTokens($expoTokens, $title, $body);
            $sent += $result['sent'];
            $failed += $result['failed'];
            $errors = array_merge($errors, $result['errors']);
        }

        if ($fcmTokens === []) {
            return ['sent' => $sent, 'failed' => $failed, 'errors' => array_slice(array_unique($errors), 0, 10)];
        }

        if (! $this->isConfigured()) {
            return [
                'sent' => $sent,
                'failed' => $failed + count($fcmTokens),
                'errors' => array_slice(array_unique(array_merge($errors, ['fcm_not_configured'])), 0, 10),
            ];
        }

        $accessToken = $this->fetchAccessToken();
        if ($accessToken === '') {
            return [
                'sent' => $sent,
                'failed' => $failed + count($fcmTokens),
                'errors' => array_slice(array_unique(array_merge($errors, ['fcm_auth_failed'])), 0, 10),
            ];
        }

        $urlBase = 'https://fcm.googleapis.com/v1/projects/'.$this->projectId.'/messages:send';

        foreach ($fcmTokens as $token) {
            $payload = [
                'message' => [
                    'token' => $token,
                    'notification' => [
                        'title' => $title,
                        'body' => $body,
                    ],
                    'android' => [
                        'priority' => 'HIGH',
                    ],
                    'apns' => [
                        'payload' => [
                            'aps' => [
                                'sound' => 'default',
                                'badge' => 1,
                            ],
                        ],
                    ],
                ],
            ];

            try {
                $res = Http::withToken($accessToken)
                    ->timeout(20)
                    ->post($urlBase, $payload);

                if ($res->successful()) {
                    $sent++;
                    continue;
                }

                $failed++;
                $bodyStr = $res->body();
                $errors[] = 'HTTP '.$res->status().': '.substr($bodyStr, 0, 200);
                $this->maybePruneInvalidToken($token, $res->status(), $bodyStr);
            } catch (\Throwable $e) {
                $failed++;
                $errors[] = $e->getMessage();
                Log::warning('fcm_send_failed', ['token_prefix' => substr($token, 0, 12), 'e' => $e->getMessage()]);
            }
        }

        return ['sent' => $sent, 'failed' => $failed, 'errors' => array_slice(array_unique($errors), 0, 10)];
    }

    private function isExpoPushToken(string $token): bool
    {
        return str_starts_with($token, 'ExponentPushToken[') || str_starts_with($token, 'ExpoPushToken[');
    }

    /**
     * @return array{sent: int, failed: int, errors: list<string>}
     */
    private function sendExpoTokens(array $tokens, string $title, string $body): array
    {
        if (! $this->isExpoConfigured()) {
            return ['sent' => 0, 'failed' => count($tokens), 'errors' => ['expo_push_not_configured']];
        }

        $sent = 0;
        $failed = 0;
        $errors = [];

        foreach (array_chunk(array_values(array_unique($tokens)), 100) as $chunk) {
            $messages = array_map(fn (string $token) => [
                'to' => $token,
                'title' => $title,
                'body' => $body,
                'sound' => 'default',
                'badge' => 1,
            ], $chunk);

            try {
                $res = Http::timeout(20)
                    ->withHeaders(['Accept' => 'application/json'])
                    ->post('https://exp.host/--/api/v2/push/send', $messages);

                if (! $res->successful()) {
                    $failed += count($chunk);
                    $errors[] = 'Expo HTTP '.$res->status().': '.substr($res->body(), 0, 200);
                    continue;
                }

                $data = $res->json('data');
                $rows = is_array($data) ? $data : [];
                foreach ($rows as $idx => $row) {
                    if (is_array($row) && ($row['status'] ?? '') === 'ok') {
                        $sent++;
                        continue;
                    }
                    $failed++;
                    $token = $chunk[$idx] ?? '';
                    $details = is_array($row['details'] ?? null) ? $row['details'] : [];
                    $error = (string) ($details['error'] ?? $row['message'] ?? 'expo_push_failed');
                    $errors[] = $error;
                    if (in_array($error, ['DeviceNotRegistered', 'InvalidCredentials'], true) && $token !== '') {
                        DevicePushToken::query()->where('token', $token)->delete();
                    }
                }
            } catch (\Throwable $e) {
                $failed += count($chunk);
                $errors[] = $e->getMessage();
                Log::warning('expo_push_send_failed', ['e' => $e->getMessage()]);
            }
        }

        return ['sent' => $sent, 'failed' => $failed, 'errors' => array_slice(array_unique($errors), 0, 10)];
    }

    private function maybePruneInvalidToken(string $token, int $status, string $body): void
    {
        $b = strtolower($body);
        if ($status === 404 || str_contains($b, 'not_found') || str_contains($b, 'unregistered') || str_contains($b, 'invalid-argument')) {
            DevicePushToken::query()->where('token', $token)->delete();
        }
    }

    private function fetchAccessToken(): string
    {
        try {
            $creds = new ServiceAccountCredentials(
                'https://www.googleapis.com/auth/firebase.messaging',
                $this->serviceAccount
            );
            $handler = HttpHandlerFactory::build(new Client(['timeout' => 15]));
            $t = $creds->fetchAuthToken($handler);

            return is_array($t) && isset($t['access_token']) ? (string) $t['access_token'] : '';
        } catch (\Throwable $e) {
            Log::error('fcm_oauth_failed', ['e' => $e->getMessage()]);

            return '';
        }
    }

    private function resolveServiceAccount(): ?array
    {
        $b64 = (string) config('firebase.credentials_b64');
        if ($b64 !== '') {
            $raw = base64_decode($b64, true);
            if ($raw !== false) {
                $json = json_decode($raw, true);
                if (is_array($json)) {
                    return $json;
                }
            }
        }

        $path = (string) config('firebase.credentials_path');
        if ($path !== '' && is_readable($path)) {
            $raw = file_get_contents($path);
            $json = json_decode((string) $raw, true);

            return is_array($json) ? $json : null;
        }

        return null;
    }
}
