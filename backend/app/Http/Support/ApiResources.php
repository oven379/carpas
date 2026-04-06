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
            'workingHours' => $d->working_hours ?? '',
            'website' => $d->website ?? '',
            'telegram' => $d->telegram ?? '',
            'instagram' => $d->instagram ?? '',
            'logo' => MediaStorage::publicUrl($d->logo ?? null),
            'cover' => MediaStorage::publicUrl($d->cover ?? null),
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
            'garageBanner' => MediaStorage::publicUrl($o->garage_banner ?? null),
            'garageBannerEnabled' => (bool) ($o->garage_banner_enabled ?? true),
            'garageAvatar' => MediaStorage::publicUrl($o->garage_avatar ?? null),
            'showPhonePublic' => (bool) $o->show_phone_public,
            'isPremium' => (bool) $o->is_premium,
            'garagePrivate' => (bool) ($o->garage_private ?? false),
        ];
    }

    public static function car(Car $c): array
    {
        $c->loadMissing(['owner', 'detailing']);

        $wash = $c->wash_photos ?? [];
        if (!is_array($wash)) {
            $wash = [];
        }
        $washUrls = array_values(array_map(
            fn ($x) => MediaStorage::publicUrl(is_string($x) ? $x : ''),
            $wash,
        ));

        return [
            'id' => (string) $c->id,
            'detailingId' => $c->detailing_id ? (string) $c->detailing_id : '',
            'detailingName' => $c->detailing?->name ?? '',
            'detailingLogo' => MediaStorage::publicUrl($c->detailing?->logo ?? null),
            'detailingWebsite' => $c->detailing?->website ?? '',
            'ownerEmail' => $c->owner?->email ?? '',
            'ownerName' => trim((string) ($c->owner?->name ?? '')),
            'ownerAccountPhone' => trim((string) ($c->owner?->phone ?? '')),
            'ownerShowPhonePublic' => (bool) ($c->owner?->show_phone_public ?? false),
            'ownerGarageSlug' => trim((string) ($c->owner?->garage_slug ?? '')),
            'ownerGarageAvatar' => MediaStorage::publicUrl($c->owner?->garage_avatar ?? null),
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
            'hero' => MediaStorage::publicUrl($c->hero ?? null),
            'segment' => $c->segment ?? 'mass',
            'seller' => $c->seller,
            'ownerPhone' => $c->owner_phone ?? '',
            'clientName' => $c->client_name ?? '',
            'clientPhone' => $c->client_phone ?? '',
            'clientEmail' => $c->client_email ?? '',
            'washPhotos' => $washUrls,
            'washPhoto' => $washUrls[0] ?? '',
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

        $care = $e->care_tips ?? null;
        if (! is_array($care)) {
            $care = null;
        }
        $careTips = $care
            ? [
                'important' => (string) ($care['important'] ?? ''),
                'tips' => array_values(
                    array_map(
                        fn ($x) => (string) $x,
                        is_array($care['tips'] ?? null) ? $care['tips'] : [],
                    ),
                ),
            ]
            : null;

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
            'careTips' => $careTips,
            'createdAt' => optional($e->created_at)->toISOString(),
            'updatedAt' => optional($e->updated_at)->toISOString(),
            'detailingName' => $isService ? (string) ($e->detailing?->name ?? '') : '',
            'detailingLogo' => $isService ? MediaStorage::publicUrl($e->detailing?->logo ?? null) : '',
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
            'url' => MediaStorage::publicUrl($d->url ?? null),
            'eventId' => $d->event_id ? (string) $d->event_id : null,
            'createdAt' => optional($d->created_at)->toISOString(),
        ];
    }

    public static function claim(\App\Models\CarClaim $c): array
    {
        $c->loadMissing('owner');
        $ow = $c->owner;

        return [
            'id' => (string) $c->id,
            'carId' => (string) $c->car_id,
            'ownerId' => (string) $c->owner_id,
            'detailingId' => (string) $c->detailing_id,
            'ownerEmail' => $ow?->email ?? '',
            'ownerName' => trim((string) ($ow?->name ?? '')),
            'ownerAccountPhone' => trim((string) ($ow?->phone ?? '')),
            'ownerGarageSlug' => trim((string) ($ow?->garage_slug ?? '')),
            'ownerGarageAvatar' => MediaStorage::publicUrl($ow?->garage_avatar ?? null),
            'status' => $c->status,
            'evidence' => $c->evidence ?? [],
            'createdAt' => optional($c->created_at)->toISOString(),
            'reviewedAt' => optional($c->reviewed_at)->toISOString(),
        ];
    }
}
