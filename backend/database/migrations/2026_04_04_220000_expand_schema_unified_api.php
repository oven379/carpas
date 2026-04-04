<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('owners', function (Blueprint $table) {
            $table->id();
            $table->string('email')->unique();
            $table->string('password');
            $table->string('name')->default('');
            $table->string('phone')->default('');
            $table->string('garage_slug')->nullable()->unique();
            $table->text('garage_banner')->nullable();
            $table->text('garage_avatar')->nullable();
            $table->boolean('show_phone_public')->default(false);
            $table->boolean('is_premium')->default(false);
            $table->rememberToken();
            $table->timestamps();
        });

        Schema::table('detailings', function (Blueprint $table) {
            $table->string('phone')->default('');
            $table->string('contact_name')->default('');
            $table->string('city')->default('');
            $table->string('address')->default('');
            $table->text('description')->default('');
            $table->string('website')->default('');
            $table->string('telegram')->default('');
            $table->string('instagram')->default('');
            $table->text('logo')->nullable();
            $table->text('cover')->nullable();
            $table->json('services_offered')->nullable();
            $table->boolean('profile_completed')->default(true);
            $table->boolean('is_personal')->default(false);
            $table->foreignId('owner_id')->nullable()->unique()->constrained('owners')->nullOnDelete();
        });

        Schema::table('cars', function (Blueprint $table) {
            $table->foreignId('owner_id')->nullable()->after('detailing_id')->constrained('owners')->nullOnDelete();
            $table->string('plate_region')->default('');
            $table->string('owner_phone')->default('');
            $table->string('client_name')->default('');
            $table->string('client_phone')->default('');
            $table->string('client_email')->default('');
            $table->json('wash_photos')->nullable();
        });

        Schema::create('car_claims', function (Blueprint $table) {
            $table->id();
            $table->foreignId('car_id')->constrained('cars')->cascadeOnDelete();
            $table->foreignId('owner_id')->constrained('owners')->cascadeOnDelete();
            $table->foreignId('detailing_id')->constrained('detailings')->cascadeOnDelete();
            $table->string('status')->default('pending');
            $table->json('evidence')->nullable();
            $table->timestampTz('reviewed_at')->nullable();
            $table->timestamps();
            $table->index(['detailing_id', 'status']);
            $table->index(['owner_id', 'status']);
        });

        Schema::table('car_events', function (Blueprint $table) {
            $table->string('source')->default('service');
            $table->foreignId('owner_id')->nullable()->after('car_id')->constrained('owners')->nullOnDelete();
            $table->json('maintenance_services')->nullable();
        });

        Schema::table('car_docs', function (Blueprint $table) {
            $table->string('source')->default('service');
            $table->foreignId('owner_id')->nullable()->after('car_id')->constrained('owners')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('car_docs', function (Blueprint $table) {
            $table->dropForeign(['owner_id']);
            $table->dropColumn(['source', 'owner_id']);
        });

        Schema::table('car_events', function (Blueprint $table) {
            $table->dropForeign(['owner_id']);
            $table->dropColumn(['source', 'owner_id', 'maintenance_services']);
        });

        Schema::dropIfExists('car_claims');

        Schema::table('cars', function (Blueprint $table) {
            $table->dropForeign(['owner_id']);
            $table->dropColumn([
                'owner_id',
                'plate_region',
                'owner_phone',
                'client_name',
                'client_phone',
                'client_email',
                'wash_photos',
            ]);
        });

        Schema::table('detailings', function (Blueprint $table) {
            $table->dropForeign(['owner_id']);
            $table->dropColumn([
                'phone',
                'contact_name',
                'city',
                'address',
                'description',
                'website',
                'telegram',
                'instagram',
                'logo',
                'cover',
                'services_offered',
                'profile_completed',
                'is_personal',
                'owner_id',
            ]);
        });

        Schema::dropIfExists('owners');
    }
};
