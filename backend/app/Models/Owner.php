<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class Owner extends Authenticatable
{
    use HasApiTokens;
    use HasFactory;

    protected $fillable = [
        'email',
        'password',
        'name',
        'phone',
        'garage_slug',
        'garage_banner',
        'garage_avatar',
        'show_phone_public',
        'is_premium',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'show_phone_public' => 'boolean',
        'is_premium' => 'boolean',
    ];

    public function cars(): HasMany
    {
        return $this->hasMany(Car::class, 'owner_id');
    }

    public function personalDetailing(): HasOne
    {
        return $this->hasOne(Detailing::class, 'owner_id')->where('is_personal', true);
    }
}
