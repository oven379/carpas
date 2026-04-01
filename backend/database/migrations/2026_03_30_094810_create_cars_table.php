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
        Schema::create('cars', function (Blueprint $table) {
            $table->id();
            $table->foreignId('detailing_id')->constrained('detailings')->cascadeOnDelete();

            $table->string('vin')->default('');
            $table->string('plate')->default('');
            $table->string('make')->default('');
            $table->string('model')->default('');
            $table->integer('year')->nullable();
            $table->integer('mileage_km')->default(0);
            $table->integer('price_rub')->default(0);
            $table->string('color')->default('');
            $table->string('city')->default('');
            $table->text('hero')->nullable();
            $table->string('segment')->default('mass');
            $table->json('seller')->nullable();
            $table->timestamps();

            $table->index(['detailing_id', 'updated_at']);
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('cars');
    }
};
