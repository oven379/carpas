<?php

namespace App\Http\Support;

use App\Models\Car;
use App\Models\CarDoc;
use App\Models\CarEvent;
use App\Models\Detailing;
use App\Models\Owner;

class ApiResources
{
    public static function detailing(Detailing $d): array
    {
        return [
            'id' => (string) $d->id,
            'name' => $d->name,
            'email' => $d->email,
            'contactName' => $d->contact_name ?? '',
            'phone' => $d->phone ?? '',
            'city' => $d->city ?? '',
            'address' => $d->address ?? '',
            'description' => $d->description ?? '',
            'website' => $d->website ?? '',
            'telegram' => $d->telegram ?? '',
            'instagram' => $d->instagram ?? '',
            'logo' => $d->logo ?? '',
            'cover' => $d->cover ?? '',
            'servicesOffered' => $d->services_offered ?? [],
            'profileCompleted' => (bool) $d->profile_completed,
            'createdAt' => optional($d->created_at)->toISOString(),
            'yandexLinked' => $d->yandex_id !== null,
        ];
    }

    public static function owner(Owner $o): array
    {
        return [
            'email' => $o->email,
            'name' => $o->name,
            'phone' => $o->phone,
            'garageCity' => $o->garage_city ?? '',
            'showCityPublic' => (bool) ($o->show_city_public ?? false),
            'garageWebsite' => $o->garage_website ?? '',
            'showWebsitePublic' => (bool) ($o->show_website_public ?? false),
            'garageSocial' => $o->garage_social ?? '',
            'showSocialPublic' => (bool) ($o->show_social_public ?? false),
            'garageSlug' => $o->garage_slug,
            'garageBanner' => $o->garage_banner,
            'garageAvatar' => $o->garage_avatar,
            'showPhonePublic' => (bool) $o->show_phone_public,
            'isPremium' => (bool) $o->is_premium,
        ];
    }

    public static function car(Car $c): array
    {
        $c->loadMissing(['owner', 'detailing']);

        $wash = $c->wash_photos ?? [];
        if (!is_array($wash)) {
            $wash = [];
        }

        return [
            'id' => (string) $c->id,
            'detailingId' => $c->detailing_id ? (string) $c->detailing_id : '',
            'detailingName' => $c->detailing?->name ?? '',
            'detailingWebsite' => $c->detailing?->website ?? '',
            'ownerEmail' => $c->owner?->email ?? '',
            'vin' => $c->vin ?? '',
            'plate' => $c->plate ?? '',
            'plateRegion' => $c->plate_region ?? '',
            'make' => $c->make ?? '',
            'model' => $c->model ?? '',
            'year' => $c->year,
            'mileageKm' => (int) ($c->mileage_km ?? 0),
            'priceRub' => (int) ($c->price_rub ?? 0),
            'color' => $c->color ?? '',
            'city' => $c->city ?? '',
            'hero' => $c->hero,
            'segment' => $c->segment ?? 'mass',
            'seller' => $c->seller,
            'ownerPhone' => $c->owner_phone ?? '',
            'clientName' => $c->client_name ?? '',
            'clientPhone' => $c->client_phone ?? '',
            'clientEmail' => $c->client_email ?? '',
            'washPhotos' => $wash,
            'washPhoto' => $wash[0] ?? '',
            'createdAt' => optional($c->created_at)->toISOString(),
            'updatedAt' => optional($c->updated_at)->toISOString(),
        ];
    }

    public static function event(CarEvent $e): array
    {
        $e->loadMissing(['detailing']);
        $svc = $e->services ?? [];
        $ms = $e->maintenance_services ?? [];
        if (!is_array($svc)) {
            $svc = [];
        }
        if (!is_array($ms)) {
            $ms = [];
        }
        $isService = ($e->source ?? 'service') === 'service';

        return [
            'id' => (string) $e->id,
            'detailingId' => (string) $e->detailing_id,
            'carId' => (string) $e->car_id,
            'ownerId' => $e->owner_id ? (string) $e->owner_id : null,
            'source' => $e->source ?? 'service',
            'isDraft' => (bool) ($e->is_draft ?? false),
            'at' => optional($e->at)->toISOString(),
            'type' => $e->type ?? 'visit',
            'title' => $e->title ?? '',
            'mileageKm' => (int) ($e->mileage_km ?? 0),
            'services' => $svc,
            'maintenanceServices' => $ms,
            'note' => $e->note ?? '',
            'createdAt' => optional($e->created_at)->toISOString(),
            'updatedAt' => optional($e->updated_at)->toISOString(),
            'detailingName' => $isService ? (string) ($e->detailing?->name ?? '') : '',
            'detailingLogo' => $isService ? (string) ($e->detailing?->logo ?? '') : '',
        ];
    }

    public static function doc(CarDoc $d): array
    {
        return [
            'id' => (string) $d->id,
            'detailingId' => (string) $d->detailing_id,
            'carId' => (string) $d->car_id,
            'ownerId' => $d->owner_id ? (string) $d->owner_id : null,
            'source' => $d->source ?? 'service',
            'title' => $d->title ?? 'Файл',
            'kind' => $d->kind ?? 'photo',
            'url' => $d->url ?? '',
            'eventId' => $d->event_id ? (string) $d->event_id : null,
            'createdAt' => optional($d->created_at)->toISOString(),
        ];
    }

    public static function claim(\App\Models\CarClaim $c): array
    {
        return [
            'id' => (string) $c->id,
            'carId' => (string) $c->car_id,
            'ownerId' => (string) $c->owner_id,
            'detailingId' => (string) $c->detailing_id,
            'ownerEmail' => $c->owner?->email ?? '',
            'status' => $c->status,
            'evidence' => $c->evidence ?? [],
            'createdAt' => optional($c->created_at)->toISOString(),
            'reviewedAt' => optional($c->reviewed_at)->toISOString(),
        ];
    }
}
