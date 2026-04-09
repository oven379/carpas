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
        'garage_city',
        'show_city_public',
        'garage_website',
        'show_website_public',
        'garage_social',
        'garage_visit_self_advice',
        'show_social_public',
        'garage_slug',
        'garage_banner',
        'garage_banner_enabled',
        'garage_avatar',
        'show_phone_public',
        'is_premium',
        'garage_private',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'show_city_public' => 'boolean',
        'show_website_public' => 'boolean',
        'show_social_public' => 'boolean',
        'show_phone_public' => 'boolean',
        'is_premium' => 'boolean',
        'garage_private' => 'boolean',
        'garage_banner_enabled' => 'boolean',
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
