<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('detailings', function (Blueprint $table) {
            $table->json('custom_service_categories')->nullable()->after('maintenance_services_offered');
        });
    }

    public function down(): void
    {
        Schema::table('detailings', function (Blueprint $table) {
            $table->dropColumn('custom_service_categories');
        });
    }
};
