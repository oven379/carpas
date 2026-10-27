<?php

namespace App\Providers;

use Illuminate\Support\Facades\Gate;
use Laravel\Telescope\IncomingEntry;
use Laravel\Telescope\Telescope;
use Laravel\Telescope\TelescopeApplicationServiceProvider;

class TelescopeServiceProvider extends TelescopeApplicationServiceProvider
{
    public function register(): void
    {
        if (! config('telescope.enabled')) {
            return;
        }

        Telescope::night();

        $this->hideSensitiveRequestDetails();

        Telescope::filter(function (IncomingEntry $entry) {
            return true;
        });
    }

    protected function hideSensitiveRequestDetails(): void
    {
        Telescope::hideRequestParameters(['password', 'password_confirmation']);
        Telescope::hideRequestHeaders(['cookie', 'x-csrf-token', 'x-xsrf-token']);
    }

    protected function gate(): void
    {
        Gate::define('viewTelescope', function ($user = null) {
            // Только локально: панель отладки показывает запросы, SQL и заголовки — на проде она не должна открываться,
            // даже если TELESCOPE_ENABLED включили по ошибке.
            return config('telescope.enabled', false) && app()->environment('local');
        });
    }
}
