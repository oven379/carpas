<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DevicePushToken extends Model
{
    protected $fillable = [
        'owner_id',
        'detailing_id',
        'token',
        'platform',
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
