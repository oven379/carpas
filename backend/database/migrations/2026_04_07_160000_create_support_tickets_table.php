<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('support_tickets', function (Blueprint $table) {
            $table->id();
            $table->string('author_role', 16);
            $table->foreignId('owner_id')->nullable()->constrained('owners')->nullOnDelete();
            $table->foreignId('detailing_id')->nullable()->constrained('detailings')->nullOnDelete();
            $table->string('guest_email')->nullable();
            $table->string('page_path', 512);
            $table->string('page_title', 255)->nullable();
            $table->json('context')->nullable();
            $table->text('body');
            $table->string('attachment_path', 512)->nullable();
            $table->text('admin_reply')->nullable();
            $table->timestamp('admin_replied_at')->nullable();
            $table->timestamp('user_read_at')->nullable();
            $table->timestamps();

            $table->index(['owner_id', 'created_at']);
            $table->index(['detailing_id', 'created_at']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('support_tickets');
    }
};
