<?php

namespace App\Application\Cars;

use App\Models\Car;
use App\Models\CarDoc;
use App\Models\CarEvent;
use App\Models\Detailing;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;

/**
 * Снимает привязку и сохраняет снимок партнёра в визитах, если у карточки есть владелец или другой кабинет.
 * Удаляет строку и медиа (boot модели Car), если карточка осталась только в текущем кабинете.
 */
final class RemoveCarFromDetailingCabinet
{
    public function handle(Detailing $detailing, int $carId): void
    {
        DB::transaction(function () use ($detailing, $carId) {
            $car = Car::query()->lockForUpdate()->findOrFail($carId);
            $isHome = (int) $car->detailing_id === (int) $detailing->id;
            $removedLink = $car->detailingsWithCabinetLink()->detach($detailing->id);
            if (! $isHome && $removedLink === 0) {
                throw (new ModelNotFoundException)->setModel(Car::class, [$carId]);
            }

            if ($isHome && $car->owner_id === null && ! $car->detailingsWithCabinetLink()->exists()) {
                $car->delete();

                return;
            }

            $this->detachServiceHistory($detailing, $car);
            if ($isHome) {
                $car->detailing_id = null;
                $car->save();
            }
        });
    }

    private function detachServiceHistory(Detailing $detailing, Car $car): void
    {
        $partnerName = trim((string) ($detailing->name ?? ''));
        $partnerLogo = $detailing->logo;

        CarEvent::query()
            ->where('car_id', $car->id)
            ->where('detailing_id', $detailing->id)
            ->update([
                'detailing_id' => null,
                'service_partner_name' => $partnerName !== '' ? $partnerName : null,
                'service_partner_logo' => $partnerLogo,
            ]);

        CarDoc::query()
            ->where('car_id', $car->id)
            ->where('detailing_id', $detailing->id)
            ->update(['detailing_id' => null]);
    }
}
