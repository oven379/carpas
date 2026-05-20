<?php

namespace App\Services;

use App\Models\AppNotification;
use App\Models\Detailing;
use App\Models\Owner;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;

class InternalNotificationService
{
    public function createForOwner(
        Owner|int $owner,
        string $title,
        string $body,
        string $kind = 'system',
        array $data = [],
        bool $sentByAdmin = false,
        bool $pushSent = false,
        bool $pushFailed = false
    ): AppNotification {
        $ownerId = $owner instanceof Owner ? $owner->id : $owner;

        return AppNotification::query()->create([
            'owner_id' => $ownerId,
            'detailing_id' => null,
            'kind' => $kind,
            'title' => $title,
            'body' => $body,
            'data' => $data,
            'sent_by_admin' => $sentByAdmin,
            'push_sent' => $pushSent,
            'push_failed' => $pushFailed,
        ]);
    }

    public function createForDetailing(
        Detailing|int $detailing,
        string $title,
        string $body,
        string $kind = 'system',
        array $data = [],
        bool $sentByAdmin = false,
        bool $pushSent = false,
        bool $pushFailed = false
    ): AppNotification {
        $detailingId = $detailing instanceof Detailing ? $detailing->id : $detailing;

        return AppNotification::query()->create([
            'owner_id' => null,
            'detailing_id' => $detailingId,
            'kind' => $kind,
            'title' => $title,
            'body' => $body,
            'data' => $data,
            'sent_by_admin' => $sentByAdmin,
            'push_sent' => $pushSent,
            'push_failed' => $pushFailed,
        ]);
    }

    /**
     * @return array{created: int, owner_ids: list<int>, detailing_ids: list<int>}
     */
    public function broadcast(string $audience, string $title, string $body, string $kind = 'admin_broadcast', array $data = []): array
    {
        $ownerIds = [];
        $detailingIds = [];
        $created = 0;

        if ($audience === 'all' || $audience === 'owners') {
            Owner::query()
                ->select('id')
                ->orderBy('id')
                ->chunkById(200, function (EloquentCollection $owners) use ($title, $body, $kind, $data, &$ownerIds, &$created) {
                    $now = now();
                    $rows = $owners->map(function (Owner $owner) use ($title, $body, $kind, $data, $now, &$ownerIds) {
                        $ownerIds[] = (int) $owner->id;

                        return [
                            'owner_id' => $owner->id,
                            'detailing_id' => null,
                            'kind' => $kind,
                            'title' => $title,
                            'body' => $body,
                            'data' => json_encode($data, JSON_UNESCAPED_UNICODE),
                            'sent_by_admin' => true,
                            'push_sent' => false,
                            'push_failed' => false,
                            'created_at' => $now,
                            'updated_at' => $now,
                        ];
                    })->all();
                    if ($rows !== []) {
                        AppNotification::query()->insert($rows);
                        $created += count($rows);
                    }
                });
        }

        if ($audience === 'all' || $audience === 'detailings') {
            Detailing::query()
                ->select('id')
                ->orderBy('id')
                ->chunkById(200, function (EloquentCollection $detailings) use ($title, $body, $kind, $data, &$detailingIds, &$created) {
                    $now = now();
                    $rows = $detailings->map(function (Detailing $detailing) use ($title, $body, $kind, $data, $now, &$detailingIds) {
                        $detailingIds[] = (int) $detailing->id;

                        return [
                            'owner_id' => null,
                            'detailing_id' => $detailing->id,
                            'kind' => $kind,
                            'title' => $title,
                            'body' => $body,
                            'data' => json_encode($data, JSON_UNESCAPED_UNICODE),
                            'sent_by_admin' => true,
                            'push_sent' => false,
                            'push_failed' => false,
                            'created_at' => $now,
                            'updated_at' => $now,
                        ];
                    })->all();
                    if ($rows !== []) {
                        AppNotification::query()->insert($rows);
                        $created += count($rows);
                    }
                });
        }

        return [
            'created' => $created,
            'owner_ids' => $ownerIds,
            'detailing_ids' => $detailingIds,
        ];
    }
}
