<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('car_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('detailing_id')->constrained('detailings')->cascadeOnDelete();
            $table->foreignId('car_id')->constrained('cars')->cascadeOnDelete();

            $table->timestampTz('at')->nullable();
            $table->string('type')->default('visit');
            $table->string('title')->default('');
            $table->integer('mileage_km')->default(0);
            $table->json('services')->nullable();
            $table->text('note')->nullable();

            $table->timestamps();

            $table->index(['car_id', 'at']);
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('car_events');
    }
};
