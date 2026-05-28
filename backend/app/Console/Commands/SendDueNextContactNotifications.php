<?php

namespace App\Console\Commands;

use App\Models\AppNotification;
use App\Models\CarEvent;
use App\Services\InternalNotificationService;
use Illuminate\Console\Command;

class SendDueNextContactNotifications extends Command
{
    protected $signature = 'notifications:send-due-next-contacts {--dry-run : Only count due notifications}';

    protected $description = 'Create internal CRM notifications for due next-contact dates from detailing visits.';

    public function handle(InternalNotificationService $notifications): int
    {
        $created = 0;
        $dryRun = (bool) $this->option('dry-run');

        CarEvent::query()
            ->with('car.owner')
            ->where('source', 'service')
            ->where('is_draft', false)
            ->whereNotNull('detailing_id')
            ->whereNotNull('next_contact_at')
            ->where('next_contact_at', '<=', now())
            ->orderBy('next_contact_at')
            ->chunkById(100, function ($events) use ($notifications, $dryRun, &$created) {
                foreach ($events as $event) {
                    $eventId = (string) $event->id;
                    $exists = AppNotification::query()
                        ->where('detailing_id', $event->detailing_id)
                        ->where('kind', 'crm_next_contact')
                        ->where('data->eventId', $eventId)
                        ->exists();

                    if ($exists) {
                        continue;
                    }

                    $created++;
                    if ($dryRun) {
                        continue;
                    }

                    $car = $event->car;
                    $carName = trim(implode(' ', array_filter([
                        (string) ($car?->make ?? ''),
                        (string) ($car?->model ?? ''),
                    ]))) ?: 'авто клиента';
                    $clientName = trim((string) ($car?->client_name ?: $car?->owner?->name ?: 'Клиент'));
                    $clientPhone = trim((string) ($car?->client_phone ?: $car?->owner?->phone ?: $car?->owner_phone ?: ''));

                    $notifications->createForDetailing(
                        (int) $event->detailing_id,
                        'Рекомендованное время контакта',
                        $clientName.': '.$carName.'. Подошло время повторного ухода, свяжитесь с клиентом.',
                        'crm_next_contact',
                        [
                            'carId' => (string) $event->car_id,
                            'eventId' => $eventId,
                            'detailingId' => (string) $event->detailing_id,
                            'nextContactAt' => optional($event->next_contact_at)->toISOString(),
                            'ownerName' => $clientName,
                            'ownerPhone' => $clientPhone,
                            'carName' => $carName,
                            'requestType' => 'next_contact',
                            'requestTypeLabel' => 'Время от мастера',
                        ],
                    );
                }
            });

        $this->info(($dryRun ? 'Due notifications: ' : 'Created notifications: ').$created);

        return self::SUCCESS;
    }
}
