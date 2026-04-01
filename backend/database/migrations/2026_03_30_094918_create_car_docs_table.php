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
        Schema::create('car_docs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('detailing_id')->constrained('detailings')->cascadeOnDelete();
            $table->foreignId('car_id')->constrained('cars')->cascadeOnDelete();
            $table->foreignId('event_id')->nullable()->constrained('car_events')->nullOnDelete();

            $table->string('title')->default('Файл');
            $table->string('kind')->default('photo');
            $table->text('url')->nullable();

            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->nullable();

            $table->index(['car_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('car_docs');
    }
};
