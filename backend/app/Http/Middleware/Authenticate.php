<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;

class Authenticate extends Middleware
{
    /**
     * Get the path the user should be redirected to when they are not authenticated.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return string|null
     */
    protected function redirectTo($request)
    {
        // Это API без веб-входа: маршрута login нет, поэтому запрос без заголовка Accept: application/json раньше
        // заканчивался ошибкой 500 вместо 401. Теперь всегда 401 в JSON.
        if (! $request->expectsJson() && ! $request->is('api/*')) {
            return route('login');
        }
    }
}
