<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CarEvent extends Model
{
    use HasFactory;

    protected $fillable = [
        'detailing_id',
        'car_id',
        'owner_id',
        'source',
        'at',
        'type',
        'title',
        'mileage_km',
        'services',
        'maintenance_services',
        'note',
    ];

    protected $casts = [
        'at' => 'datetime',
        'mileage_km' => 'integer',
        'services' => 'array',
        'maintenance_services' => 'array',
    ];
}
