<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

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
}
