<?php

namespace Tests\Feature;

use App\Models\Owner;
use App\Models\SupportTicket;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SupportTicketApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_can_create_ticket_with_email(): void
    {
        $res = $this->postJson('/api/support/tickets', [
            'body' => 'Вопрос с главной страницы',
            'page_path' => '/',
            'page_title' => 'Главная',
            'guest_email' => 'guest@example.com',
        ]);

        $res->assertStatus(201);
        $res->assertJsonPath('body', 'Вопрос с главной страницы');
        $this->assertDatabaseHas('support_tickets', [
            'author_role' => 'guest',
            'guest_email' => 'guest@example.com',
        ]);
    }

    public function test_owner_can_create_ticket_authenticated(): void
    {
        $owner = Owner::query()->create([
            'email' => 'o@example.com',
            'password' => Hash::make('secret'),
            'name' => '',
            'phone' => '',
        ]);
        $token = $owner->createToken('t')->plainTextToken;

        $res = $this->postJson(
            '/api/support/tickets',
            [
                'body' => 'Проблема в гараже',
                'page_path' => '/garage',
                'context' => ['cars' => 2, 'slug' => 'my-garage'],
            ],
            ['Authorization' => 'Bearer '.$token]
        );

        $res->assertStatus(201);
        $this->assertDatabaseHas('support_tickets', [
            'author_role' => 'owner',
            'owner_id' => $owner->id,
        ]);
    }

    public function test_unread_count_and_mark_read(): void
    {
        $owner = Owner::query()->create([
            'email' => 'owner2@example.com',
            'password' => Hash::make('secret'),
            'name' => '',
            'phone' => '',
        ]);
        $token = $owner->createToken('t')->plainTextToken;

        $t = SupportTicket::query()->create([
            'author_role' => 'owner',
            'owner_id' => $owner->id,
            'page_path' => '/garage',
            'body' => 'x',
            'admin_reply' => 'Ответ админа',
            'admin_replied_at' => now(),
            'user_read_at' => null,
        ]);

        $c = $this->getJson('/api/support/unread-count', ['Authorization' => 'Bearer '.$token]);
        $c->assertOk()->assertJson(['unread_count' => 1]);

        $this->patchJson('/api/support/tickets/'.$t->id.'/read', [], ['Authorization' => 'Bearer '.$token])
            ->assertOk();

        $c2 = $this->getJson('/api/support/unread-count', ['Authorization' => 'Bearer '.$token]);
        $c2->assertOk()->assertJson(['unread_count' => 0]);
    }

    public function test_admin_can_reply_with_bearer(): void
    {
        Config::set('support.admin_bearer_token', 'test-secret-token');

        $t = SupportTicket::query()->create([
            'author_role' => 'guest',
            'guest_email' => 'g@example.com',
            'page_path' => '/docs',
            'body' => 'help',
        ]);

        $res = $this->postJson(
            '/api/admin/support/tickets/'.$t->id.'/reply',
            ['message' => 'Здравствуйте, помогли.'],
            ['Authorization' => 'Bearer test-secret-token']
        );

        $res->assertOk();
        $res->assertJsonPath('admin_reply', 'Здравствуйте, помогли.');
        $this->assertNotNull($t->fresh()->admin_replied_at);
    }
}
