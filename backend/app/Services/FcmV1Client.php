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

    /**
     * @return array{sent: int, failed: int, errors: list<string>}
     */
    public function sendToTokens(array $tokens, string $title, string $body): array
    {
        if (! $this->isConfigured()) {
            return ['sent' => 0, 'failed' => count($tokens), 'errors' => ['fcm_not_configured']];
        }

        $accessToken = $this->fetchAccessToken();
        if ($accessToken === '') {
            return ['sent' => 0, 'failed' => count($tokens), 'errors' => ['fcm_auth_failed']];
        }

        $urlBase = 'https://fcm.googleapis.com/v1/projects/'.$this->projectId.'/messages:send';
        $sent = 0;
        $failed = 0;
        $errors = [];

        foreach (array_unique($tokens) as $token) {
            $token = trim((string) $token);
            if ($token === '') {
                continue;
            }
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
