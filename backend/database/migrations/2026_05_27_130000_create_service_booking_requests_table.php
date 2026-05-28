<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_booking_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_id')->constrained()->cascadeOnDelete();
            $table->foreignId('detailing_id')->constrained()->cascadeOnDelete();
            $table->foreignId('car_id')->constrained()->cascadeOnDelete();
            $table->foreignId('car_event_id')->nullable()->constrained('car_events')->nullOnDelete();
            $table->string('status', 32)->default('new');
            $table->text('message')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();

            $table->index(['detailing_id', 'status', 'created_at']);
            $table->index(['owner_id', 'created_at']);
            $table->index(['car_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_booking_requests');
    }
};
