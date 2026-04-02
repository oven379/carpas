<?php

namespace Database\Seeders;

// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use App\Models\Detailing;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     *
     * @return void
     */
    public function run()
    {
        Detailing::query()->firstOrCreate(
            ['email' => 'test@test'],
            [
                'name' => 'Демо-детейлинг',
                'password' => Hash::make('1111'),
            ]
        );
    }
}
