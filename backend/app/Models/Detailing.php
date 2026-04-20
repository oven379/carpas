<?php

namespace App\Models;

use App\Http\Support\DetailingPublicSlug;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class Detailing extends Authenticatable
{
    use HasFactory;
    use HasApiTokens;

    protected $fillable = [
        'name',
        'email',
        'password',
        'yandex_id',
        'phone',
        'contact_name',
        'city',
        'address',
        'description',
        'working_hours',
        'website',
        'telegram',
        'instagram',
        'logo',
        'cover',
        'services_offered',
        'maintenance_services_offered',
        'profile_completed',
        'verification_approved_at',
        'is_personal',
        'owner_id',
        'public_slug',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'services_offered' => 'array',
        'maintenance_services_offered' => 'array',
        'profile_completed' => 'boolean',
        'is_personal' => 'boolean',
        'verification_approved_at' => 'datetime',
    ];

    public function owner(): BelongsTo
    {
        return $this->belongsTo(Owner::class, 'owner_id');
    }

    protected static function booted(): void
    {
        static::created(function (Detailing $d) {
            if (! filled($d->public_slug)) {
                DetailingPublicSlug::assignUnique($d, $d->name, true);
            }
        });

        static::updated(function (Detailing $d) {
            if ($d->wasChanged('name')) {
                DetailingPublicSlug::assignUnique($d, $d->name, true);
            }
        });
    }
}
