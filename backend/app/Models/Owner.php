<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
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
        'garage_car_limit',
    ];

    /** Максимум авто в гараже, до которого администратор может поднять лимит по заявке. */
    public const GARAGE_CAR_LIMIT_MAX = 3;

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
        'garage_car_limit' => 'integer',
    ];

    public function cars(): HasMany
    {
        return $this->hasMany(Car::class, 'owner_id');
    }

    /**
     * Можно ли добавить ещё одно авто в гараж (создание карточки или привязка по VIN).
     * Premium — без ограничений; иначе число авто должно быть меньше личного лимита (по умолчанию 1).
     */
    public function canAddCarToGarage(): bool
    {
        if ($this->is_premium) {
            return true;
        }
        $limit = max(1, (int) ($this->garage_car_limit ?: 1));

        return $this->cars()->count() < $limit;
    }

    public function supportTickets(): HasMany
    {
        return $this->hasMany(SupportTicket::class, 'owner_id');
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(AppNotification::class, 'owner_id');
    }
}
