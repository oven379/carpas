<?php

namespace Tests\Feature;

use App\Models\Detailing;
use Illuminate\Support\Facades\Config;
use Laravel\Sanctum\Sanctum;

/** Тип бизнеса партнёра: регистрация, правка в настройках, список в админке. */
class PartnerBusinessTypeApiTest extends FeatureTestCase
{
    private function registerPayload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Пригон Авто Москва',
            'email' => 'prigon-'.uniqid('', true).'@example.test',
            'contactName' => 'Иван',
            'phone' => '+7 999 '.random_int(100, 999).' '.random_int(10, 99).' '.random_int(10, 99),
            'city' => 'Москва',
            'address' => 'ул. Тестовая, 1',
        ], $overrides);
    }

    public function test_register_stores_and_returns_the_chosen_business_type(): void
    {
        $this->postJson('/api/detailings', $this->registerPayload(['businessType' => 'prigon']))
            ->assertSuccessful()
            ->assertJsonPath('detailing.businessType', 'prigon');

        $this->assertDatabaseHas('detailings', ['name' => 'Пригон Авто Москва', 'business_type' => 'prigon']);
    }

    public function test_register_defaults_to_detailing_when_type_is_omitted(): void
    {
        $this->postJson('/api/detailings', $this->registerPayload())
            ->assertSuccessful()
            ->assertJsonPath('detailing.businessType', 'detailing');
    }

    public function test_register_rejects_unknown_business_type(): void
    {
        $this->postJson('/api/detailings', $this->registerPayload(['businessType' => 'hacker']))
            ->assertStatus(422)
            ->assertJsonValidationErrors('businessType');
    }

    public function test_pending_partner_gets_a_random_password_not_1111(): void
    {
        $payload = $this->registerPayload();
        $this->postJson('/api/detailings', $payload)->assertSuccessful();

        $partner = Detailing::query()->where('email', mb_strtolower($payload['email']))->firstOrFail();
        $this->assertFalse(\Illuminate\Support\Facades\Hash::check('1111', $partner->password));
    }

    public function test_partner_can_change_type_in_settings_but_not_to_an_invalid_one(): void
    {
        $d = $this->detailing(['business_type' => 'detailing']);
        Sanctum::actingAs($d);

        $this->patchJson('/api/detailings/me', ['businessType' => 'wash'])->assertOk();
        $this->assertSame('wash', $d->fresh()->business_type);

        $this->patchJson('/api/detailings/me', ['businessType' => 'nonsense'])->assertOk();
        $this->assertSame('wash', $d->fresh()->business_type);
    }

    public function test_public_page_and_admin_directory_expose_the_type(): void
    {
        Config::set('support.admin_bearer_token', 'test-admin-bearer');
        $d = $this->detailing(['name' => 'Гараж Пригона', 'business_type' => 'prigon']);

        $this->getJson('/api/public/detailings/'.$d->public_slug)
            ->assertOk()
            ->assertJsonPath('detailing.businessType', 'prigon');

        $items = $this->getJson('/api/admin/support/partners', ['Authorization' => 'Bearer test-admin-bearer'])
            ->assertOk()
            ->json('items');
        $row = collect($items)->firstWhere('id', (string) $d->id);
        $this->assertSame('prigon', $row['businessType'] ?? null);
    }
}
