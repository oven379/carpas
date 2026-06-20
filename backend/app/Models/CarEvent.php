<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

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
        'order_number',
        'mileage_km',
        'services',
        'maintenance_services',
        'note',
        'reason',
        'special_notes',
        'master_name',
        'work_items',
        'parts_items',
        'internal_note',
        'next_contact_at',
        'care_tips',
    ];

    protected $casts = [
        'at' => 'datetime',
        'mileage_km' => 'integer',
        'is_draft' => 'boolean',
        'allow_public_photos' => 'boolean',
        'services' => 'array',
        'maintenance_services' => 'array',
        'next_contact_at' => 'datetime',
        'care_tips' => 'array',
        'work_items' => 'array',
        'parts_items' => 'array',
    ];

    public function detailing(): BelongsTo
    {
        return $this->belongsTo(Detailing::class, 'detailing_id');
    }

    public function docs(): HasMany
    {
        return $this->hasMany(CarDoc::class, 'event_id');
    }
}
