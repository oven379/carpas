<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Detailing;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class DetailingAuthController extends Controller
{
    public function register(Request $request)
    {
        $data = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'min:4', 'max:255'],
        ]);

        $email = mb_strtolower(trim($data['email']));
        if (Detailing::query()->where('email', $email)->exists()) {
            throw ValidationException::withMessages(['email' => 'email_taken']);
        }

        $d = Detailing::query()->create([
            'name' => trim($data['name'] ?? '') ?: 'Детейлинг',
            'email' => $email,
            'password' => Hash::make($data['password']),
        ]);

        $token = $d->createToken('detailing')->plainTextToken;

        return response()->json([
            'detailing' => $this->detail($d),
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
        $d = Detailing::query()->where('email', $email)->first();
        if (!$d) {
            return response()->json(['ok' => false, 'reason' => 'not_found'], 404);
        }
        if (!Hash::check($data['password'], $d->password)) {
            return response()->json(['ok' => false, 'reason' => 'bad_password'], 401);
        }

        $token = $d->createToken('detailing')->plainTextToken;
        return response()->json([
            'ok' => true,
            'detailing' => $this->detail($d),
            'token' => $token,
        ]);
    }

    public function me(Request $request)
    {
        /** @var Detailing $d */
        $d = $request->user();
        return response()->json(['detailing' => $this->detail($d)]);
    }

    private function detail(Detailing $d): array
    {
        return [
            'id' => (string) $d->id,
            'name' => $d->name,
            'email' => $d->email,
            'createdAt' => optional($d->created_at)->toISOString(),
        ];
    }
}
