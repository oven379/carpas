<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('owners')) {
            return;
        }
        if (! Schema::hasColumn('owners', 'garage_private')) {
            Schema::table('owners', function (Blueprint $table) {
                $table->boolean('garage_private')->default(true);
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('owners')) {
            return;
        }
        if (Schema::hasColumn('owners', 'garage_private')) {
            Schema::table('owners', function (Blueprint $table) {
                $table->dropColumn('garage_private');
            });
        }
    }
};
