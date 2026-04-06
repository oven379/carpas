<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('owners')) {
            return;
        }
        if (!Schema::hasColumn('owners', 'garage_banner_enabled')) {
            Schema::table('owners', function (Blueprint $table) {
                $table->boolean('garage_banner_enabled')->default(true);
            });
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('owners') || !Schema::hasColumn('owners', 'garage_banner_enabled')) {
            return;
        }
        Schema::table('owners', function (Blueprint $table) {
            $table->dropColumn('garage_banner_enabled');
        });
    }
};
