<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Support\AccountPhoneUniqueness;
use App\Http\Support\ApiResources;
use App\Http\Support\MediaStorage;
use App\Http\Support\PendingOwnerPool;
use App\Http\Support\ServiceOfferedCatalog;
use App\Http\Support\TextFormat;
use App\Models\Detailing;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

class DetailingAuthController extends Controller
{
    private const LOCAL_DEMO_EMAIL = 'studio@demo.car';
    private const LOCAL_DEMO_PASSWORD = '1111';

    private function isLocalDemoLogin(string $email, string $password): bool
    {
        return ! app()->environment('production')
            && $email === self::LOCAL_DEMO_EMAIL
            && $password === self::LOCAL_DEMO_PASSWORD;
    }

    private function ensureLocalDemoDetailing(): Detailing
    {
        return Detailing::query()->updateOrCreate(
            ['email' => self::LOCAL_DEMO_EMAIL],
            [
                'name' => 'Демо Студия Детейлинга',
                'password' => Hash::make(self::LOCAL_DEMO_PASSWORD),
                'phone' => '+79991234567',
                'contact_name' => 'Алексей',
                'city' => 'Москва',
                'address' => 'ул. Примерная, д. 1',
                'description' => 'Демо-аккаунт партнёра: авто, визиты, заявки на привязку, витрина для маркета.',
                'website' => 'https://example.com',
                'telegram' => '@demo_detailing',
                'instagram' => '@demo_detailing',
                'services_offered' => ['Керамика', 'Мойка', 'Полировка', 'Химчистка', 'PPF'],
                'maintenance_services_offered' => [],
                'profile_completed' => true,
                'verification_approved_at' => now(),
            ],
        );
    }

    public function register(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'password' => ['nullable', 'string', 'min:8', 'max:255'],
            'contactName' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:80'],
            'city' => ['required', 'string', 'max:255'],
            'address' => ['required', 'string', 'max:500'],
            'servicesOffered' => ['nullable', 'array'],
            'servicesOffered.*' => ['string', 'max:255'],
        ]);

        $email = mb_strtolower(trim($data['email']));
        if (Detailing::query()->where('email', $email)->exists()) {
            throw ValidationException::withMessages(['email' => 'email_taken']);
        }

        AccountPhoneUniqueness::assertUniqueAcrossAccounts(trim($data['phone']));

        $pwd = trim((string) ($data['password'] ?? ''));
        if ($pwd === '') {
            $pwd = '1111';
        }

        $offered = $data['servicesOffered'] ?? [];
        if (!is_array($offered)) {
            $offered = [];
        }
        $split = ServiceOfferedCatalog::splitFlatToBuckets($offered);

        $d = Detailing::query()->create([
            'name' => TextFormat::mbUcfirst($data['name']),
            'email' => $email,
            'password' => Hash::make($pwd),
            'contact_name' => TextFormat::mbUcfirst($data['contactName']),
            'phone' => trim($data['phone']),
            'city' => trim($data['city']),
            'address' => trim($data['address']),
            'services_offered' => $split['det'],
            'maintenance_services_offered' => $split['maint'],
            'profile_completed' => false,
            'verification_approved_at' => null,
        ]);

        return response()->json([
            'detailing' => ApiResources::detailing($d->fresh()),
            'token' => null,
            'pendingVerification' => true,
            'message' => 'Заявка принята. Вскоре с вами свяжутся по указанным контактам для верификации аккаунта. После подтверждения можно будет войти на экране «Вход партнёра».',
        ]);
    }

    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $email = mb_strtolower(trim($data['email']));
        if ($this->isLocalDemoLogin($email, (string) $data['password'])) {
            $d = $this->ensureLocalDemoDetailing();

            return response()->json([
                'ok' => true,
                'detailing' => ApiResources::detailing($d->fresh()),
                'token' => $d->createToken('detailing')->plainTextToken,
            ]);
        }

        $d = Detailing::query()
            ->where('email', $email)
            ->where('email', '!=', PendingOwnerPool::DETAILING_EMAIL)
            ->first();
        if (!$d) {
            return response()->json(['ok' => false, 'reason' => 'not_found'], 422);
        }
        if (!Hash::check($data['password'], $d->password)) {
            return response()->json(['ok' => false, 'reason' => 'bad_password'], 401);
        }

        if ($d->verification_approved_at === null) {
            return response()->json([
                'ok' => false,
                'reason' => 'pending_verification',
                'message' => 'Аккаунт ещё на проверке. Мы свяжемся с вами для верификации; после подтверждения вход станет доступен.',
            ], 422);
        }

        $token = $d->createToken('detailing')->plainTextToken;

        return response()->json([
            'ok' => true,
            'detailing' => ApiResources::detailing($d),
            'token' => $token,
        ]);
    }

    public function forgotPassword(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:255'],
        ]);
        $email = mb_strtolower(trim($data['email']));
        $d = Detailing::query()
            ->where('email', $email)
            ->where('email', '!=', PendingOwnerPool::DETAILING_EMAIL)
            ->first();

        if ($d) {
            $plain = bin2hex(random_bytes(8));
            $d->password = Hash::make($plain);
            $d->save();
            $d->tokens()->delete();

            $body = implode("\n", [
                'Здравствуйте!',
                '',
                'Вы запросили восстановление доступа к КарПас (кабинет сервиса / детейлинга).',
                'Логин (почта): '.$d->email,
                'Новый пароль: '.$plain,
                '',
                'Войдите с этими данными. При желании смените пароль в настройках лендинга.',
                '',
                'Если это были не вы, войдите и сразу установите свой пароль.',
            ]);

            try {
                Mail::raw($body, function ($message) use ($email) {
                    $message->to($email)->subject('КарПас: восстановление доступа (партнёр)');
                });
            } catch (\Throwable $e) {
                Log::error('detailing_forgot_password_mail_failed', [
                    'email' => $email,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return response()->json([
            'ok' => true,
            'message' => 'Если указанная почта зарегистрирована у партнёра, мы отправили на неё письмо с логином и новым паролем.',
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

        if ($request->filled('newPassword')) {
            $pwdData = $request->validate([
                'currentPassword' => ['required', 'string'],
                'newPassword' => ['required', 'string', 'min:8', 'max:255'],
            ]);
            if (!Hash::check($pwdData['currentPassword'], $d->password)) {
                throw ValidationException::withMessages([
                    'currentPassword' => ['Неверный текущий пароль.'],
                ]);
            }
            $d->password = Hash::make($pwdData['newPassword']);
            $d->save();
            $d->tokens()->delete();

            return response()->json([
                'detailing' => ApiResources::detailing($d->fresh()),
                'passwordChanged' => true,
            ]);
        }

        $patch = $request->all();
        if (array_key_exists('name', $patch)) {
            $d->name = TextFormat::mbUcfirst((string) $patch['name']);
        }
        if (array_key_exists('contactName', $patch)) {
            $d->contact_name = TextFormat::mbUcfirst((string) $patch['contactName']);
        }
        if (array_key_exists('phone', $patch)) {
            $nextPhone = trim((string) $patch['phone']);
            AccountPhoneUniqueness::assertUniqueAcrossAccounts($nextPhone, null, (int) $d->id);
            $d->phone = $nextPhone;
        }
        if (array_key_exists('city', $patch)) {
            $d->city = trim((string) $patch['city']);
        }
        if (array_key_exists('address', $patch)) {
            $d->address = trim((string) $patch['address']);
        }
        if (array_key_exists('inn', $patch)) {
            $d->inn = trim((string) $patch['inn']);
        }
        if (array_key_exists('legalName', $patch)) {
            $d->legal_name = trim((string) $patch['legalName']);
        }
        if (array_key_exists('masterName', $patch)) {
            $d->master_name = trim((string) $patch['masterName']);
        }
        if (array_key_exists('warrantyText', $patch)) {
            $wt = trim((string) $patch['warrantyText']);
            if (mb_strlen($wt) > 5000) {
                $wt = mb_substr($wt, 0, 5000);
            }
            $d->warranty_text = $wt;
        }
        if (array_key_exists('description', $patch)) {
            $d->description = trim((string) $patch['description']);
        }
        if (array_key_exists('workingHours', $patch)) {
            $wh = trim((string) $patch['workingHours']);
            if (mb_strlen($wh) > 200) {
                $wh = mb_substr($wh, 0, 200);
            }
            $d->working_hours = $wh;
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
            $raw = $patch['logo'];
            $incoming = ($raw !== null && $raw !== '') ? (string) $raw : null;
            $d->logo = MediaStorage::ingestScalar(
                $incoming,
                $d->logo,
                'detailings/'.$d->id,
                'logo',
            );
        }
        if (array_key_exists('cover', $patch)) {
            $raw = $patch['cover'];
            $incoming = ($raw !== null && $raw !== '') ? (string) $raw : null;
            $d->cover = MediaStorage::ingestScalar(
                $incoming,
                $d->cover,
                'detailings/'.$d->id,
                'cover',
            );
        }
        $hasDetList = array_key_exists('servicesOffered', $patch) && is_array($patch['servicesOffered']);
        $hasMaintList = array_key_exists('maintenanceServicesOffered', $patch) && is_array($patch['maintenanceServicesOffered']);
        if ($hasDetList && $hasMaintList) {
            $d->services_offered = array_values(array_map('strval', $patch['servicesOffered']));
            $d->maintenance_services_offered = array_values(array_map('strval', $patch['maintenanceServicesOffered']));
        } elseif ($hasDetList) {
            $split = ServiceOfferedCatalog::splitFlatToBuckets($patch['servicesOffered']);
            $d->services_offered = $split['det'];
            $d->maintenance_services_offered = $split['maint'];
        } elseif ($hasMaintList) {
            $d->maintenance_services_offered = array_values(array_map('strval', $patch['maintenanceServicesOffered']));
        }
        if (array_key_exists('customServiceCategories', $patch) && is_array($patch['customServiceCategories'])) {
            $cats = [];
            foreach ($patch['customServiceCategories'] as $cat) {
                if (!is_array($cat)) continue;
                $title = trim((string) ($cat['title'] ?? ''));
                if ($title === '') continue;
                $services = [];
                foreach ((array) ($cat['services'] ?? []) as $svc) {
                    $s = trim((string) $svc);
                    if ($s !== '') $services[] = $s;
                }
                $cats[] = ['title' => $title, 'services' => array_values($services)];
            }
            $d->custom_service_categories = $cats;
        }
        if (array_key_exists('profileCompleted', $patch)) {
            $d->profile_completed = (bool) $patch['profileCompleted'];
        }

        $d->save();

        return response()->json(['detailing' => ApiResources::detailing($d->fresh())]);
    }
}
