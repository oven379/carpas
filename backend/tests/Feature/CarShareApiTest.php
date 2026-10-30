<?php

namespace Tests\Feature;

use App\Models\Car;
use App\Models\CarEvent;
use App\Models\CarShare;
use App\Models\Detailing;
use App\Models\Owner;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;

class CarShareApiTest extends FeatureTestCase
{
    private function owner(): Owner
    {
        return Owner::query()->create([
            'email' => 'share-owner-'.uniqid('', true).'@example.test',
            'password' => Hash::make('secret'),
            'name' => 'Владелец',
            'garage_private' => true,
        ]);
    }

    private function carForOwner(int $ownerId, ?int $detailingId = null): Car
    {
        return Car::query()->create([
            'detailing_id' => $detailingId,
            'owner_id' => $ownerId,
            'vin' => 'VIN123',
            'plate' => 'B777BB',
            'make' => 'BMW',
            'model' => 'X5',
            'year' => 2021,
            'mileage_km' => 5000,
            'price_rub' => 0,
            'color' => 'чёрный',
            'city' => 'Москва',
            'hero' => null,
            'segment' => 'mass',
            'seller' => null,
        ]);
    }

    /** Сохранённые визиты владельца; $createdAt — когда запись создана (для правила «3 месяца»). */
    private function addOwnerVisits(Car $car, Detailing $d, int $count, ?Carbon $createdAt = null, array $overrides = []): void
    {
        for ($i = 0; $i < $count; $i++) {
            $e = CarEvent::query()->create(array_merge([
                'detailing_id' => $d->id,
                'car_id' => $car->id,
                'owner_id' => $car->owner_id,
                'source' => 'owner',
                'is_draft' => false,
                'at' => now(),
                'type' => 'visit',
                'title' => 'Визит '.$i,
                'mileage_km' => 1000 + $i,
            ], $overrides));
            if ($createdAt) {
                $e->forceFill(['created_at' => $createdAt, 'updated_at' => $createdAt])->save();
            }
        }
    }

    public function test_share_lifecycle_and_public_by_token(): void
    {
        $owner = $this->owner();
        $d = $this->detailing();
        $car = $this->carForOwner($owner->id, $d->id);
        $this->addOwnerVisits($car, $d, 6);
        Sanctum::actingAs($owner);

        $this->getJson("/api/owners/cars/{$car->id}/shares")->assertOk()->assertJsonCount(0);

        $created = $this->postJson("/api/owners/cars/{$car->id}/shares");
        $created->assertOk();
        $token = $created->json('token');
        $this->assertNotEmpty($token);

        $this->getJson("/api/owners/cars/{$car->id}/shares")->assertOk()->assertJsonCount(1);

        $public = $this->getJson("/api/share/{$token}");
        $public->assertOk();
        $public->assertJsonPath('car.make', 'BMW');
        $public->assertJsonPath('car.vin', '');
        $public->assertJsonPath('car.plate', '');
        $public->assertJsonPath('car.plateRegion', '');
        $this->assertStringNotContainsString('B777BB', $public->getContent(), 'госномер утёк в публичную ссылку');

        $this->deleteJson("/api/owners/shares/{$token}")
            ->assertOk()
            ->assertJsonPath('ok', true);

        $this->getJson("/api/share/{$token}")->assertNotFound();
    }

    public function test_revoked_share_not_accessible_publicly(): void
    {
        $owner = $this->owner();
        $car = $this->carForOwner($owner->id, $this->detailing()->id);
        $share = CarShare::query()->create([
            'car_id' => $car->id,
            'token' => 'fixedtokentestshare123456789012',
            'created_at' => now(),
            'revoked_at' => now(),
        ]);

        $this->getJson('/api/share/'.$share->token)->assertNotFound();
    }

    public function test_detailing_cannot_create_public_history_share(): void
    {
        $owner = $this->owner();
        $d = $this->detailing();
        $car = $this->carForOwner($owner->id, $d->id);
        Sanctum::actingAs($d);

        $this->postJson("/api/cars/{$car->id}/shares")->assertNotFound();
        $this->getJson("/api/cars/{$car->id}/shares")->assertNotFound();
    }

    public function test_share_is_refused_until_history_is_long_enough(): void
    {
        $owner = $this->owner();
        $d = $this->detailing();
        $car = $this->carForOwner($owner->id, $d->id);
        Sanctum::actingAs($owner);

        // Пустая история.
        $this->getJson("/api/owners/cars/{$car->id}/share-eligibility")
            ->assertOk()->assertJsonPath('eligible', false)->assertJsonPath('visits', 0)->assertJsonPath('requiredVisits', 6);
        $this->postJson("/api/owners/cars/{$car->id}/shares")->assertStatus(403)->assertJsonPath('eligibility.eligible', false);

        // 5 визитов за один день — ещё рано.
        $this->addOwnerVisits($car, $d, 5);
        $this->getJson("/api/owners/cars/{$car->id}/share-eligibility")->assertOk()->assertJsonPath('eligible', false)->assertJsonPath('visits', 5);
        $this->postJson("/api/owners/cars/{$car->id}/shares")->assertStatus(403);
        $this->assertSame(0, CarShare::query()->where('car_id', $car->id)->count(), 'ссылка создана, хотя условие не выполнено');

        // Шестой визит открывает ссылку.
        $this->addOwnerVisits($car, $d, 1);
        $this->getJson("/api/owners/cars/{$car->id}/share-eligibility")->assertOk()->assertJsonPath('eligible', true);
        $this->postJson("/api/owners/cars/{$car->id}/shares")->assertOk();
    }

    public function test_share_opens_after_three_months_even_with_one_visit(): void
    {
        $owner = $this->owner();
        $d = $this->detailing();
        $car = $this->carForOwner($owner->id, $d->id);
        Sanctum::actingAs($owner);

        $this->addOwnerVisits($car, $d, 1, now()->subMonths(2)->subDays(20));
        $this->getJson("/api/owners/cars/{$car->id}/share-eligibility")->assertOk()->assertJsonPath('eligible', false);

        CarEvent::query()->where('car_id', $car->id)->get()->each(
            fn ($e) => $e->forceFill(['created_at' => now()->subMonths(3)->subDay()])->save()
        );
        $this->getJson("/api/owners/cars/{$car->id}/share-eligibility")->assertOk()->assertJsonPath('eligible', true);
        $this->postJson("/api/owners/cars/{$car->id}/shares")->assertOk();
    }

    public function test_drafts_service_visits_and_old_visit_dates_do_not_count(): void
    {
        $owner = $this->owner();
        $d = $this->detailing();
        $car = $this->carForOwner($owner->id, $d->id);
        Sanctum::actingAs($owner);

        $this->addOwnerVisits($car, $d, 6, null, ['is_draft' => true]);          // черновики
        $this->addOwnerVisits($car, $d, 6, null, ['source' => 'service']);     // записи сервиса
        $this->addOwnerVisits($car, $d, 1, null, ['at' => now()->subYears(2)]);  // дата визита в прошлом, но запись создана сегодня

        $this->getJson("/api/owners/cars/{$car->id}/share-eligibility")
            ->assertOk()->assertJsonPath('eligible', false)->assertJsonPath('visits', 1);
        $this->postJson("/api/owners/cars/{$car->id}/shares")->assertStatus(403);
    }

    public function test_other_owner_cannot_read_share_eligibility(): void
    {
        $owner = $this->owner();
        $car = $this->carForOwner($owner->id, $this->detailing()->id);
        Sanctum::actingAs($this->owner());

        $this->getJson("/api/owners/cars/{$car->id}/share-eligibility")->assertNotFound();
    }
}
