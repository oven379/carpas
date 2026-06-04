<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('car_claims', function (Blueprint $table) {
            $table->string('direction', 32)->default('owner_to_detailing')->after('status');
            $table->index(['owner_id', 'direction', 'status']);
            $table->index(['detailing_id', 'direction', 'status']);
        });
    }

    public function down(): void
    {
        Schema::table('car_claims', function (Blueprint $table) {
            $table->dropIndex(['owner_id', 'direction', 'status']);
            $table->dropIndex(['detailing_id', 'direction', 'status']);
            $table->dropColumn('direction');
        });
    }
};
