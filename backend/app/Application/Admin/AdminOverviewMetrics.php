<?php

namespace App\Application\Admin;

use App\Http\Support\PendingOwnerPool;
use App\Models\Car;
use App\Models\CarEvent;
use App\Models\Detailing;
use App\Models\DevicePushToken;
use App\Models\Owner;
use App\Models\SupportTicket;
use App\Services\FcmV1Client;
use Carbon\Carbon;

/**
 * Сводные метрики для админ-панели (обзор): только чтение БД, без HTTP.
 */
final class AdminOverviewMetrics
{
    private const MONTH_LABELS_RU = [
        1 => 'янв.', 2 => 'февр.', 3 => 'мар.', 4 => 'апр.', 5 => 'мая', 6 => 'июн.',
        7 => 'июл.', 8 => 'авг.', 9 => 'сен.', 10 => 'окт.', 11 => 'ноя.', 12 => 'дек.',
    ];

    public function __construct(
        private readonly FcmV1Client $fcm,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function build(): array
    {
        $poolEmail = PendingOwnerPool::DETAILING_EMAIL;

        $awaitingAdminReply = SupportTicket::query()
            ->where(function ($q) {
                $q->whereNull('admin_reply')->orWhere('admin_reply', '');
            })
            ->count();

        $supportCreatedLast7Days = SupportTicket::query()
            ->where('created_at', '>=', now()->subDays(7))
            ->count();

        $supportTotal = SupportTicket::query()->count();

        $partnerRegistrationsPending = Detailing::query()
            ->where('email', '!=', $poolEmail)
            ->whereNull('verification_approved_at')
            ->count();

        $partnersApproved = Detailing::query()
            ->where('email', '!=', $poolEmail)
            ->whereNotNull('verification_approved_at')
            ->count();

        $ownersTotal = Owner::query()->count();
        $carsTotal = Car::query()->count();
        $carEventsLast30Days = CarEvent::query()
            ->where('created_at', '>=', now()->subDays(30))
            ->count();

        $chartMonths = [];
        for ($i = 5; $i >= 0; $i--) {
            $start = Carbon::now()->subMonths($i)->startOfMonth();
            $end = Carbon::now()->subMonths($i)->endOfMonth();
            $chartMonths[] = [
                'key' => $start->format('Y-m'),
                'label' => self::MONTH_LABELS_RU[(int) $start->format('n')].$start->format(' Y'),
                'supportTickets' => SupportTicket::query()
                    ->whereBetween('created_at', [$start, $end])
                    ->count(),
                'newPartnerAccounts' => Detailing::query()
                    ->where('email', '!=', $poolEmail)
                    ->whereBetween('created_at', [$start, $end])
                    ->count(),
            ];
        }

        return [
            'support' => [
                'awaitingAdminReply' => $awaitingAdminReply,
                'createdLast7Days' => $supportCreatedLast7Days,
                'total' => $supportTotal,
            ],
            'partners' => [
                'pendingVerification' => $partnerRegistrationsPending,
                'approvedTotal' => $partnersApproved,
            ],
            'registry' => [
                'ownersTotal' => $ownersTotal,
                'carsTotal' => $carsTotal,
                'carEventsLast30Days' => $carEventsLast30Days,
            ],
            'push' => [
                'deviceTokensTotal' => DevicePushToken::query()->count(),
                'deviceTokensOwners' => DevicePushToken::query()->whereNotNull('owner_id')->count(),
                'deviceTokensDetailings' => DevicePushToken::query()->whereNotNull('detailing_id')->count(),
                'fcmConfigured' => $this->fcm->isConfigured(),
            ],
            'chart' => [
                'months' => $chartMonths,
            ],
        ];
    }
}
