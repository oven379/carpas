<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('car_events', function (Blueprint $table) {
            $table->json('care_tips')->nullable()->after('note');
        });
    }

    public function down(): void
    {
        Schema::table('car_events', function (Blueprint $table) {
            $table->dropColumn('care_tips');
        });
    }
};
