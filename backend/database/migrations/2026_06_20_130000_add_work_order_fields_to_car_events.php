<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('car_events', function (Blueprint $table) {
            $table->string('order_number', 50)->nullable()->after('title');
            $table->string('reason', 1000)->nullable()->after('note');
            $table->text('special_notes')->nullable()->after('reason');
            $table->string('master_name', 255)->nullable()->after('special_notes');
            $table->json('work_items')->nullable()->after('master_name');
            $table->json('parts_items')->nullable()->after('work_items');
        });
    }

    public function down(): void
    {
        Schema::table('car_events', function (Blueprint $table) {
            $table->dropColumn(['order_number', 'reason', 'special_notes', 'master_name', 'work_items', 'parts_items']);
        });
    }
};
