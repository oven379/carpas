<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Если после git pull не прогнали миграции или колонки отсутствуют — PATCH /owners/me падает с 500.
 * Добавляем только недостающие поля (безопасно при повторном запуске).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('owners')) {
            return;
        }

        if (!Schema::hasColumn('owners', 'garage_city')) {
            Schema::table('owners', function (Blueprint $table) {
                $table->string('garage_city')->default('');
            });
        }
        if (!Schema::hasColumn('owners', 'show_city_public')) {
            Schema::table('owners', function (Blueprint $table) {
                $table->boolean('show_city_public')->default(false);
            });
        }
        if (!Schema::hasColumn('owners', 'garage_website')) {
            Schema::table('owners', function (Blueprint $table) {
                $table->string('garage_website', 512)->default('');
            });
        }
        if (!Schema::hasColumn('owners', 'show_website_public')) {
            Schema::table('owners', function (Blueprint $table) {
                $table->boolean('show_website_public')->default(false);
            });
        }
        if (!Schema::hasColumn('owners', 'garage_social')) {
            Schema::table('owners', function (Blueprint $table) {
                $table->text('garage_social')->nullable();
            });
        }
        if (!Schema::hasColumn('owners', 'show_social_public')) {
            Schema::table('owners', function (Blueprint $table) {
                $table->boolean('show_social_public')->default(false);
            });
        }
        if (!Schema::hasColumn('owners', 'garage_private')) {
            Schema::table('owners', function (Blueprint $table) {
                $table->boolean('garage_private')->default(false);
            });
        }
        if (!Schema::hasColumn('owners', 'garage_banner_enabled')) {
            Schema::table('owners', function (Blueprint $table) {
                $table->boolean('garage_banner_enabled')->default(true);
            });
        }
    }

    public function down(): void
    {
        // Не откатываем: колонки могли появиться из другой миграции
    }
};
