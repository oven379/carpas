<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DevicePushToken;
use App\Models\Detailing;
use App\Models\Owner;
use App\Services\PushSettings;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DevicePushTokenController extends Controller
{
    public function __construct(
        private readonly PushSettings $pushSettings
    ) {}

    public function storeOwner(Request $request)
    {
        $data = $this->validated($request);
        if (! $this->pushSettings->isEnabledForAudience('owners')) {
            return response()->json(['ok' => true, 'push_enabled' => false]);
        }

        /** @var Owner $owner */
        $owner = $request->user();
        DevicePushToken::query()->updateOrCreate(
            ['token' => $data['token']],
            [
                'owner_id' => $owner->id,
                'detailing_id' => null,
                'platform' => $data['platform'],
            ]
        );

        return response()->json(['ok' => true]);
    }

    public function storeDetailing(Request $request)
    {
        $data = $this->validated($request);
        if (! $this->pushSettings->isEnabledForAudience('detailings')) {
            return response()->json(['ok' => true, 'push_enabled' => false]);
        }

        /** @var Detailing $detailing */
        $detailing = $request->user();
        DevicePushToken::query()->updateOrCreate(
            ['token' => $data['token']],
            [
                'owner_id' => null,
                'detailing_id' => $detailing->id,
                'platform' => $data['platform'],
            ]
        );

        return response()->json(['ok' => true]);
    }

    public function destroyOwner(Request $request)
    {
        $data = $request->validate([
            'token' => ['required', 'string', 'max:512'],
        ]);
        /** @var Owner $owner */
        $owner = $request->user();
        DevicePushToken::query()
            ->where('token', $data['token'])
            ->where('owner_id', $owner->id)
            ->delete();

        return response()->json(['ok' => true]);
    }

    public function destroyDetailing(Request $request)
    {
        $data = $request->validate([
            'token' => ['required', 'string', 'max:512'],
        ]);
        /** @var Detailing $detailing */
        $detailing = $request->user();
        DevicePushToken::query()
            ->where('token', $data['token'])
            ->where('detailing_id', $detailing->id)
            ->delete();

        return response()->json(['ok' => true]);
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'token' => ['required', 'string', 'max:512'],
            'platform' => ['required', 'string', Rule::in(['android', 'ios', 'web', 'expo'])],
        ]);
    }
}
