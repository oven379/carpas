<?php

namespace Tests\Feature;

use App\Models\Detailing;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase as BaseTestCase;

abstract class FeatureTestCase extends BaseTestCase
{
    use RefreshDatabase;

    protected function detailing(array $overrides = []): Detailing
    {
        return Detailing::query()->create(array_merge([
            'name' => 'Тестовый детейлинг',
            'email' => 'd-'.uniqid('', true).'@example.test',
            'password' => Hash::make('secret'),
            'verification_approved_at' => now(),
        ], $overrides));
    }
}
