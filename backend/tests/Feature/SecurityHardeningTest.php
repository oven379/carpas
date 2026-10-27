<?php

namespace Tests\Feature;

use App\Http\Support\MediaStorage;
use App\Models\Owner;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;

/** Загрузки, отладочная панель, лимиты запросов и защита привилегированных полей. */
class SecurityHardeningTest extends FeatureTestCase
{
    private const PNG_1X1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

    public function test_real_image_is_accepted_and_type_comes_from_content(): void
    {
        $r = MediaStorage::decodeDataUri('data:image/png;base64,'.self::PNG_1X1);
        $this->assertSame('png', $r['ext'] ?? null);

        // Заявлен jpeg, на деле png — доверяем содержимому.
        $r = MediaStorage::decodeDataUri('data:image/jpeg;base64,'.self::PNG_1X1);
        $this->assertSame('png', $r['ext'] ?? null);
        $this->assertSame('image/png', $r['mime'] ?? null);
    }

    public function test_html_or_script_disguised_as_image_is_rejected(): void
    {
        $html = base64_encode('<html><script>fetch("/steal?"+localStorage.getItem("auth.ownerToken"))</script></html>');
        foreach (['image/png', 'image/jpeg', 'image/webp', 'application/pdf', 'text/html'] as $claimed) {
            $this->assertNull(MediaStorage::decodeDataUri("data:{$claimed};base64,{$html}"), "под видом {$claimed} принят HTML");
        }
    }

    public function test_svg_uploads_are_rejected_even_when_valid(): void
    {
        $svg = base64_encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
        $this->assertNull(MediaStorage::decodeDataUri("data:image/svg+xml;base64,{$svg}"));
        $this->assertNull(MediaStorage::decodeDataUri("data:image/png;base64,{$svg}"));
    }

    public function test_guest_support_tickets_are_rate_limited(): void
    {
        for ($i = 0; $i < 8; $i++) {
            // Невалидное тело: ответ 422, но попытка засчитывается в лимит.
            $this->postJson('/api/support/tickets', [])->assertStatus(422);
        }
        $this->postJson('/api/support/tickets', [])->assertStatus(429);
    }

    public function test_telescope_is_never_viewable_outside_local_even_if_enabled(): void
    {
        Config::set('telescope.enabled', true);
        // В контейнере APP_ENV=local перебивает phpunit.xml, поэтому окружение задаём явно.
        $this->app->detectEnvironment(fn () => 'production');

        $this->assertFalse(Gate::allows('viewTelescope'), 'панель отладки открыта вне локальной среды');

        $this->app->detectEnvironment(fn () => 'local');
        $this->assertTrue(Gate::allows('viewTelescope'), 'локально панель должна открываться, когда она включена');
    }

    public function test_owner_cannot_grant_themselves_premium_or_raise_the_car_limit(): void
    {
        $owner = Owner::query()->create(['email' => 'o-'.uniqid().'@example.test', 'password' => Hash::make('secret')]);
        Sanctum::actingAs($owner);

        $this->patchJson('/api/owners/me', [
            'isPremium' => true,
            'is_premium' => true,
            'garageCarLimit' => 3,
            'garage_car_limit' => 3,
            'email' => 'hijack@example.test',
            'name' => 'Новое имя',
        ])->assertOk();

        $fresh = $owner->fresh();
        $this->assertFalse((bool) $fresh->is_premium, 'владелец выдал себе Premium');
        $this->assertSame(1, (int) $fresh->garage_car_limit, 'владелец поднял себе лимит');
        $this->assertStringNotContainsString('hijack', (string) $fresh->email, 'владелец сменил почту через PATCH /owners/me');
        $this->assertSame('Новое имя', $fresh->name, 'обычные поля должны обновляться');
    }

    public function test_partner_cannot_self_verify_through_profile_update(): void
    {
        $d = $this->detailing(['verification_approved_at' => null, 'email' => 'p-'.uniqid().'@example.test']);
        Sanctum::actingAs($d);

        $this->patchJson('/api/detailings/me', [
            'verificationApprovedAt' => now()->toIso8601String(),
            'verification_approved_at' => now()->toIso8601String(),
            'publicSlug' => 'admin',
        ]);

        $this->assertNull($d->fresh()->verification_approved_at, 'партнёр сам себя верифицировал');
        $this->assertNotSame('admin', $d->fresh()->public_slug);
    }
}
