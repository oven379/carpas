<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('owners')) {
            return;
        }
        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE owners ALTER COLUMN garage_private SET DEFAULT true');
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('owners')) {
            return;
        }
        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE owners ALTER COLUMN garage_private SET DEFAULT false');
        }
    }
};
