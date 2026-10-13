<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Лимит автомобилей в гараже владельца: 1 бесплатно, администратор повышает по заявке (до 3).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('owners', function (Blueprint $table) {
            $table->unsignedSmallInteger('garage_car_limit')->default(1);
        });
    }

    public function down(): void
    {
        Schema::table('owners', function (Blueprint $table) {
            $table->dropColumn('garage_car_limit');
        });
    }
};
