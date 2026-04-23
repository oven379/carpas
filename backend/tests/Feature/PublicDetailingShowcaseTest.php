<?php

namespace Tests\Feature;

use App\Models\Detailing;
use Illuminate\Support\Facades\Hash;

class PublicDetailingShowcaseTest extends FeatureTestCase
{
    public function test_partner_detailing_showcase_ok_without_token(): void
    {
        $d = $this->detailing(['name' => 'Партнёр']);

        $this->getJson('/api/public/detailings/'.$d->id)
            ->assertOk()
            ->assertJsonPath('detailing.id', (string) $d->id)
            ->assertJsonPath('carsCount', 0);
    }

    public function test_partner_detailing_showcase_ok_by_public_slug(): void
    {
        $d = $this->detailing(['name' => 'Студия Глянец']);
        $slug = trim((string) $d->fresh()->public_slug);
        $this->assertNotSame('', $slug);

        $this->getJson('/api/public/detailings/'.$slug)
            ->assertOk()
            ->assertJsonPath('detailing.id', (string) $d->id)
            ->assertJsonPath('detailing.publicSlug', $slug);
    }

    public function test_detailing_showcase_404_without_verification(): void
    {
        $d = Detailing::query()->create([
            'name' => 'Не верифицирован',
            'email' => 'nv-'.uniqid('', true).'@example.test',
            'password' => Hash::make('secret'),
            'verification_approved_at' => null,
            'profile_completed' => false,
        ]);

        $this->getJson('/api/public/detailings/'.$d->id)
            ->assertNotFound();
    }
}
