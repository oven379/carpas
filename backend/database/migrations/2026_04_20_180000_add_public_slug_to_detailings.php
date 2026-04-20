<?php

use App\Http\Support\DetailingPublicSlug;
use App\Models\Detailing;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('detailings', function (Blueprint $table) {
            $table->string('public_slug', 191)->nullable()->unique();
        });

        Detailing::query()->orderBy('id')->each(function (Detailing $d) {
            if (filled($d->public_slug)) {
                return;
            }
            DetailingPublicSlug::assignUnique($d, $d->name, true);
        });
    }

    public function down(): void
    {
        Schema::table('detailings', function (Blueprint $table) {
            $table->dropUnique(['public_slug']);
            $table->dropColumn('public_slug');
        });
    }
};
