<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Support\ApiResources;
use App\Models\Car;
use App\Models\CarDoc;
use App\Models\CarEvent;
use App\Models\Detailing;
use App\Models\Owner;
use Illuminate\Http\Request;

class PublicShowcaseController extends Controller
{
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

    public function detailing(Request $request, $id)
    {
        $d = Detailing::query()
            ->where('is_personal', false)
            ->findOrFail($id);

        $cars = Car::query()->where('detailing_id', $d->id)->get();
        $best = [];
        foreach ($cars as $car) {
            $evt = CarEvent::query()
                ->where('car_id', $car->id)
                ->where('source', 'service')
                ->orderByDesc('at')
                ->first();
            if (!$evt) {
                continue;
            }
            $doc = CarDoc::query()
                ->where('car_id', $car->id)
                ->where('event_id', $evt->id)
                ->whereNotNull('url')
                ->where('url', '!=', '')
                ->orderByDesc('created_at')
                ->first();
            if ($doc && $doc->url) {
                $best[] = [
                    'url' => (string) $doc->url,
                    'ts' => optional($evt->at)->toISOString() ?? '',
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

    public function ownerGarage(Request $request, $slug)
    {
        $s = mb_strtolower(trim((string) $slug));
        $owner = Owner::query()->whereRaw('lower(trim(garage_slug)) = ?', [$s])->firstOrFail();
        $cars = Car::query()->where('owner_id', $owner->id)->with('owner')->orderByDesc('updated_at')->get();

        return response()->json([
            'owner' => ApiResources::owner($owner),
            'cars' => $cars->map(fn ($c) => ApiResources::car($c))->values(),
        ]);
    }
}
