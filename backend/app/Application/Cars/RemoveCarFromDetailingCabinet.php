<?php

namespace App\Application\Cars;

use App\Models\Car;
use App\Models\CarDoc;
use App\Models\CarEvent;
use App\Models\Detailing;
use Illuminate\Support\Facades\DB;

/**
 * Удаление карточки из кабинета детейлинга: при общей карточке с владельцем — только снятие связи и снимок партнёра в визитах;
 * без владельца — полное удаление строки и медиа (boot модели Car).
 */
final class RemoveCarFromDetailingCabinet
{
    public function handle(Detailing $detailing, Car $car): void
    {
        if ((int) $car->detailing_id !== (int) $detailing->id) {
            throw new \InvalidArgumentException('Карточка должна принадлежать строке этого детейлинга.');
        }

        if ($car->owner_id !== null) {
            $this->detachSharedCar($detailing, $car);

            return;
        }

        $car->delete();
    }

    private function detachSharedCar(Detailing $detailing, Car $car): void
    {
        $partnerName = trim((string) ($detailing->name ?? ''));
        $partnerLogo = $detailing->logo;

        DB::transaction(function () use ($car, $detailing, $partnerName, $partnerLogo) {
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

            $car->detailing_id = null;
            $car->save();
        });
    }
}
