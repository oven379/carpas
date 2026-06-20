<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('detailings', function (Blueprint $table) {
            $table->string('inn', 30)->nullable()->after('address');
            $table->string('legal_name', 255)->nullable()->after('inn');
            $table->string('master_name', 255)->nullable()->after('legal_name');
            $table->text('warranty_text')->nullable()->after('master_name');
        });
    }

    public function down(): void
    {
        Schema::table('detailings', function (Blueprint $table) {
            $table->dropColumn(['inn', 'legal_name', 'master_name', 'warranty_text']);
        });
    }
};
