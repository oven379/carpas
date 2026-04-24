<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CarEvent extends Model
{
    use HasFactory;

    protected $fillable = [
        'detailing_id',
        'service_partner_name',
        'service_partner_logo',
        'car_id',
        'owner_id',
        'source',
        'is_draft',
        'allow_public_photos',
        'at',
        'type',
        'title',
        'mileage_km',
        'services',
        'maintenance_services',
        'note',
        'care_tips',
    ];

    protected $casts = [
        'at' => 'datetime',
        'mileage_km' => 'integer',
        'is_draft' => 'boolean',
        'allow_public_photos' => 'boolean',
        'services' => 'array',
        'maintenance_services' => 'array',
        'care_tips' => 'array',
    ];

    public function detailing(): BelongsTo
    {
        return $this->belongsTo(Detailing::class, 'detailing_id');
    }
}
