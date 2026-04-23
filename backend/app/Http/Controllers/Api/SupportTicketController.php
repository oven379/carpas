<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Detailing;
use App\Models\Owner;
use App\Models\SupportTicket;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\PersonalAccessToken;

class SupportTicketController extends Controller
{
    protected function optionalAuthUser(Request $request): Owner|Detailing|null
    {
        $raw = $request->bearerToken();
        if (! $raw) {
            return null;
        }
        $accessToken = PersonalAccessToken::findToken($raw);
        if (! $accessToken || ! $accessToken->tokenable) {
            return null;
        }
        $m = $accessToken->tokenable;
        if ($m instanceof Owner) {
            return $m;
        }
        if ($m instanceof Detailing) {
            return $m;
        }

        return null;
    }

    public function store(Request $request)
    {
        $maxBody = max(500, (int) config('support.ticket_body_max', 8000));
        $maxKb = max(256, (int) config('support.attachment_max_kb', 4096));

        $auth = $this->optionalAuthUser($request);

        $rules = [
            'body' => ['required', 'string', 'min:3', 'max:'.$maxBody],
            'page_path' => ['required', 'string', 'max:512'],
            'page_title' => ['nullable', 'string', 'max:255'],
            /* JSON-тело: массив; multipart: JSON-строка */
            'context' => ['nullable'],
            'attachment' => ['nullable', 'file', 'max:'.$maxKb, 'mimes:jpeg,jpg,png,webp,gif'],
        ];

        if (! $auth) {
            $rules['guest_email'] = ['required', 'email', 'max:255'];
        } else {
            $rules['guest_email'] = ['nullable', 'string', 'max:255'];
        }

        $data = $request->validate($rules);

        $contextArr = null;
        $ctxIn = $data['context'] ?? null;
        if (is_array($ctxIn)) {
            $contextArr = $ctxIn;
        } elseif (is_string($ctxIn) && trim($ctxIn) !== '') {
            $dec = json_decode(trim($ctxIn), true);
            $contextArr = is_array($dec) ? $dec : null;
        }

        $role = 'guest';
        $ownerId = null;
        $detailingId = null;
        $guestEmail = null;

        if ($auth instanceof Owner) {
            $role = 'owner';
            $ownerId = $auth->id;
            $guestEmail = strtolower(trim((string) $auth->email));
        } elseif ($auth instanceof Detailing) {
            $role = 'detailing';
            $detailingId = $auth->id;
            $guestEmail = strtolower(trim((string) ($auth->email ?? ''))) ?: null;
        } else {
            $guestEmail = strtolower(trim((string) $data['guest_email']));
        }

        $ticket = SupportTicket::query()->create([
            'author_role' => $role,
            'owner_id' => $ownerId,
            'detailing_id' => $detailingId,
            'guest_email' => $role === 'guest' ? $guestEmail : null,
            'page_path' => mb_substr(trim((string) $data['page_path']), 0, 512),
            'page_title' => isset($data['page_title']) ? mb_substr(trim((string) $data['page_title']), 0, 255) : null,
            'context' => $contextArr,
            'body' => trim((string) $data['body']),
            'attachment_path' => null,
        ]);

        if ($request->hasFile('attachment')) {
            $file = $request->file('attachment');
            $dir = 'support/'.$ticket->id;
            $path = $file->store($dir, 'public');
            if (is_string($path) && $path !== '') {
                $ticket->update(['attachment_path' => $path]);
            }
        }

        return response()->json($this->serializeForUser($ticket->fresh()), 201);
    }

    public function inbox(Request $request)
    {
        $u = $request->user();
        if (! $u instanceof Owner && ! $u instanceof Detailing) {
            abort(403);
        }

        $q = SupportTicket::query()->orderByDesc('created_at')->limit(50);
        if ($u instanceof Owner) {
            $q->where('owner_id', $u->id);
        } else {
            $q->where('detailing_id', $u->id);
        }

        return response()->json($q->get()->map(fn ($t) => $this->serializeForUser($t))->values());
    }

    public function unreadCount(Request $request)
    {
        $u = $request->user();
        if (! $u instanceof Owner && ! $u instanceof Detailing) {
            abort(403);
        }

        $q = SupportTicket::query();
        if ($u instanceof Owner) {
            $q->where('owner_id', $u->id);
        } else {
            $q->where('detailing_id', $u->id);
        }

        $count = $q->get()->filter(fn (SupportTicket $t) => $t->hasUnreadReplyForUser())->count();

        return response()->json(['unread_count' => $count]);
    }

    public function markRead(Request $request, int $id)
    {
        $u = $request->user();
        if (! $u instanceof Owner && ! $u instanceof Detailing) {
            abort(403);
        }

        $ticket = SupportTicket::query()->findOrFail($id);
        if ($u instanceof Owner) {
            if ((int) $ticket->owner_id !== (int) $u->id) {
                abort(404);
            }
        } else {
            if ((int) $ticket->detailing_id !== (int) $u->id) {
                abort(404);
            }
        }

        $ticket->update(['user_read_at' => now()]);

        return response()->json(['ok' => true]);
    }

    protected function serializeForUser(SupportTicket $t): array
    {
        $attachmentUrl = '';
        if ($t->attachment_path) {
            $attachmentUrl = Storage::disk('public')->url($t->attachment_path);
        }

        return [
            'id' => $t->id,
            'author_role' => $t->author_role,
            'page_path' => $t->page_path,
            'page_title' => $t->page_title,
            'context' => $t->context,
            'body' => $t->body,
            'attachment_url' => $attachmentUrl,
            'admin_reply' => $t->admin_reply,
            'admin_replied_at' => $t->admin_replied_at?->toIso8601String(),
            'has_unread_reply' => $t->hasUnreadReplyForUser(),
            'created_at' => $t->created_at?->toIso8601String(),
        ];
    }
}
