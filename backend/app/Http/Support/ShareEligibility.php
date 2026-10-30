<?php

namespace App\Http\Support;

use App\Models\Car;
use App\Models\CarEvent;
use Illuminate\Support\Carbon;

/**
 * Публичная ссылка на историю доступна, когда история реально ведётся:
 * минимум 6 собственных визитов владельца ИЛИ первая запись старше 3 месяцев.
 *
 * Считаются сохранённые (не черновики) визиты владельца: именно они показываются по ссылке.
 * «Давность» берётся по created_at записи, а не по дате визита, чтобы её нельзя было получить задним числом.
 */
final class ShareEligibility
{
    public const MIN_VISITS = 6;

    public const MIN_MONTHS = 3;

    /**
     * @return array{eligible: bool, visits: int, requiredVisits: int, requiredMonths: int, firstVisitAt: ?string, eligibleSince: ?string}
     */
    public static function forCar(Car $car, ?Carbon $now = null): array
    {
        $now ??= now();

        $base = CarEvent::query()
            ->where('car_id', $car->id)
            ->where('source', 'owner')
            ->where('is_draft', false);

        $visits = (clone $base)->count();
        $first = $visits > 0 ? (clone $base)->min('created_at') : null;
        $firstAt = $first ? Carbon::parse($first) : null;
        $monthsReachedAt = $firstAt?->copy()->addMonths(self::MIN_MONTHS);

        $eligible = $visits >= self::MIN_VISITS || ($monthsReachedAt !== null && $monthsReachedAt->lte($now));

        return [
            'eligible' => $eligible,
            'visits' => $visits,
            'requiredVisits' => self::MIN_VISITS,
            'requiredMonths' => self::MIN_MONTHS,
            'firstVisitAt' => $firstAt?->toISOString(),
            'eligibleSince' => $monthsReachedAt?->toISOString(),
        ];
    }
}
