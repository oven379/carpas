<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Car extends Model
{
    use HasFactory;

    protected $fillable = [
        'detailing_id',
        'vin',
        'plate',
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
    ];

    protected $casts = [
        'year' => 'integer',
        'mileage_km' => 'integer',
        'price_rub' => 'integer',
        'seller' => 'array',
    ];
}
