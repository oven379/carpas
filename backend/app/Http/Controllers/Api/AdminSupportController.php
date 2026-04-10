<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SupportTicket;
use Illuminate\Http\Request;
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
}
