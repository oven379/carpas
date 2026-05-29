<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('detailing_client_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('detailing_id')->constrained('detailings')->cascadeOnDelete();
            $table->foreignId('owner_id')->nullable()->constrained('owners')->nullOnDelete();
            $table->string('client_key', 160);
            $table->text('note')->nullable();
            $table->timestamps();

            $table->unique(['detailing_id', 'client_key']);
            $table->index(['detailing_id', 'owner_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('detailing_client_notes');
    }
};
