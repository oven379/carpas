<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Support\ApiResources;
use App\Http\Support\GarageSlug;
use App\Http\Support\MediaStorage;
use App\Http\Support\PendingOwnerCars;
use App\Http\Support\TextFormat;
use App\Models\Detailing;
use App\Models\Owner;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class OwnerAuthController extends Controller
{
    private const DUPLICATE_OWNER_EMAIL = 'Этот email уже зарегистрирован. Войдите через «В гараж» с паролем.';

    private function isUniqueViolationOnOwnerEmail(QueryException $e): bool
    {
        $m = $e->getMessage();

        return str_contains($m, 'owners_email_unique')
            || (str_contains($m, 'UNIQUE constraint failed') && str_contains($m, 'owners') && str_contains($m, 'email'));
    }

    public function register(Request $request)
    {
        $request->merge([
            'name' => trim((string) $request->input('name', '')),
            'phone' => trim((string) $request->input('phone', '')),
        ]);

        $data = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'min:4', 'max:255'],
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:80'],
        ]);

        $email = mb_strtolower(trim($data['email']));
        if (Owner::query()->where('email', $email)->exists()) {
            throw ValidationException::withMessages(['email' => self::DUPLICATE_OWNER_EMAIL]);
        }

        try {
            $owner = Owner::query()->create([
                'email' => $email,
                'password' => Hash::make($data['password']),
                'name' => TextFormat::mbUcfirst($data['name']),
                'phone' => trim((string) $data['phone']),
                'garage_banner_enabled' => false,
                'garage_private' => true,
            ]);
        } catch (QueryException $e) {
            if ($this->isUniqueViolationOnOwnerEmail($e)) {
                throw ValidationException::withMessages(['email' => self::DUPLICATE_OWNER_EMAIL]);
            }
            throw $e;
        }

        Detailing::query()->create([
            'name' => TextFormat::mbUcfirst($owner->name) ?: 'Мой гараж',
            'email' => 'owner-'.$owner->id.'@garage.internal',
            'password' => Hash::make(Str::random(48)),
            'is_personal' => true,
            'owner_id' => $owner->id,
            'profile_completed' => true,
        ]);

        PendingOwnerCars::claimForOwner($owner);

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

        PendingOwnerCars::claimForOwner($owner);

        return response()->json([
            'ok' => true,
            'owner' => ApiResources::owner($owner),
            'token' => $token,
        ]);
    }

    public function forgotPassword(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:255'],
        ]);
        $email = mb_strtolower(trim($data['email']));
        $owner = Owner::query()->where('email', $email)->first();

        if ($owner) {
            $plain = bin2hex(random_bytes(8));
            $owner->password = Hash::make($plain);
            $owner->save();
            $owner->tokens()->delete();

            $body = implode("\n", [
                'Здравствуйте!',
                '',
                'Вы запросили восстановление доступа к КарПас (кабинет владельца).',
                'Логин (почта): '.$owner->email,
                'Новый пароль: '.$plain,
                '',
                'Войдите с этими данными. При желании смените пароль в настройках гаража.',
                '',
                'Если это были не вы, войдите и сразу установите свой пароль.',
            ]);

            try {
                Mail::raw($body, function ($message) use ($email) {
                    $message->to($email)->subject('КарПас: восстановление доступа');
                });
            } catch (\Throwable $e) {
                Log::error('owner_forgot_password_mail_failed', [
                    'email' => $email,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return response()->json([
            'ok' => true,
            'message' => 'Если указанная почта зарегистрирована, мы отправили на неё письмо с логином и новым паролем.',
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

        if ($request->filled('newPassword')) {
            $pwdData = $request->validate([
                'currentPassword' => ['required', 'string'],
                'newPassword' => ['required', 'string', 'min:4', 'max:255'],
            ]);
            if (!Hash::check($pwdData['currentPassword'], $o->password)) {
                throw ValidationException::withMessages([
                    'currentPassword' => ['Неверный текущий пароль.'],
                ]);
            }
            $o->password = Hash::make($pwdData['newPassword']);
            $o->save();
            $o->tokens()->delete();

            return response()->json([
                'owner' => ApiResources::owner($o->fresh()),
                'passwordChanged' => true,
            ]);
        }

        $patch = $request->all();

        if (array_key_exists('name', $patch)) {
            $n = TextFormat::mbUcfirst((string) $patch['name']);
            if (mb_strlen($n) > 255) {
                $n = mb_substr($n, 0, 255);
            }
            $o->name = $n;
        }
        if (array_key_exists('phone', $patch)) {
            $p = trim((string) $patch['phone']);
            if (mb_strlen($p) > 80) {
                $p = mb_substr($p, 0, 80);
            }
            $o->phone = $p;
        }
        if (array_key_exists('garageCity', $patch)) {
            $o->garage_city = trim((string) $patch['garageCity']);
        }
        if (array_key_exists('showCityPublic', $patch)) {
            $o->show_city_public = (bool) $patch['showCityPublic'];
        }
        if (array_key_exists('garageWebsite', $patch)) {
            $w = trim((string) $patch['garageWebsite']);
            if (mb_strlen($w) > 512) {
                $w = mb_substr($w, 0, 512);
            }
            $o->garage_website = $w;
        }
        if (array_key_exists('showWebsitePublic', $patch)) {
            $o->show_website_public = (bool) $patch['showWebsitePublic'];
        }
        if (array_key_exists('garageSocial', $patch)) {
            $v = $patch['garageSocial'];
            $o->garage_social = $v === null || $v === '' ? null : (string) $v;
        }
        if (array_key_exists('garageVisitSelfAdvice', $patch)) {
            $raw = $patch['garageVisitSelfAdvice'];
            $t = $raw === null || $raw === '' ? '' : trim((string) $raw);
            if (mb_strlen($t) > 2000) {
                $t = mb_substr($t, 0, 2000);
            }
            $o->garage_visit_self_advice = $t === '' ? null : $t;
        }
        if (array_key_exists('showSocialPublic', $patch)) {
            $o->show_social_public = (bool) $patch['showSocialPublic'];
        }
        if (array_key_exists('garageSlug', $patch)) {
            $slug = GarageSlug::normalize((string) $patch['garageSlug']);
            if ($slug !== '') {
                $slugLower = mb_strtolower($slug);
                $taken = Owner::query()
                    ->whereRaw('lower(trim(garage_slug)) = ?', [$slugLower])
                    ->where('id', '!=', $o->id)
                    ->exists();
                if ($taken) {
                    throw ValidationException::withMessages([
                        'garageSlug' => 'Этот адрес страницы уже занят. Укажите другой.',
                    ]);
                }
            }
            $o->garage_slug = $slug === '' ? null : $slug;
        }
        if (array_key_exists('garageBannerEnabled', $patch)) {
            $o->garage_banner_enabled = (bool) $patch['garageBannerEnabled'];
        }
        if (array_key_exists('garageBanner', $patch)) {
            $raw = $patch['garageBanner'];
            $incoming = ($raw !== null && $raw !== '') ? (string) $raw : null;
            $o->garage_banner = MediaStorage::ingestScalar(
                $incoming,
                $o->garage_banner,
                'owners/'.$o->id,
                'banner',
            );
        }
        if (array_key_exists('garageAvatar', $patch)) {
            $raw = $patch['garageAvatar'];
            $incoming = ($raw !== null && $raw !== '') ? (string) $raw : null;
            $o->garage_avatar = MediaStorage::ingestScalar(
                $incoming,
                $o->garage_avatar,
                'owners/'.$o->id,
                'avatar',
            );
        }
        if (array_key_exists('showPhonePublic', $patch)) {
            $o->show_phone_public = (bool) $patch['showPhonePublic'];
        }
        if (array_key_exists('garagePrivate', $patch)) {
            $o->garage_private = (bool) $patch['garagePrivate'];
        }
        if (array_key_exists('isPremium', $patch)) {
            $o->is_premium = (bool) $patch['isPremium'];
        }

        try {
            $o->save();
        } catch (QueryException $e) {
            $state = $e->errorInfo[0] ?? '';
            // PostgreSQL: нет колонки / нет таблицы / нарушение уникальности slug
            if (in_array($state, ['42703', '42P01'], true)) {
                return response()->json([
                    'message' =>
                        'База данных не обновлена: не хватает колонок для профиля гаража. '
                        .'На сервере выполните: php artisan migrate '
                        .'(в Docker: docker compose exec backend php artisan migrate).',
                    'code' => 'schema_outdated',
                ], 503);
            }
            $msgLower = mb_strtolower($e->getMessage());
            $slugUniqueViolated =
                str_contains($msgLower, 'garage_slug')
                && (
                    $state === '23505'
                    || $state === '23000'
                    || str_contains($msgLower, 'unique')
                    || str_contains($msgLower, 'duplicate')
                );
            if ($slugUniqueViolated) {
                throw ValidationException::withMessages([
                    'garageSlug' => 'Этот адрес страницы уже занят. Укажите другой.',
                ]);
            }
            throw $e;
        }

        return response()->json(['owner' => ApiResources::owner($o->fresh())]);
    }
}
