<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Support\ApiResources;
use App\Models\Detailing;
use App\Models\Owner;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class OwnerAuthController extends Controller
{
    public function register(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'min:4', 'max:255'],
            'name' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:80'],
        ]);

        $email = mb_strtolower(trim($data['email']));
        if (Owner::query()->where('email', $email)->exists()) {
            throw ValidationException::withMessages(['email' => 'email_taken']);
        }

        $owner = Owner::query()->create([
            'email' => $email,
            'password' => Hash::make($data['password']),
            'name' => trim((string) ($data['name'] ?? '')) ?: 'Владелец',
            'phone' => trim((string) ($data['phone'] ?? '')),
        ]);

        Detailing::query()->create([
            'name' => trim($owner->name) ?: 'Мой гараж',
            'email' => 'owner-'.$owner->id.'@garage.internal',
            'password' => Hash::make(Str::random(48)),
            'is_personal' => true,
            'owner_id' => $owner->id,
            'profile_completed' => true,
        ]);

        $token = $owner->createToken('owner')->plainTextToken;

        return response()->json([
            'owner' => ApiResources::owner($owner),
            'token' => $token,
        ]);
    }

    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $email = mb_strtolower(trim($data['email']));
        $owner = Owner::query()->where('email', $email)->first();
        if (!$owner) {
            return response()->json(['ok' => false, 'reason' => 'not_found'], 404);
        }
        if (!Hash::check($data['password'], $owner->password)) {
            return response()->json(['ok' => false, 'reason' => 'bad_password'], 401);
        }

        $token = $owner->createToken('owner')->plainTextToken;

        return response()->json([
            'ok' => true,
            'owner' => ApiResources::owner($owner),
            'token' => $token,
        ]);
    }

    public function me(Request $request)
    {
        /** @var Owner $o */
        $o = $request->user();

        return response()->json(['owner' => ApiResources::owner($o)]);
    }

    public function updateMe(Request $request)
    {
        /** @var Owner $o */
        $o = $request->user();
        $patch = $request->all();

        if (array_key_exists('name', $patch)) {
            $o->name = trim((string) $patch['name']);
        }
        if (array_key_exists('phone', $patch)) {
            $o->phone = trim((string) $patch['phone']);
        }
        if (array_key_exists('garageSlug', $patch)) {
            $slug = trim((string) $patch['garageSlug']);
            if ($slug !== '') {
                $taken = Owner::query()
                    ->where('garage_slug', $slug)
                    ->where('id', '!=', $o->id)
                    ->exists();
                if ($taken) {
                    throw ValidationException::withMessages(['garageSlug' => 'slug_taken']);
                }
            }
            $o->garage_slug = $slug === '' ? null : $slug;
        }
        if (array_key_exists('garageBanner', $patch)) {
            $o->garage_banner = $patch['garageBanner'] ? (string) $patch['garageBanner'] : null;
        }
        if (array_key_exists('garageAvatar', $patch)) {
            $o->garage_avatar = $patch['garageAvatar'] ? (string) $patch['garageAvatar'] : null;
        }
        if (array_key_exists('showPhonePublic', $patch)) {
            $o->show_phone_public = (bool) $patch['showPhonePublic'];
        }
        if (array_key_exists('isPremium', $patch)) {
            $o->is_premium = (bool) $patch['isPremium'];
        }

        $o->save();

        return response()->json(['owner' => ApiResources::owner($o->fresh())]);
    }
}
