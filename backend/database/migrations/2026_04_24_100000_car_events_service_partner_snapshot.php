<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('car_events', function (Blueprint $table) {
            $table->string('service_partner_name')->nullable();
            $table->text('service_partner_logo')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('car_events', function (Blueprint $table) {
            $table->dropColumn(['service_partner_name', 'service_partner_logo']);
        });
    }
};
