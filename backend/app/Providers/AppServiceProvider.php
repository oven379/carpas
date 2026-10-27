<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     *
     * @return void
     */
    public function register()
    {
        //
    }

    /**
     * Bootstrap any application services.
     *
     * @return void
     */
    public function boot()
    {
        // Страховка: в production подробные ошибки (стек, пути, SQL) никогда не показываются, даже если APP_DEBUG включили по ошибке.
        if ($this->app->environment('production')) {
            config(['app.debug' => false]);
        }

        //
    }
}
