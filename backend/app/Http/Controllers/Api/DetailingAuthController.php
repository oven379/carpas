<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Support\ApiResources;
use App\Models\Detailing;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class DetailingAuthController extends Controller
{
    public function register(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'password' => ['nullable', 'string', 'min:4', 'max:255'],
            'contactName' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:80'],
            'city' => ['required', 'string', 'max:255'],
            'address' => ['required', 'string', 'max:500'],
            'servicesOffered' => ['required', 'array', 'min:1'],
            'servicesOffered.*' => ['string', 'max:255'],
        ]);

        $email = mb_strtolower(trim($data['email']));
        if (Detailing::query()->where('email', $email)->exists()) {
            throw ValidationException::withMessages(['email' => 'email_taken']);
        }

        $pwd = trim((string) ($data['password'] ?? ''));
        if ($pwd === '') {
            $pwd = '1111';
        }

        $d = Detailing::query()->create([
            'name' => trim($data['name']),
            'email' => $email,
            'password' => Hash::make($pwd),
            'contact_name' => trim($data['contactName']),
            'phone' => trim($data['phone']),
            'city' => trim($data['city']),
            'address' => trim($data['address']),
            'services_offered' => array_values($data['servicesOffered']),
            'profile_completed' => false,
            'is_personal' => false,
        ]);

        $token = $d->createToken('detailing')->plainTextToken;

        return response()->json([
            'detailing' => ApiResources::detailing($d),
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
        $d = Detailing::query()
            ->where('email', $email)
            ->where('is_personal', false)
            ->first();
        if (!$d) {
            return response()->json(['ok' => false, 'reason' => 'not_found'], 404);
        }
        if (!Hash::check($data['password'], $d->password)) {
            return response()->json(['ok' => false, 'reason' => 'bad_password'], 401);
        }

        $token = $d->createToken('detailing')->plainTextToken;

        return response()->json([
            'ok' => true,
            'detailing' => ApiResources::detailing($d),
            'token' => $token,
        ]);
    }

    public function me(Request $request)
    {
        /** @var Detailing $d */
        $d = $request->user();

        return response()->json(['detailing' => ApiResources::detailing($d)]);
    }

    public function updateMe(Request $request)
    {
        /** @var Detailing $d */
        $d = $request->user();
        if ($d->is_personal) {
            abort(403);
        }

        $patch = $request->all();
        if (array_key_exists('name', $patch)) {
            $d->name = trim((string) $patch['name']);
        }
        if (array_key_exists('contactName', $patch)) {
            $d->contact_name = trim((string) $patch['contactName']);
        }
        if (array_key_exists('phone', $patch)) {
            $d->phone = trim((string) $patch['phone']);
        }
        if (array_key_exists('city', $patch)) {
            $d->city = trim((string) $patch['city']);
        }
        if (array_key_exists('address', $patch)) {
            $d->address = trim((string) $patch['address']);
        }
        if (array_key_exists('description', $patch)) {
            $d->description = trim((string) $patch['description']);
        }
        if (array_key_exists('website', $patch)) {
            $d->website = trim((string) $patch['website']);
        }
        if (array_key_exists('telegram', $patch)) {
            $d->telegram = trim((string) $patch['telegram']);
        }
        if (array_key_exists('instagram', $patch)) {
            $d->instagram = trim((string) $patch['instagram']);
        }
        if (array_key_exists('logo', $patch)) {
            $d->logo = $patch['logo'] === null ? null : (string) $patch['logo'];
        }
        if (array_key_exists('cover', $patch)) {
            $d->cover = $patch['cover'] === null ? null : (string) $patch['cover'];
        }
        if (array_key_exists('servicesOffered', $patch) && is_array($patch['servicesOffered'])) {
            $d->services_offered = array_values(array_map('strval', $patch['servicesOffered']));
        }
        if (array_key_exists('profileCompleted', $patch)) {
            $d->profile_completed = (bool) $patch['profileCompleted'];
        }

        $d->save();

        return response()->json(['detailing' => ApiResources::detailing($d->fresh())]);
    }
}
