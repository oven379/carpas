<?php

namespace App\Application\Cars;

use App\Http\Support\PendingOwnerPool;
use App\Models\Car;
use App\Models\Owner;

/**
 * Удаление авто из гаража владельца: при привязке к партнёрскому кабинету — только снятие владельца;
 * иначе (личный гараж или пул ожидания) — полное удаление карточки.
 */
final class RemoveCarFromOwnerGarage
{
    public function handle(Owner $owner, Car $car): void
    {
        if ((int) $car->owner_id !== (int) $owner->id) {
            throw new \InvalidArgumentException('Карточка должна принадлежать этому владельцу.');
        }

        if ($car->detailing_id !== null && ! PendingOwnerPool::isPoolDetailingId((int) $car->detailing_id)) {
            $car->owner_id = null;
            $car->pending_owner_email = null;
            $car->save();

            return;
        }

        $car->delete();
    }
}
