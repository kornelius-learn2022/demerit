<?php

namespace Database\Seeders;

use App\Models\Classroom;
use Illuminate\Database\Seeder;

class ClassroomSeeder extends Seeder
{
    public function run(): void
    {
        $classrooms = [
            ['name' => 'Kelas 4A', 'grade_level' => '4'],
            ['name' => 'Kelas 4B', 'grade_level' => '4'],
            ['name' => 'Kelas 5A', 'grade_level' => '5'],
            ['name' => 'Kelas 5B', 'grade_level' => '5'],
            ['name' => 'Kelas 6A', 'grade_level' => '6'],
            ['name' => 'Kelas 6B', 'grade_level' => '6'],
        ];

        foreach ($classrooms as $classroom) {
            Classroom::firstOrCreate(['name' => $classroom['name']], $classroom);
        }

        $this->command->info('Classrooms seeded: ' . implode(', ', array_column($classrooms, 'name')));
    }
}
