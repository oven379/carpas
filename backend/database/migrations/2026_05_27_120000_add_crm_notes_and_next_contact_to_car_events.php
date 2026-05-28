<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('car_events', function (Blueprint $table) {
            $table->text('internal_note')->nullable()->after('note');
            $table->timestampTz('next_contact_at')->nullable()->after('internal_note');
            $table->index(['detailing_id', 'next_contact_at']);
        });
    }

    public function down(): void
    {
        Schema::table('car_events', function (Blueprint $table) {
            $table->dropIndex(['detailing_id', 'next_contact_at']);
            $table->dropColumn(['internal_note', 'next_contact_at']);
        });
    }
};
