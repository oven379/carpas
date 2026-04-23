<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $personalIds = DB::table('detailings')->where('is_personal', true)->pluck('id')->all();

        if ($personalIds !== []) {
            DB::table('car_claims')->whereIn('detailing_id', $personalIds)->delete();
            DB::table('personal_access_tokens')
                ->where('tokenable_type', 'App\\Models\\Detailing')
                ->whereIn('tokenable_id', $personalIds)
                ->delete();
            DB::table('device_push_tokens')->whereIn('detailing_id', $personalIds)->delete();
            DB::table('support_tickets')->whereIn('detailing_id', $personalIds)->update(['detailing_id' => null]);

            DB::table('cars')->whereIn('detailing_id', $personalIds)->update(['detailing_id' => null]);
            DB::table('car_events')->whereIn('detailing_id', $personalIds)->update(['detailing_id' => null]);
            DB::table('car_docs')->whereIn('detailing_id', $personalIds)->update(['detailing_id' => null]);

            DB::table('detailings')->whereIn('id', $personalIds)->delete();
        }

        $this->nullableDetailingFk('cars');
        $this->nullableDetailingFk('car_events');
        $this->nullableDetailingFk('car_docs');

        $this->dropDetailingsOwnerColumns();

        DB::table('detailings')
            ->where('email', 'carpas-pending-owner-pool@system.invalid')
            ->whereNull('verification_approved_at')
            ->update(['verification_approved_at' => now()]);
    }

    public function down(): void
    {
        Schema::table('detailings', function (Blueprint $table) {
            $table->boolean('is_personal')->default(false);
            $table->foreignId('owner_id')->nullable()->unique()->constrained('owners')->nullOnDelete();
        });

        $this->restoreNotNullDetailingFk('car_docs');
        $this->restoreNotNullDetailingFk('car_events');
        $this->restoreNotNullDetailingFk('cars');
    }

    private function nullableDetailingFk(string $tableName): void
    {
        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'sqlite') {
            $this->sqliteMakeDetailingIdNullable($tableName);

            return;
        }

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->dropForeign(['detailing_id']);
            });
            DB::statement('ALTER TABLE `'.$tableName.'` MODIFY `detailing_id` BIGINT UNSIGNED NULL');
            Schema::table($tableName, function (Blueprint $table) {
                $table->foreign('detailing_id')->references('id')->on('detailings')->nullOnDelete();
            });

            return;
        }

        throw new \RuntimeException('Unsupported DB driver for migration: '.$driver);
    }

    private function restoreNotNullDetailingFk(string $tableName): void
    {
        DB::table($tableName)->whereNull('detailing_id')->delete();
        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'sqlite') {
            $this->sqliteMakeDetailingIdNotNull($tableName);

            return;
        }

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->dropForeign(['detailing_id']);
            });
            DB::statement('ALTER TABLE `'.$tableName.'` MODIFY `detailing_id` BIGINT UNSIGNED NOT NULL');
            Schema::table($tableName, function (Blueprint $table) {
                $table->foreign('detailing_id')->references('id')->on('detailings')->cascadeOnDelete();
            });

            return;
        }

        throw new \RuntimeException('Unsupported DB driver for migration rollback: '.$driver);
    }

    /**
     * SQLite: пересборка таблицы без внешнего ключа на detailings.detailing_id (колонка nullable).
     */
    private function sqliteMakeDetailingIdNullable(string $table): void
    {
        $this->sqliteRecreateTableWithDetailingIdShape($table, true);
    }

    private function sqliteMakeDetailingIdNotNull(string $table): void
    {
        $this->sqliteRecreateTableWithDetailingIdShape($table, false);
    }

    private function sqliteRecreateTableWithDetailingIdShape(string $table, bool $detailingNullable): void
    {
        if (! preg_match('/^[a-z0-9_]+$/i', $table)) {
            throw new \InvalidArgumentException('Invalid table identifier.');
        }
        $this->sqliteDropIndexesReferencingColumn($table, 'detailing_id');
        $tmp = $table.'__mig_rebuild';
        $rows = DB::select("PRAGMA table_info('{$table}')");
        $defs = [];
        foreach ($rows as $row) {
            $name = (string) $row->name;
            if ($name === 'detailing_id') {
                $defs[] = '"detailing_id" INTEGER'.($detailingNullable ? '' : ' NOT NULL');

                continue;
            }
            $type = trim((string) ($row->type ?? '')) ?: 'TEXT';
            $line = '"'.$name.'" '.$type;
            if ((int) $row->pk === 1) {
                $line .= ' PRIMARY KEY AUTOINCREMENT';
            }
            if ((int) $row->notnull === 1 && (int) $row->pk !== 1) {
                $line .= ' NOT NULL';
            }
            if ($row->dflt_value !== null && $row->dflt_value !== '') {
                $line .= ' DEFAULT '.$row->dflt_value;
            }
            $defs[] = $line;
        }
        DB::statement('PRAGMA foreign_keys = OFF');
        DB::statement('CREATE TABLE "'.$tmp.'" ('.implode(', ', $defs).')');
        $colList = implode(', ', array_map(static fn ($r) => '"'.$r->name.'"', $rows));
        DB::statement("INSERT INTO \"{$tmp}\" ({$colList}) SELECT {$colList} FROM \"{$table}\"");
        DB::statement('DROP TABLE "'.$table.'"');
        DB::statement('ALTER TABLE "'.$tmp.'" RENAME TO "'.$table.'"');
        DB::statement('PRAGMA foreign_keys = ON');
    }

    private function sqliteDropIndexesReferencingColumn(string $table, string $column): void
    {
        if (! preg_match('/^[a-z0-9_]+$/i', $table)) {
            throw new \InvalidArgumentException('Invalid table identifier.');
        }
        $indexes = DB::select("PRAGMA index_list('{$table}')");
        foreach ($indexes as $ix) {
            $name = (string) ($ix->name ?? '');
            if ($name === '' || str_starts_with($name, 'sqlite_')) {
                continue;
            }
            $qi = str_replace('"', '""', $name);
            $cols = DB::select('PRAGMA index_info("'.$qi.'")');
            foreach ($cols as $c) {
                if (($c->name ?? '') === $column) {
                    DB::statement('DROP INDEX IF EXISTS "'.$qi.'"');

                    break;
                }
            }
        }
    }

    private function dropDetailingsOwnerColumns(): void
    {
        if (Schema::getConnection()->getDriverName() === 'sqlite') {
            DB::statement('PRAGMA foreign_keys = OFF');
            if (Schema::hasColumn('detailings', 'owner_id')) {
                $this->sqliteDropIndexesReferencingColumn('detailings', 'owner_id');
                DB::statement('ALTER TABLE detailings DROP COLUMN owner_id');
            }
            if (Schema::hasColumn('detailings', 'is_personal')) {
                $this->sqliteDropIndexesReferencingColumn('detailings', 'is_personal');
                DB::statement('ALTER TABLE detailings DROP COLUMN is_personal');
            }
            DB::statement('PRAGMA foreign_keys = ON');

            return;
        }

        Schema::table('detailings', function (Blueprint $table) {
            if (Schema::hasColumn('detailings', 'owner_id')) {
                $table->dropForeign(['owner_id']);
            }
        });
        Schema::table('detailings', function (Blueprint $table) {
            if (Schema::hasColumn('detailings', 'owner_id')) {
                $table->dropColumn('owner_id');
            }
            if (Schema::hasColumn('detailings', 'is_personal')) {
                $table->dropColumn('is_personal');
            }
        });
    }
};
