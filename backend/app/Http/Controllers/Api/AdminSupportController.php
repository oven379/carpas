<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Support\ApiResources;
use App\Http\Support\PendingOwnerPool;
use App\Models\Detailing;
use App\Models\SupportTicket;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;

class AdminSupportController extends Controller
{
    public function login(Request $request)
    {
        $data = $request->validate([
            'login' => ['required', 'string', 'max:128'],
            'password' => ['required', 'string', 'max:256'],
        ]);

        $loginOk = hash_equals((string) config('support.admin_login'), (string) $data['login']);
        $passOk = hash_equals((string) config('support.admin_password'), (string) $data['password']);

        if (! $loginOk || ! $passOk) {
            return response()->json(['ok' => false, 'message' => 'Неверный логин или пароль.'], 401);
        }

        return response()->json([
            'ok' => true,
            'token' => config('support.admin_bearer_token'),
        ]);
    }

    public function index()
    {
        $rows = SupportTicket::query()
            ->with(['owner:id,email,garage_slug,is_premium', 'detailing:id,name,email'])
            ->orderByDesc('created_at')
            ->limit(200)
            ->get();

        return response()->json($rows->map(fn (SupportTicket $t) => $this->serializeAdmin($t))->values());
    }

    public function reply(Request $request, int $id)
    {
        $data = $request->validate([
            'message' => ['required', 'string', 'min:1', 'max:16000'],
        ]);

        $ticket = SupportTicket::query()->findOrFail($id);
        $ticket->update([
            'admin_reply' => trim((string) $data['message']),
            'admin_replied_at' => now(),
        ]);

        return response()->json($this->serializeAdmin($ticket->fresh(['owner:id,email,garage_slug,is_premium', 'detailing:id,name,email'])));
    }

    protected function serializeAdmin(SupportTicket $t): array
    {
        $attachmentUrl = '';
        if ($t->attachment_path) {
            $attachmentUrl = Storage::disk('public')->url($t->attachment_path);
        }

        $from = [];
        if ($t->author_role === 'owner' && $t->owner) {
            $from = [
                'role' => 'owner',
                'email' => $t->owner->email,
                'garage_slug' => $t->owner->garage_slug,
                'is_premium' => (bool) $t->owner->is_premium,
            ];
        } elseif ($t->author_role === 'detailing' && $t->detailing) {
            $from = [
                'role' => 'detailing',
                'name' => $t->detailing->name,
                'email' => $t->detailing->email ?? '',
            ];
        } else {
            $from = [
                'role' => 'guest',
                'email' => $t->guest_email,
            ];
        }

        return [
            'id' => $t->id,
            'author_role' => $t->author_role,
            'from' => $from,
            'page_path' => $t->page_path,
            'page_title' => $t->page_title,
            'context' => $t->context,
            'body' => $t->body,
            'attachment_url' => $attachmentUrl,
            'admin_reply' => $t->admin_reply,
            'admin_replied_at' => $t->admin_replied_at?->toIso8601String(),
            'user_read_at' => $t->user_read_at?->toIso8601String(),
            'created_at' => $t->created_at?->toIso8601String(),
        ];
    }

    /**
     * Партнёрские аккаунты (не личный кабинет), ожидающие подтверждения после регистрации.
     */
    public function partnerRegistrationsPending()
    {
        $rows = Detailing::query()
            ->where('email', '!=', PendingOwnerPool::DETAILING_EMAIL)
            ->whereNull('verification_approved_at')
            ->orderByDesc('created_at')
            ->limit(200)
            ->get();

        return response()->json($rows->map(fn (Detailing $d) => $this->serializePendingPartner($d))->values());
    }

    public function approvePartnerRegistration(int $id)
    {
        $d = Detailing::query()
            ->where('id', $id)
            ->where('email', '!=', PendingOwnerPool::DETAILING_EMAIL)
            ->whereNull('verification_approved_at')
            ->first();

        if (! $d) {
            return response()->json([
                'ok' => false,
                'message' => 'Заявка не найдена или уже обработана.',
            ], 404);
        }

        $plain = bin2hex(random_bytes(8));
        $email = (string) $d->email;

        $body = implode("\n", [
            'Здравствуйте!',
            '',
            'Спасибо за регистрацию в КарПас как партнёр (детейлинг / СТО).',
            'Ваш аккаунт подтверждён — можно входить в кабинет и настраивать публичную страницу.',
            '',
            'Логин (почта): '.$email,
            'Пароль: '.$plain,
            '',
            'Рекомендуем после первого входа сменить пароль в настройках.',
            '',
            'С уважением,',
            'КарПас',
        ]);

        try {
            Mail::raw($body, function ($message) use ($email) {
                $message->to($email)->subject('КарПас: аккаунт партнёра подтверждён');
            });
        } catch (\Throwable $e) {
            Log::error('admin_partner_registration_approve_mail_failed', [
                'detailing_id' => $d->id,
                'email' => $email,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'ok' => false,
                'message' => 'Не удалось отправить письмо. Партнёр не подтверждён — проверьте настройки почты на сервере и повторите попытку.',
            ], 503);
        }

        $d->password = Hash::make($plain);
        $d->verification_approved_at = now();
        $d->save();
        $d->tokens()->delete();
        $d->refresh();

        return response()->json([
            'ok' => true,
            'detailing' => ApiResources::detailing($d),
        ]);
    }

    protected function serializePendingPartner(Detailing $d): array
    {
        $det = is_array($d->services_offered) ? $d->services_offered : [];
        $maint = is_array($d->maintenance_services_offered) ? $d->maintenance_services_offered : [];

        return [
            'id' => (string) $d->id,
            'publicSlug' => trim((string) ($d->public_slug ?? '')),
            'name' => $d->name,
            'email' => $d->email,
            'contactName' => $d->contact_name ?? '',
            'phone' => $d->phone ?? '',
            'city' => $d->city ?? '',
            'address' => $d->address ?? '',
            'description' => $d->description ?? '',
            'createdAt' => optional($d->created_at)->toISOString(),
            'servicesOfferedCount' => count(array_merge($det, $maint)),
        ];
    }
}
