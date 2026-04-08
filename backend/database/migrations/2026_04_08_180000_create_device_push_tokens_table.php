<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('device_push_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_id')->nullable()->constrained('owners')->cascadeOnDelete();
            $table->foreignId('detailing_id')->nullable()->constrained('detailings')->cascadeOnDelete();
            $table->string('token', 512)->unique();
            $table->string('platform', 16);
            $table->timestamps();

            $table->index(['owner_id']);
            $table->index(['detailing_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('device_push_tokens');
    }
};
