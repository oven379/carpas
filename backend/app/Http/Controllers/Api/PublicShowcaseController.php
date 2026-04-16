<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Support\ApiResources;
use App\Http\Support\MediaStorage;
use App\Models\Car;
use App\Models\CarDoc;
use App\Models\CarEvent;
use App\Models\Detailing;
use App\Models\Owner;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

class PublicShowcaseController extends Controller
{
    /** Первое фото визита/мойки, допустимое для публичной витрины (согласие allow_public_photos). */
    private function carFirstPublicShowcasePhotoUrl(Car $car): ?string
    {
        $evt = CarEvent::query()
            ->where('car_id', $car->id)
            ->where('source', 'service')
            ->where('is_draft', false)
            ->where('allow_public_photos', true)
            ->whereExists(function ($q) {
                $q->selectRaw('1')
                    ->from('car_docs')
                    ->whereColumn('car_docs.event_id', 'car_events.id')
                    ->whereNotNull('car_docs.url')
                    ->where('car_docs.url', '!=', '')
                    ->where(function ($q2) {
                        $q2->where('car_docs.kind', 'photo')->orWhereNull('car_docs.kind');
                    });
            })
            ->orderByDesc('at')
            ->orderByDesc('id')
            ->first();

        if ($evt) {
            $doc = CarDoc::query()
                ->where('car_id', $car->id)
                ->where('event_id', $evt->id)
                ->whereNotNull('url')
                ->where('url', '!=', '')
                ->where(function ($q) {
                    $q->where('kind', 'photo')->orWhereNull('kind');
                })
                ->orderByDesc('created_at')
                ->first();
            if ($doc && $doc->url) {
                return MediaStorage::publicUrl($doc->url);
            }
        }

        $wash = $car->wash_photos ?? [];
        if (! is_array($wash) || $wash === []) {
            return null;
        }
        $evtForTs = CarEvent::query()
            ->where('car_id', $car->id)
            ->where('source', 'service')
            ->where('is_draft', false)
            ->orderByDesc('at')
            ->orderByDesc('id')
            ->first();
        if (! $evtForTs || ! $evtForTs->allow_public_photos) {
            return null;
        }
        foreach ($wash as $raw) {
            if (is_string($raw) && trim($raw) !== '') {
                return MediaStorage::publicUrl($raw);
            }
        }

        return null;
    }

    /**
     * Карточки для главной: авто у партнёрских детейлингов, у которых есть публично разрешённое фото.
     */
    public function landingGarageCards(Request $request)
    {
        $limit = min(24, max(1, (int) $request->query('limit', 12)));

        $cars = Car::query()
            ->whereHas('detailing', fn ($q) => $q->where('is_personal', false))
            ->with('detailing')
            ->orderByDesc('updated_at')
            ->limit(400)
            ->get();

        $out = [];
        foreach ($cars as $car) {
            if (count($out) >= $limit) {
                break;
            }
            $photo = $this->carFirstPublicShowcasePhotoUrl($car);
            if (! $photo) {
                continue;
            }
            $out[] = [
                'id' => (string) $car->id,
                'make' => $car->make ?? '',
                'model' => $car->model ?? '',
                'year' => $car->year,
                'mileageKm' => (int) ($car->mileage_km ?? 0),
                'photo' => $photo,
                'detailingId' => (string) ($car->detailing_id ?? ''),
                'detailingName' => $car->detailing?->name ?? '',
                'detailingLogo' => MediaStorage::publicUrl($car->detailing?->logo ?? null),
            ];
        }

        return response()->json($out);
    }

    public function stats()
    {
        return response()->json([
            'cars' => Car::query()->count(),
        ]);
    }

    public function recentCars(Request $request)
    {
        $limit = min(20, max(1, (int) $request->query('limit', 6)));

        $cars = Car::query()
            ->whereHas('detailing', fn ($q) => $q->where('is_personal', false))
            ->with('owner')
            ->orderByDesc('updated_at')
            ->limit($limit)
            ->get();

        return response()->json($cars->map(fn ($c) => ApiResources::car($c))->values());
    }

    /** Владелец гаража (личный «тень»-детейлинг) может открыть /d/:id со своим токеном; для остальных — 404. */
    private function ownerFromBearerForPublicShowcase(Request $request): ?Owner
    {
        $raw = $request->bearerToken();
        if (! is_string($raw) || trim($raw) === '') {
            return null;
        }
        $pat = PersonalAccessToken::findToken($raw);
        if (! $pat || ! $pat->tokenable instanceof Owner) {
            return null;
        }

        return $pat->tokenable;
    }

    public function detailing(Request $request, $id)
    {
        $d = Detailing::query()->find($id);
        if (! $d) {
            abort(404);
        }
        if ($d->is_personal) {
            $owner = $this->ownerFromBearerForPublicShowcase($request);
            if (! $owner || (int) $d->owner_id !== (int) $owner->id) {
                abort(404);
            }
        }

        $cars = Car::query()->where('detailing_id', $d->id)->get();
        $best = [];
        foreach ($cars as $car) {
            /** Последний по дате сервисный визит, у которого есть фото в car_docs (не только «последний визит» без вложений). */
            $evt = CarEvent::query()
                ->where('car_id', $car->id)
                ->where('source', 'service')
                ->where('is_draft', false)
                ->where('allow_public_photos', true)
                ->whereExists(function ($q) {
                    $q->selectRaw('1')
                        ->from('car_docs')
                        ->whereColumn('car_docs.event_id', 'car_events.id')
                        ->whereNotNull('car_docs.url')
                        ->where('car_docs.url', '!=', '')
                        ->where(function ($q2) {
                            $q2->where('car_docs.kind', 'photo')->orWhereNull('car_docs.kind');
                        });
                })
                ->orderByDesc('at')
                ->orderByDesc('id')
                ->first();

            if ($evt) {
                $docs = CarDoc::query()
                    ->where('car_id', $car->id)
                    ->where('event_id', $evt->id)
                    ->whereNotNull('url')
                    ->where('url', '!=', '')
                    ->where(function ($q) {
                        $q->where('kind', 'photo')->orWhereNull('kind');
                    })
                    ->orderByDesc('created_at')
                    ->get();

                $ts = optional($evt->at)->toISOString() ?? '';
                foreach ($docs as $doc) {
                    if (! $doc->url) {
                        continue;
                    }
                    $best[] = [
                        'url' => MediaStorage::publicUrl($doc->url),
                        'ts' => $ts,
                    ];
                }

                continue;
            }

            /** Фото после мойки часто попадают в wash_photos авто без привязки к последнему визиту в docs — показываем их на лендинге. */
            $wash = $car->wash_photos ?? [];
            if (! is_array($wash) || $wash === []) {
                continue;
            }
            $evtForTs = CarEvent::query()
                ->where('car_id', $car->id)
                ->where('source', 'service')
                ->where('is_draft', false)
                ->orderByDesc('at')
                ->orderByDesc('id')
                ->first();
            if (! $evtForTs || ! $evtForTs->allow_public_photos) {
                continue;
            }
            $tsWash = optional($evtForTs->at)->toISOString() ?? optional($car->updated_at)->toISOString() ?? '';
            foreach ($wash as $raw) {
                if (! is_string($raw) || trim($raw) === '') {
                    continue;
                }
                $best[] = [
                    'url' => MediaStorage::publicUrl($raw),
                    'ts' => $tsWash,
                ];
            }
        }
        usort($best, fn ($a, $b) => strcmp((string) ($b['ts'] ?? ''), (string) ($a['ts'] ?? '')));
        $uniq = [];
        $seen = [];
        foreach ($best as $x) {
            $u = (string) ($x['url'] ?? '');
            if ($u === '' || isset($seen[$u])) {
                continue;
            }
            $seen[$u] = true;
            $uniq[] = $u;
            if (count($uniq) >= 10) {
                break;
            }
        }

        return response()->json([
            'detailing' => ApiResources::detailing($d),
            'carsCount' => $cars->count(),
            'lastWorkPhotos' => $uniq,
        ]);
    }

    /**
     * Партнёрский детейлинг (не личный «тень»-кабинет владельца) с авто этого владельца видит полный ответ,
     * даже если garage_private — для анонимов страница закрыта.
     */
    private function partnerDetailingLinkedToOwnerFromBearer(Request $request, Owner $owner): ?Detailing
    {
        $raw = $request->bearerToken();
        if (! is_string($raw) || trim($raw) === '') {
            return null;
        }
        $pat = PersonalAccessToken::findToken($raw);
        if (! $pat || ! $pat->tokenable instanceof Detailing) {
            return null;
        }
        $d = $pat->tokenable;
        if ($d->is_personal) {
            return null;
        }
        $linked = Car::query()
            ->where('detailing_id', $d->id)
            ->where('owner_id', $owner->id)
            ->exists();

        return $linked ? $d : null;
    }

    public function ownerGarage(Request $request, $slug)
    {
        $s = mb_strtolower(trim((string) $slug));
        $owner = Owner::query()->whereRaw('lower(trim(garage_slug)) = ?', [$s])->firstOrFail();
        $carsCount = Car::query()->where('owner_id', $owner->id)->count();

        $ownerPayload = ApiResources::owner($owner);
        unset($ownerPayload['email']);

        $linkedPartner = $this->partnerDetailingLinkedToOwnerFromBearer($request, $owner);
        $hideFromPublic = (bool) $owner->garage_private && $linkedPartner === null;

        if ($hideFromPublic) {
            return response()->json([
                'owner' => $ownerPayload,
                'garagePrivate' => true,
                'carsCount' => $carsCount,
                'cars' => [],
            ]);
        }

        $cars = Car::query()->where('owner_id', $owner->id)->with('owner')->orderByDesc('updated_at')->get();

        return response()->json([
            'owner' => $ownerPayload,
            'garagePrivate' => false,
            'carsCount' => $cars->count(),
            'cars' => $cars->map(fn ($c) => ApiResources::car($c))->values(),
        ]);
    }
}
