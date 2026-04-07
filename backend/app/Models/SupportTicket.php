<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupportTicket extends Model
{
    protected $fillable = [
        'author_role',
        'owner_id',
        'detailing_id',
        'guest_email',
        'page_path',
        'page_title',
        'context',
        'body',
        'attachment_path',
        'admin_reply',
        'admin_replied_at',
        'user_read_at',
    ];

    protected $casts = [
        'context' => 'array',
        'admin_replied_at' => 'datetime',
        'user_read_at' => 'datetime',
    ];

    public function owner(): BelongsTo
    {
        return $this->belongsTo(Owner::class);
    }

    public function detailing(): BelongsTo
    {
        return $this->belongsTo(Detailing::class);
    }

    public function hasUnreadReplyForUser(): bool
    {
        if ($this->admin_replied_at === null || $this->admin_reply === null || trim((string) $this->admin_reply) === '') {
            return false;
        }

        return $this->user_read_at === null || $this->user_read_at->lt($this->admin_replied_at);
    }
}
