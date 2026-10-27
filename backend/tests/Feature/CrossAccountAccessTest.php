<?php

namespace Tests\Feature;

use App\Models\Car;
use App\Models\CarDoc;
use App\Models\CarEvent;
use App\Models\CarShare;
use App\Models\Detailing;
use App\Models\Owner;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;

/**
 * Подмена идентификаторов (IDOR): пользователь A не должен читать и менять данные пользователя B,
 * подставив чужой id в адрес. Для каждого маршрута ожидаем отказ (403/404), а не успех.
 */
class CrossAccountAccessTest extends FeatureTestCase
{
    private function makeCar(array $o): Car
    {
        return Car::query()->create(array_merge([
            'detailing_id' => null,
            'owner_id' => null,
            'vin' => strtoupper(substr(str_replace('-', '', (string) \Illuminate\Support\Str::uuid()), 0, 17)),
            'plate' => '',
            'plate_region' => '',
            'make' => 'Skoda',
            'model' => 'Octavia',
            'year' => 2019,
            'mileage_km' => 0,
            'price_rub' => 0,
            'color' => '',
            'city' => 'Москва',
            'hero' => null,
            'segment' => 'mass',
            'seller' => null,
        ], $o));
    }

    private function makeEvent(Car $car, Detailing $d, string $source): CarEvent
    {
        return CarEvent::query()->create([
            'detailing_id' => $d->id,
            'car_id' => $car->id,
            'owner_id' => $car->owner_id,
            'source' => $source,
            'is_draft' => false,
            'at' => now(),
            'type' => 'visit',
            'title' => 'Чужой визит',
            'mileage_km' => 1000,
        ]);
    }

    private function makeDoc(Car $car, Detailing $d, string $source): CarDoc
    {
        return CarDoc::query()->create([
            'detailing_id' => $d->id,
            'car_id' => $car->id,
            'owner_id' => $car->owner_id,
            'source' => $source,
            'event_id' => null,
            'title' => 'Чужое фото',
            'kind' => 'photo',
            'url' => 'https://example.test/x.jpg',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function assertDenied($response, string $what): void
    {
        $status = $response->getStatusCode();
        $this->assertContains($status, [401, 403, 404, 422], "{$what}: ожидали отказ, получили HTTP {$status}");
    }

    public function test_partner_cannot_touch_another_partners_cars_events_and_docs(): void
    {
        $a = $this->detailing(['email' => 'a-'.uniqid().'@example.test']);
        $b = $this->detailing(['email' => 'b-'.uniqid().'@example.test']);
        $ownerOfB = Owner::query()->create(['email' => 'client-'.uniqid().'@example.test', 'password' => Hash::make('secret')]);
        // Машина с владельцем закрыта для других партнёров (в отличие от «сетевой» карточки без владельца).
        $carB = $this->makeCar(['detailing_id' => $b->id, 'owner_id' => $ownerOfB->id]);
        $eventB = $this->makeEvent($carB, $b, 'service');
        $docB = $this->makeDoc($carB, $b, 'service');

        Sanctum::actingAs($a);

        $this->assertDenied($this->getJson("/api/cars/{$carB->id}"), 'GET чужого авто');
        $this->assertDenied($this->patchJson("/api/cars/{$carB->id}", ['make' => 'Hacked']), 'PATCH чужого авто');
        $this->assertDenied($this->deleteJson("/api/cars/{$carB->id}"), 'DELETE чужого авто');
        $this->assertDenied($this->getJson("/api/cars/{$carB->id}/events"), 'GET визитов чужого авто');
        $this->assertDenied($this->postJson("/api/cars/{$carB->id}/events", ['title' => 'x', 'mileageKm' => 1]), 'POST визита в чужое авто');
        $this->assertDenied($this->getJson("/api/cars/{$carB->id}/docs"), 'GET документов чужого авто');
        $this->assertDenied($this->postJson("/api/cars/{$carB->id}/docs", ['title' => 'x']), 'POST документа в чужое авто');
        $this->assertDenied($this->patchJson("/api/events/{$eventB->id}", ['title' => 'Hacked']), 'PATCH чужого визита');
        $this->assertDenied($this->deleteJson("/api/events/{$eventB->id}"), 'DELETE чужого визита');
        $this->assertDenied($this->deleteJson("/api/docs/{$docB->id}"), 'DELETE чужого документа');
        $this->assertDenied($this->patchJson("/api/detailings/crm/clients/{$carB->id}/note", ['note' => 'x']), 'PATCH заметки чужого клиента');
        $this->assertDenied($this->postJson("/api/detailings/crm/clients/{$carB->id}/push", ['message' => 'x']), 'push чужому клиенту');

        $this->assertSame('Skoda', $carB->fresh()->make, 'чужое авто изменилось');
        $this->assertNotNull(CarEvent::query()->find($eventB->id), 'чужой визит удалён');
        $this->assertNotNull(CarDoc::query()->find($docB->id), 'чужой документ удалён');
    }

    public function test_network_car_without_owner_is_open_to_partners_but_hides_other_studios_client_contacts(): void
    {
        $a = $this->detailing(['email' => 'a-'.uniqid().'@example.test']);
        $b = $this->detailing(['email' => 'b-'.uniqid().'@example.test']);
        $carB = $this->makeCar([
            'detailing_id' => $b->id,
            'client_name' => 'Секретный Клиент',
            'client_phone' => '+79994445566',
            'client_email' => 'client-secret@example.test',
        ]);

        // Студия-владелица карточки контакты видит.
        Sanctum::actingAs($b);
        $this->getJson("/api/cars/{$carB->id}")->assertOk()->assertJsonPath('clientPhone', '+79994445566');

        // Другой партнёр открыть карточку может (сеть), но контактов клиента не получает и править поля не может.
        Sanctum::actingAs($a);
        $res = $this->getJson("/api/cars/{$carB->id}")->assertOk();
        $res->assertJsonPath('make', 'Skoda');
        foreach (['clientName', 'clientPhone', 'clientEmail', 'ownerPhone', 'ownerEmail'] as $key) {
            $this->assertArrayNotHasKey($key, $res->json(), "партнёру A утекло поле {$key} клиента студии B");
        }
        $this->assertStringNotContainsString('+79994445566', $res->getContent());
        $this->assertDenied($this->patchJson("/api/cars/{$carB->id}", ['make' => 'Hacked']), 'PATCH сетевой карточки чужой студией');
        $this->assertDenied($this->deleteJson("/api/cars/{$carB->id}"), 'DELETE сетевой карточки чужой студией');
        $this->assertSame('Skoda', $carB->fresh()->make);
    }

    public function test_owner_cannot_touch_another_owners_cars_events_docs_and_shares(): void
    {
        $studio = $this->detailing();
        $a = Owner::query()->create(['email' => 'oa-'.uniqid().'@example.test', 'password' => Hash::make('secret')]);
        $b = Owner::query()->create(['email' => 'ob-'.uniqid().'@example.test', 'password' => Hash::make('secret')]);
        $carB = $this->makeCar(['owner_id' => $b->id]);
        $eventB = $this->makeEvent($carB, $studio, 'owner');
        $docB = $this->makeDoc($carB, $studio, 'owner');
        $shareB = CarShare::query()->create(['car_id' => $carB->id, 'token' => 'tok-'.uniqid('', true), 'created_at' => now()]);

        Sanctum::actingAs($a);

        $this->assertDenied($this->getJson("/api/owners/cars/{$carB->id}"), 'GET чужого авто владельца');
        $this->assertDenied($this->patchJson("/api/owners/cars/{$carB->id}", ['make' => 'Hacked']), 'PATCH чужого авто владельца');
        $this->assertDenied($this->deleteJson("/api/owners/cars/{$carB->id}"), 'DELETE чужого авто владельца');
        $this->assertDenied($this->postJson("/api/owners/cars/{$carB->id}/unlink"), 'unlink чужого авто');
        $this->assertDenied($this->getJson("/api/owners/cars/{$carB->id}/events"), 'GET визитов чужого авто');
        $this->assertDenied($this->postJson("/api/owners/cars/{$carB->id}/events", ['title' => 'x', 'mileageKm' => 1]), 'POST визита в чужое авто');
        $this->assertDenied($this->patchJson("/api/owners/cars/{$carB->id}/events/{$eventB->id}", ['title' => 'Hacked']), 'PATCH чужого визита');
        $this->assertDenied($this->deleteJson("/api/owners/cars/{$carB->id}/events/{$eventB->id}"), 'DELETE чужого визита');
        $this->assertDenied($this->getJson("/api/owners/cars/{$carB->id}/docs"), 'GET документов чужого авто');
        $this->assertDenied($this->deleteJson("/api/owners/cars/{$carB->id}/docs/{$docB->id}"), 'DELETE чужого документа');
        $this->assertDenied($this->deleteJson("/api/owners/docs/{$docB->id}"), 'DELETE документа по id');
        $this->assertDenied($this->getJson("/api/owners/cars/{$carB->id}/shares"), 'GET ссылок чужого авто');
        $this->assertDenied($this->postJson("/api/owners/cars/{$carB->id}/shares"), 'создание ссылки на чужое авто');
        $this->assertDenied($this->deleteJson("/api/owners/shares/{$shareB->token}"), 'отзыв чужой ссылки');

        $this->assertSame($b->id, $carB->fresh()->owner_id, 'чужое авто перешло к другому владельцу');
        $this->assertSame('Skoda', $carB->fresh()->make);
        $this->assertNull($shareB->fresh()->revoked_at, 'чужая ссылка отозвана');
        $this->assertNotNull(CarEvent::query()->find($eventB->id));
        $this->assertNotNull(CarDoc::query()->find($docB->id));
    }

    public function test_partner_token_cannot_use_owner_routes_and_vice_versa(): void
    {
        $partner = $this->detailing();
        $owner = Owner::query()->create(['email' => 'o-'.uniqid().'@example.test', 'password' => Hash::make('secret')]);

        Sanctum::actingAs($partner);
        $this->assertDenied($this->getJson('/api/owners/cars'), 'партнёр на маршруте владельца');
        $this->assertDenied($this->getJson('/api/owners/me'), 'партнёр: owners/me');

        Sanctum::actingAs($owner);
        $this->assertDenied($this->getJson('/api/cars'), 'владелец на маршруте партнёра');
        $this->assertDenied($this->getJson('/api/detailings/crm/clients'), 'владелец: CRM партнёра');
    }

    public function test_protected_routes_reject_requests_without_token(): void
    {
        foreach ([
            ['get', '/api/cars'], ['get', '/api/owners/cars'], ['get', '/api/me'], ['get', '/api/owners/me'],
            ['get', '/api/notifications'], ['get', '/api/detailings/crm/clients'], ['get', '/api/admin/support/overview'],
            ['get', '/api/admin/support/registry/owners'], ['post', '/api/admin/support/registry/owners/1/car-limit'],
        ] as [$method, $url]) {
            $this->assertSame(401, $this->{$method.'Json'}($url)->getStatusCode(), "{$method} {$url} без токена должен давать 401");
        }
    }

    public function test_owner_and_partner_cannot_use_admin_api(): void
    {
        \Illuminate\Support\Facades\Config::set('support.admin_bearer_token', 'real-admin-token');
        Sanctum::actingAs(Owner::query()->create(['email' => 'o-'.uniqid().'@example.test', 'password' => Hash::make('secret')]));

        $this->assertSame(401, $this->getJson('/api/admin/support/registry/owners')->getStatusCode());
        $this->assertSame(401, $this->getJson('/api/admin/support/overview', ['Authorization' => 'Bearer not-the-admin-token'])->getStatusCode());
    }
}
