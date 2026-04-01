<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CarShare extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'car_id',
        'token',
        'created_at',
        'revoked_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'revoked_at' => 'datetime',
    ];
}
