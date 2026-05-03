<?php

namespace Tests\Feature;

use App\Models\Detailing;
use App\Models\SupportTicket;
use Illuminate\Support\Facades\Config;

class AdminDashboardOverviewTest extends FeatureTestCase
{
    public function test_overview_requires_admin_bearer(): void
    {
        $this->getJson('/api/admin/support/overview')->assertStatus(401);
    }

    public function test_overview_returns_metrics_shape(): void
    {
        Config::set('support.admin_bearer_token', 'test-admin-bearer');

        SupportTicket::query()->create([
            'author_role' => 'guest',
            'guest_email' => 'g@example.test',
            'page_path' => '/x',
            'page_title' => 'T',
            'context' => [],
            'body' => 'hello',
            'attachment_path' => null,
            'admin_reply' => null,
            'admin_replied_at' => null,
            'user_read_at' => null,
        ]);

        $this->detailing(['email' => 'p@example.test', 'verification_approved_at' => null]);

        $r = $this->getJson('/api/admin/support/overview', [
            'Authorization' => 'Bearer test-admin-bearer',
        ]);

        $r->assertOk();
        $r->assertJsonPath('support.awaitingAdminReply', 1);
        $r->assertJsonPath('partners.pendingVerification', 1);
        $r->assertJsonStructure([
            'support' => ['awaitingAdminReply', 'createdLast7Days', 'total'],
            'partners' => ['pendingVerification', 'approvedTotal'],
            'registry' => ['ownersTotal', 'carsTotal', 'carEventsLast30Days'],
            'push' => ['deviceTokensTotal', 'deviceTokensOwners', 'deviceTokensDetailings', 'fcmConfigured'],
            'chart' => [
                'months' => [
                    ['key', 'label', 'supportTickets', 'newPartnerAccounts'],
                ],
            ],
        ]);
        $this->assertCount(6, $r->json('chart.months'));
    }

    public function test_partners_directory_lists_pending_before_approved(): void
    {
        Config::set('support.admin_bearer_token', 'test-admin-bearer');

        $approved = $this->detailing([
            'email' => 'old-partner@example.test',
            'name' => 'Старый партнёр',
            'verification_approved_at' => now()->subDay(),
        ]);

        $pending = Detailing::query()->create([
            'name' => 'Новая заявка',
            'email' => 'new-wait@example.test',
            'password' => bcrypt('x'),
            'verification_approved_at' => null,
        ]);

        $r = $this->getJson('/api/admin/support/partners', [
            'Authorization' => 'Bearer test-admin-bearer',
        ]);

        $r->assertOk();
        $items = $r->json('items');
        $this->assertNotEmpty($items);
        $this->assertSame('registration_pending', $items[0]['kind']);
        $this->assertSame((string) $pending->id, $items[0]['id']);
        $kinds = array_column($items, 'kind');
        $firstPartnerIdx = array_search('partner', $kinds, true);
        $firstPendingIdx = array_search('registration_pending', $kinds, true);
        $this->assertNotFalse($firstPartnerIdx);
        $this->assertNotFalse($firstPendingIdx);
        $this->assertLessThan($firstPartnerIdx, $firstPendingIdx);

        $partnerRow = collect($items)->firstWhere('kind', 'partner');
        $this->assertNotNull($partnerRow);
        $this->assertSame((string) $approved->id, $partnerRow['id']);
        $this->assertArrayHasKey('carsCount', $partnerRow);
    }
}
