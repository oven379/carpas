<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('detailings', function (Blueprint $table) {
            $table->text('working_hours')->nullable()->after('description');
        });
    }

    public function down(): void
    {
        Schema::table('detailings', function (Blueprint $table) {
            $table->dropColumn('working_hours');
        });
    }
};
