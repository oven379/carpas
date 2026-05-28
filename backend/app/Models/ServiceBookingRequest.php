<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ServiceBookingRequest extends Model
{
    public const STATUS_NEW = 'new';
    public const STATUS_IN_WORK = 'in_work';
    public const STATUS_CLOSED = 'closed';

    protected $fillable = [
        'owner_id',
        'detailing_id',
        'car_id',
        'car_event_id',
        'status',
        'message',
        'closed_at',
    ];

    protected $casts = [
        'closed_at' => 'datetime',
    ];

    public function owner(): BelongsTo
    {
        return $this->belongsTo(Owner::class);
    }

    public function detailing(): BelongsTo
    {
        return $this->belongsTo(Detailing::class);
    }

    public function car(): BelongsTo
    {
        return $this->belongsTo(Car::class);
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(CarEvent::class, 'car_event_id');
    }
}
