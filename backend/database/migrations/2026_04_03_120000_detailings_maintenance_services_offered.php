<?php

use App\Http\Support\ServiceOfferedCatalog;
use App\Models\Detailing;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('detailings', function (Blueprint $table) {
            $table->json('maintenance_services_offered')->nullable();
        });

        Detailing::query()->eachById(function (Detailing $d) {
            $flat = is_array($d->services_offered) ? $d->services_offered : [];
            $split = ServiceOfferedCatalog::splitFlatToBuckets($flat);
            $d->services_offered = $split['det'];
            $d->maintenance_services_offered = $split['maint'];
            $d->save();
        });
    }

    public function down(): void
    {
        Detailing::query()->eachById(function (Detailing $d) {
            $det = is_array($d->services_offered) ? $d->services_offered : [];
            $maint = is_array($d->maintenance_services_offered) ? $d->maintenance_services_offered : [];
            $d->services_offered = array_values(array_merge($det, $maint));
            $d->maintenance_services_offered = null;
            $d->save();
        });

        Schema::table('detailings', function (Blueprint $table) {
            $table->dropColumn('maintenance_services_offered');
        });
    }
};
