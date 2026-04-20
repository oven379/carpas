<?php

namespace Tests\Feature;

use App\Models\Detailing;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;

class AdminPartnerRegistrationTest extends FeatureTestCase
{
    public function test_pending_requires_admin_bearer(): void
    {
        $this->getJson('/api/admin/support/partner-registrations/pending')->assertStatus(401);
    }

    public function test_pending_lists_partner_accounts_awaiting_verification(): void
    {
        Config::set('support.admin_bearer_token', 'test-admin-bearer');

        $this->detailing(['email' => 'ok@example.test', 'verification_approved_at' => now()]);
        $pending = Detailing::query()->create([
            'name' => 'Новый СТО',
            'email' => 'wait@example.test',
            'password' => bcrypt('old'),
            'phone' => '+79991112233',
            'contact_name' => 'Пётр',
            'city' => 'Казань',
            'address' => 'ул. Тестовая, 1',
            'is_personal' => false,
            'verification_approved_at' => null,
        ]);

        $r = $this->getJson('/api/admin/support/partner-registrations/pending', [
            'Authorization' => 'Bearer test-admin-bearer',
        ]);

        $r->assertOk();
        $r->assertJsonFragment(['id' => (string) $pending->id, 'email' => 'wait@example.test']);
        $r->assertJsonMissing(['email' => 'ok@example.test']);
    }

    public function test_approve_sends_mail_sets_verification_and_password(): void
    {
        Config::set('support.admin_bearer_token', 'test-admin-bearer');
        Mail::fake();

        $d = Detailing::query()->create([
            'name' => 'СТО Подтверждение',
            'email' => 'approve@example.test',
            'password' => bcrypt('old-secret'),
            'phone' => '+79990001122',
            'contact_name' => 'Анна',
            'city' => 'Москва',
            'is_personal' => false,
            'verification_approved_at' => null,
        ]);

        $r = $this->postJson(
            '/api/admin/support/partner-registrations/'.$d->id.'/approve',
            [],
            ['Authorization' => 'Bearer test-admin-bearer']
        );

        $r->assertOk();
        $r->assertJsonPath('ok', true);
        $r->assertJsonPath('detailing.email', 'approve@example.test');
        $r->assertJsonPath('detailing.verificationApprovedAt', fn ($v) => is_string($v) && $v !== '');

        $fresh = Detailing::query()->findOrFail($d->id);
        $this->assertNotNull($fresh->verification_approved_at);
        $this->assertFalse(Hash::check('old-secret', $fresh->password));
    }

    public function test_approve_twice_second_returns_404(): void
    {
        Config::set('support.admin_bearer_token', 'test-admin-bearer');
        Mail::fake();

        $d = Detailing::query()->create([
            'name' => 'Дважды',
            'email' => 'twice@example.test',
            'password' => bcrypt('x'),
            'is_personal' => false,
            'verification_approved_at' => null,
        ]);

        $this->postJson(
            '/api/admin/support/partner-registrations/'.$d->id.'/approve',
            [],
            ['Authorization' => 'Bearer test-admin-bearer']
        )->assertOk();

        $this->postJson(
            '/api/admin/support/partner-registrations/'.$d->id.'/approve',
            [],
            ['Authorization' => 'Bearer test-admin-bearer']
        )->assertStatus(404);
    }
}
