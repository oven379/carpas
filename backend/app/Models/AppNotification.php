<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AppNotification extends Model
{
    protected $fillable = [
        'owner_id',
        'detailing_id',
        'kind',
        'title',
        'body',
        'data',
        'read_at',
        'sent_by_admin',
        'push_sent',
        'push_failed',
    ];

    protected $casts = [
        'data' => 'array',
        'read_at' => 'datetime',
        'sent_by_admin' => 'boolean',
        'push_sent' => 'boolean',
        'push_failed' => 'boolean',
    ];

    public function owner(): BelongsTo
    {
        return $this->belongsTo(Owner::class);
    }

    public function detailing(): BelongsTo
    {
        return $this->belongsTo(Detailing::class);
    }
}
