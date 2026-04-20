<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('detailings', function (Blueprint $table) {
            $table->timestampTz('verification_approved_at')->nullable()->after('profile_completed');
        });

        // Уже существующие партнёрские кабинеты остаются доступны; новые регистрации ждут подтверждения.
        DB::table('detailings')
            ->where('is_personal', false)
            ->whereNull('verification_approved_at')
            ->update(['verification_approved_at' => now()]);
    }

    public function down(): void
    {
        Schema::table('detailings', function (Blueprint $table) {
            $table->dropColumn('verification_approved_at');
        });
    }
};
