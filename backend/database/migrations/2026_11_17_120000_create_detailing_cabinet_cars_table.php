<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('detailing_cabinet_cars', function (Blueprint $table) {
            $table->foreignId('detailing_id')->constrained('detailings')->cascadeOnDelete();
            $table->foreignId('car_id')->constrained('cars')->cascadeOnDelete();
            $table->primary(['detailing_id', 'car_id']);
            $table->index('car_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('detailing_cabinet_cars');
    }
};
