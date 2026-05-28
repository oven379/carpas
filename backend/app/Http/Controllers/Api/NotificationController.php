<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppNotification;
use App\Models\Detailing;
use App\Models\Owner;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $q = $this->scopeForUser($request);
        $items = $q->latest('created_at')->limit(500)->get();

        return response()->json([
            'items' => $items->map(fn (AppNotification $n) => $this->serialize($n))->values(),
            'unread_count' => $this->scopeForUser($request)->whereNull('read_at')->count(),
        ]);
    }

    public function unreadCount(Request $request)
    {
        return response()->json([
            'unread_count' => $this->scopeForUser($request)->whereNull('read_at')->count(),
        ]);
    }

    public function markRead(Request $request, $id)
    {
        $n = $this->scopeForUser($request)->whereKey((int) $id)->firstOrFail();
        if ($n->read_at === null) {
            $n->update(['read_at' => now()]);
        }

        return response()->json(['ok' => true, 'notification' => $this->serialize($n->fresh())]);
    }

    public function markAllRead(Request $request)
    {
        $updated = $this->scopeForUser($request)
            ->whereNull('read_at')
            ->update(['read_at' => now(), 'updated_at' => now()]);

        return response()->json(['ok' => true, 'updated' => $updated]);
    }

    public function clear(Request $request)
    {
        $deleted = $this->scopeForUser($request)->delete();

        return response()->json(['ok' => true, 'deleted' => $deleted]);
    }

    private function scopeForUser(Request $request)
    {
        $user = $request->user();

        if ($user instanceof Owner) {
            return AppNotification::query()->where('owner_id', $user->id);
        }

        if ($user instanceof Detailing) {
            return AppNotification::query()->where('detailing_id', $user->id);
        }

        abort(403);
    }

    private function serialize(AppNotification $n): array
    {
        return [
            'id' => (string) $n->id,
            'kind' => (string) $n->kind,
            'title' => (string) $n->title,
            'body' => (string) $n->body,
            'data' => is_array($n->data) ? $n->data : [],
            'readAt' => $n->read_at?->toIso8601String(),
            'sentByAdmin' => (bool) $n->sent_by_admin,
            'pushSent' => (bool) $n->push_sent,
            'pushFailed' => (bool) $n->push_failed,
            'createdAt' => $n->created_at?->toIso8601String(),
        ];
    }
}
