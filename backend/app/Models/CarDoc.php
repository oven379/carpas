<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CarDoc extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'detailing_id',
        'car_id',
        'owner_id',
        'source',
        'event_id',
        'title',
        'kind',
        'url',
        'created_at',
        'updated_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function car(): BelongsTo
    {
        return $this->belongsTo(Car::class, 'car_id');
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(CarEvent::class, 'event_id');
    }

    public function detailing(): BelongsTo
    {
        return $this->belongsTo(Detailing::class, 'detailing_id');
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(Owner::class, 'owner_id');
    }
}
