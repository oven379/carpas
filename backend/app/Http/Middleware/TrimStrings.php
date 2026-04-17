<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Http\Middleware\TrimStrings as Middleware;

class TrimStrings extends Middleware
{
    /**
     * The names of the attributes that should not be trimmed.
     *
     * @var array<int, string>
     */
    protected $except = [
        'current_password',
        'password',
        'password_confirmation',
        // data:… / длинные URL медиа — только пробелы по краям уже не критичны, обрезка не должна трогать тело
        'cover',
        'logo',
        'garageBanner',
        'garageAvatar',
        'hero',
    ];
}
