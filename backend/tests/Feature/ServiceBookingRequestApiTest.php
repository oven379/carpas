<?php

namespace Tests\Feature;

use App\Models\AppNotification;
use App\Models\Car;
use App\Models\CarEvent;
use App\Models\Owner;
use App\Models\ServiceBookingRequest;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;

class ServiceBookingRequestApiTest extends FeatureTestCase
{
    public function test_owner_can_send_booking_request_from_service_visit_to_detailing(): void
    {
        $detailing = $this->detailing();
        $owner = Owner::query()->create([
            'email' => 'booking-owner@example.test',
            'password' => Hash::make('secret'),
            'name' => 'Иван',
            'phone' => '+7 999 111 22 33',
            'garage_slug' => 'booking-owner',
        ]);
        $car = Car::query()->create([
            'detailing_id' => $detailing->id,
            'owner_id' => $owner->id,
            'vin' => 'BOOKING000000001',
            'make' => 'Volkswagen',
            'model' => 'Passat',
            'year' => 2020,
            'mileage_km' => 90000,
            'price_rub' => 0,
            'segment' => 'mass',
        ]);
        $event = CarEvent::query()->create([
            'detailing_id' => $detailing->id,
            'owner_id' => $owner->id,
            'car_id' => $car->id,
            'source' => 'service',
            'is_draft' => false,
            'at' => now()->subDays(14),
            'type' => 'visit',
            'title' => 'Керамика',
            'mileage_km' => 90000,
            'services' => ['Керамика'],
            'maintenance_services' => [],
        ]);

        Sanctum::actingAs($owner);

        $this->postJson('/api/owners/service-booking-requests', [
            'carId' => $car->id,
            'eventId' => $event->id,
        ])
            ->assertCreated()
            ->assertJsonPath('ok', true)
            ->assertJsonPath('item.status', ServiceBookingRequest::STATUS_NEW);

        $this->assertDatabaseHas('service_booking_requests', [
            'owner_id' => $owner->id,
            'detailing_id' => $detailing->id,
            'car_id' => $car->id,
            'car_event_id' => $event->id,
            'status' => ServiceBookingRequest::STATUS_NEW,
        ]);
        $this->assertDatabaseHas('app_notifications', [
            'owner_id' => $owner->id,
            'kind' => 'owner_booking_request_sent',
            'title' => 'Заявка отправлена',
        ]);
        $this->assertDatabaseHas('app_notifications', [
            'detailing_id' => $detailing->id,
            'kind' => 'owner_booking_request',
            'title' => 'Клиент хочет записаться',
        ]);

        ServiceBookingRequest::query()->firstOrFail()->update(['status' => ServiceBookingRequest::STATUS_IN_WORK]);

        $this->postJson('/api/owners/service-booking-requests', [
            'carId' => $car->id,
            'eventId' => $event->id,
        ])
            ->assertOk()
            ->assertJsonPath('message', 'Заявка уже есть в CRM сервиса.');

        $this->assertSame(1, ServiceBookingRequest::query()->count());
    }

    public function test_detailing_crm_returns_open_booking_request_badge_data(): void
    {
        $detailing = $this->detailing();
        $owner = Owner::query()->create([
            'email' => 'booking-crm-owner@example.test',
            'password' => Hash::make('secret'),
            'name' => 'Мария',
            'phone' => '+7 999 000 11 22',
            'garage_slug' => 'booking-crm-owner',
        ]);
        $car = Car::query()->create([
            'detailing_id' => $detailing->id,
            'owner_id' => $owner->id,
            'vin' => 'BOOKING000000002',
            'make' => 'BMW',
            'model' => 'X3',
            'year' => 2021,
            'mileage_km' => 50000,
            'price_rub' => 0,
            'segment' => 'mass',
        ]);
        $event = CarEvent::query()->create([
            'detailing_id' => $detailing->id,
            'owner_id' => $owner->id,
            'car_id' => $car->id,
            'source' => 'service',
            'is_draft' => false,
            'at' => now()->subDays(7),
            'type' => 'visit',
            'title' => 'Мойка',
            'mileage_km' => 50000,
            'services' => ['Мойка'],
            'maintenance_services' => [],
        ]);
        $booking = ServiceBookingRequest::query()->create([
            'owner_id' => $owner->id,
            'detailing_id' => $detailing->id,
            'car_id' => $car->id,
            'car_event_id' => $event->id,
            'status' => ServiceBookingRequest::STATUS_NEW,
            'message' => 'Запишите на вечер.',
        ]);
        AppNotification::query()->create([
            'detailing_id' => $detailing->id,
            'kind' => 'owner_booking_request',
            'title' => 'Клиент хочет записаться',
            'body' => 'Мария хочет записаться.',
            'data' => ['bookingRequestId' => (string) $booking->id],
        ]);

        Sanctum::actingAs($detailing);

        $this->getJson('/api/detailings/crm/clients')
            ->assertOk()
            ->assertJsonPath('items.0.bookingRequestsCount', 1)
            ->assertJsonPath('items.0.latestBookingRequest.message', 'Запишите на вечер.')
            ->assertJsonPath('items.0.latestBookingRequest.owner.name', 'Мария');

        $this->patchJson("/api/detailings/service-booking-requests/{$booking->id}", [
            'status' => ServiceBookingRequest::STATUS_CLOSED,
        ])
            ->assertOk()
            ->assertJsonPath('item.status', ServiceBookingRequest::STATUS_CLOSED);

        $this->assertDatabaseHas('service_booking_requests', [
            'id' => $booking->id,
            'status' => ServiceBookingRequest::STATUS_CLOSED,
        ]);
        $this->assertNotNull(AppNotification::query()->where('kind', 'owner_booking_request')->first()?->read_at);
    }
}
