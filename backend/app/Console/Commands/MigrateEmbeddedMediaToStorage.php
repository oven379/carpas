<?php

namespace App\Console\Commands;

use App\Http\Support\MediaStorage;
use App\Models\Car;
use App\Models\CarDoc;
use App\Models\Detailing;
use App\Models\Owner;
use Illuminate\Console\Command;

class MigrateEmbeddedMediaToStorage extends Command
{
    protected $signature = 'media:migrate-embedded
                            {--dry-run : Показать план без записи в БД и без сохранения файлов}
                            {--chunk=100 : Размер чанка при обходе таблиц}';

    protected $description = 'Выносит data:…;base64 из полей БД в storage/app/public/media и подставляет ключи media/…';

    public function handle(): int
    {
        $dry = (bool) $this->option('dry-run');
        $chunk = max(1, (int) $this->option('chunk'));

        if ($dry) {
            $this->warn('Режим dry-run: файлы и БД не меняются.');
        }

        $nOwners = $this->migrateOwners($dry, $chunk);
        $nDet = $this->migrateDetailings($dry, $chunk);
        $nCars = $this->migrateCars($dry, $chunk);
        $nDocs = $this->migrateCarDocs($dry, $chunk);

        $this->info(sprintf(
            'Готово. owners: %d полей, detailings: %d, cars: %d записей (hero/wash), docs: %d.',
            $nOwners,
            $nDet,
            $nCars,
            $nDocs,
        ));

        if (! $dry) {
            $this->comment('Убедитесь, что выполнен `php artisan storage:link` и APP_URL указывает на публичный URL API.');
        }

        return self::SUCCESS;
    }

    private function migrateOwners(bool $dry, int $chunk): int
    {
        $count = 0;
        Owner::query()->orderBy('id')->chunk($chunk, function ($owners) use ($dry, &$count) {
            foreach ($owners as $o) {
                $dirty = false;
                foreach (['garage_banner' => 'banner', 'garage_avatar' => 'avatar'] as $col => $base) {
                    $v = $o->{$col};
                    if (! is_string($v) || ! MediaStorage::isDataUri($v)) {
                        continue;
                    }
                    $dec = MediaStorage::decodeDataUri($v);
                    if ($dec === null) {
                        $this->warn("owner {$o->id} {$col}: не удалось декодировать data URI, пропуск.");

                        continue;
                    }
                    if (! $dry) {
                        $path = MediaStorage::storeBinaryAt(
                            'owners/'.$o->id.'/'.$base.'.'.$dec['ext'],
                            $dec['binary'],
                        );
                        $o->{$col} = $path;
                        $dirty = true;
                    }
                    $count++;
                    $this->line("owner #{$o->id} {$col}");
                }
                if ($dirty) {
                    $o->save();
                }
            }
        });

        return $count;
    }

    private function migrateDetailings(bool $dry, int $chunk): int
    {
        $count = 0;
        Detailing::query()->orderBy('id')->chunk($chunk, function ($rows) use ($dry, &$count) {
            foreach ($rows as $d) {
                $dirty = false;
                foreach (['logo' => 'logo', 'cover' => 'cover'] as $col => $base) {
                    $v = $d->{$col};
                    if (! is_string($v) || ! MediaStorage::isDataUri($v)) {
                        continue;
                    }
                    $dec = MediaStorage::decodeDataUri($v);
                    if ($dec === null) {
                        $this->warn("detailing {$d->id} {$col}: пропуск.");

                        continue;
                    }
                    if (! $dry) {
                        $path = MediaStorage::storeBinaryAt(
                            'detailings/'.$d->id.'/'.$base.'.'.$dec['ext'],
                            $dec['binary'],
                        );
                        $d->{$col} = $path;
                        $dirty = true;
                    }
                    $count++;
                    $this->line("detailing #{$d->id} {$col}");
                }
                if ($dirty) {
                    $d->save();
                }
            }
        });

        return $count;
    }

    private function migrateCars(bool $dry, int $chunk): int
    {
        $count = 0;
        Car::query()->orderBy('id')->chunk($chunk, function ($cars) use ($dry, &$count) {
            foreach ($cars as $car) {
                $dirty = false;
                $hero = $car->hero;
                if (is_string($hero) && MediaStorage::isDataUri($hero)) {
                    $dec = MediaStorage::decodeDataUri($hero);
                    if ($dec !== null) {
                        if (! $dry) {
                            $car->hero = MediaStorage::storeBinaryAt(
                                'cars/'.$car->id.'/hero.'.$dec['ext'],
                                $dec['binary'],
                            );
                            $dirty = true;
                        }
                        $count++;
                        $this->line("car #{$car->id} hero");
                    } else {
                        $this->warn("car {$car->id} hero: не декодируется, пропуск.");
                    }
                }

                $wash = $car->wash_photos;
                if (is_array($wash) && $wash !== []) {
                    $newWash = [];
                    $washDirty = false;
                    foreach (array_values($wash) as $i => $item) {
                        if (! is_string($item) || ! MediaStorage::isDataUri($item)) {
                            $newWash[] = $item;

                            continue;
                        }
                        $dec = MediaStorage::decodeDataUri($item);
                        if ($dec === null) {
                            $newWash[] = $item;
                            $this->warn("car {$car->id} wash[{$i}]: пропуск.");

                            continue;
                        }
                        if (! $dry) {
                            $newWash[] = MediaStorage::storeBinaryAt(
                                'cars/'.$car->id.'/wash/w'.$i.'_migrated.'.$dec['ext'],
                                $dec['binary'],
                            );
                            $washDirty = true;
                        } else {
                            $newWash[] = $item;
                        }
                        $count++;
                        $this->line("car #{$car->id} wash[{$i}]");
                    }
                    if ($washDirty && ! $dry) {
                        $car->wash_photos = $newWash;
                        $dirty = true;
                    }
                }

                if ($dirty) {
                    $car->save();
                }
            }
        });

        return $count;
    }

    private function migrateCarDocs(bool $dry, int $chunk): int
    {
        $count = 0;
        CarDoc::query()->orderBy('id')->chunk($chunk, function ($docs) use ($dry, &$count) {
            foreach ($docs as $doc) {
                $v = $doc->url;
                if (! is_string($v) || ! MediaStorage::isDataUri($v)) {
                    continue;
                }
                $dec = MediaStorage::decodeDataUri($v);
                if ($dec === null) {
                    $this->warn("car_doc {$doc->id}: не декодируется, пропуск.");

                    continue;
                }
                if (! $dry) {
                    $doc->url = MediaStorage::storeBinaryAt(
                        'docs/car_'.$doc->car_id.'/doc_'.$doc->id.'_migrated.'.$dec['ext'],
                        $dec['binary'],
                    );
                    $doc->save();
                }
                $count++;
                $this->line("car_doc #{$doc->id} (car {$doc->car_id})");
            }
        });

        return $count;
    }
}
