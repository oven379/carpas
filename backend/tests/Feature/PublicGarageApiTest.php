<?php

namespace Tests\Feature;

use App\Models\Owner;
use Illuminate\Support\Facades\Hash;

class PublicGarageApiTest extends FeatureTestCase
{
    public function test_owner_garage_is_not_public_even_when_slug_exists(): void
    {
        $owner = Owner::query()->create([
            'email' => 'pg-'.uniqid('', true).'@example.test',
            'password' => Hash::make('secret'),
            'name' => 'Владелец',
            'phone' => '+79990000000',
            'garage_slug' => 'test-slug-'.uniqid(),
            'garage_private' => false,
        ]);

        $slug = mb_strtolower(trim((string) $owner->garage_slug));

        $this->getJson('/api/public/garages/'.$slug)->assertNotFound();
    }
}
