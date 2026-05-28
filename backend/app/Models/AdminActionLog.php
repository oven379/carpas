<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdminActionLog extends Model
{
    protected $fillable = [
        'action',
        'target_type',
        'target_id',
        'payload',
    ];

    protected $casts = [
        'payload' => 'array',
    ];
}
