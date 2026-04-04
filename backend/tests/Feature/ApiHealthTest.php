<?php

namespace Tests\Feature;

class ApiHealthTest extends FeatureTestCase
{
    public function test_health_returns_ok(): void
    {
        $this->getJson('/api/health')
            ->assertOk()
            ->assertJson(['ok' => true]);
    }
}
