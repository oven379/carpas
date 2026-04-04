<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CarClaim extends Model
{
    protected $fillable = [
        'car_id',
        'owner_id',
        'detailing_id',
        'status',
        'evidence',
        'reviewed_at',
    ];

    protected $casts = [
        'evidence' => 'array',
        'reviewed_at' => 'datetime',
    ];

    public function car(): BelongsTo
    {
        return $this->belongsTo(Car::class, 'car_id');
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(Owner::class, 'owner_id');
    }

    public function detailing(): BelongsTo
    {
        return $this->belongsTo(Detailing::class, 'detailing_id');
    }
}
