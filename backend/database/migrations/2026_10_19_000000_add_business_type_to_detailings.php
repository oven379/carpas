<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('detailings', function (Blueprint $table) {
            // Тип бизнеса партнёра: detailing | sto | wash | tuning | prigon
            $table->string('business_type', 32)->default('detailing')->after('name');
        });
    }

    public function down(): void
    {
        Schema::table('detailings', function (Blueprint $table) {
            $table->dropColumn('business_type');
        });
    }
};
