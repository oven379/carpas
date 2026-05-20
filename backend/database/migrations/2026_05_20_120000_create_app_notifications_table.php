<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('app_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_id')->nullable()->constrained('owners')->cascadeOnDelete();
            $table->foreignId('detailing_id')->nullable()->constrained('detailings')->cascadeOnDelete();
            $table->string('kind', 64)->default('system');
            $table->string('title', 160);
            $table->text('body');
            $table->json('data')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->boolean('sent_by_admin')->default(false);
            $table->boolean('push_sent')->default(false);
            $table->boolean('push_failed')->default(false);
            $table->timestamps();

            $table->index(['owner_id', 'read_at', 'created_at']);
            $table->index(['detailing_id', 'read_at', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('app_notifications');
    }
};
