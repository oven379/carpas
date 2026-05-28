<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement(
            "with ranked as (".
            "select id, row_number() over (".
            "partition by owner_id, detailing_id, car_id, car_event_id ".
            "order by created_at desc, id desc".
            ") as rn from service_booking_requests where status in ('new', 'in_work')".
            ") update service_booking_requests set status = 'closed', ".
            "closed_at = coalesce(closed_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP ".
            "where id in (select id from ranked where rn > 1)"
        );

        DB::statement(
            "create unique index if not exists service_booking_requests_open_unique on service_booking_requests ".
            "(owner_id, detailing_id, car_id, car_event_id) where status in ('new', 'in_work')"
        );
    }

    public function down(): void
    {
        DB::statement('drop index if exists service_booking_requests_open_unique');
    }
};
