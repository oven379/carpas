<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('owners', function (Blueprint $table) {
            $table->string('garage_city')->default('');
            $table->boolean('show_city_public')->default(false);
            $table->string('garage_website', 512)->default('');
            $table->boolean('show_website_public')->default(false);
            $table->text('garage_social')->nullable();
            $table->boolean('show_social_public')->default(false);
        });
    }

    public function down(): void
    {
        Schema::table('owners', function (Blueprint $table) {
            $table->dropColumn([
                'garage_city',
                'show_city_public',
                'garage_website',
                'show_website_public',
                'garage_social',
                'show_social_public',
            ]);
        });
    }
};
