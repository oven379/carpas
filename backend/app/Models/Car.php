<?php

namespace App\Models;

use App\Http\Support\MediaStorage;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Car extends Model
{
    use HasFactory;

    protected $fillable = [
        'detailing_id',
        'owner_id',
        'pending_owner_email',
        'vin',
        'plate',
        'plate_region',
        'make',
        'model',
        'year',
        'mileage_km',
        'price_rub',
        'color',
        'city',
        'hero',
        'segment',
        'seller',
        'owner_phone',
        'client_name',
        'client_phone',
        'client_email',
        'wash_photos',
    ];

    protected $casts = [
        'year' => 'integer',
        'mileage_km' => 'integer',
        'price_rub' => 'integer',
        'seller' => 'array',
        'wash_photos' => 'array',
    ];

    public function detailing(): BelongsTo
    {
        return $this->belongsTo(Detailing::class, 'detailing_id');
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(Owner::class, 'owner_id');
    }

    public function events(): HasMany
    {
        return $this->hasMany(CarEvent::class, 'car_id');
    }

    public function docs(): HasMany
    {
        return $this->hasMany(CarDoc::class, 'car_id');
    }

    protected static function booted(): void
    {
        static::deleting(function (Car $car) {
            MediaStorage::deleteCarMediaDirectory((int) $car->id);
        });
    }
}
