<?php

namespace Database\Seeders;

use App\Models\Classroom;
use App\Models\Student;
use Illuminate\Database\Seeder;

class StudentSeeder extends Seeder
{
    public function run(): void
    {
        // 5 students per classroom, realistic Indonesian names
        $studentsByClass = [
            'Kelas 4A' => [
                ['nis' => '2024-4A-001', 'name' => 'Andi Prasetyo'],
                ['nis' => '2024-4A-002', 'name' => 'Budi Santoso'],
                ['nis' => '2024-4A-003', 'name' => 'Citra Dewi'],
                ['nis' => '2024-4A-004', 'name' => 'Dina Rahayu'],
                ['nis' => '2024-4A-005', 'name' => 'Eko Setiawan'],
            ],
            'Kelas 4B' => [
                ['nis' => '2024-4B-001', 'name' => 'Fajar Hidayat'],
                ['nis' => '2024-4B-002', 'name' => 'Gita Permata'],
                ['nis' => '2024-4B-003', 'name' => 'Hendra Wijaya'],
                ['nis' => '2024-4B-004', 'name' => 'Indri Lestari'],
                ['nis' => '2024-4B-005', 'name' => 'Joko Susilo'],
            ],
            'Kelas 5A' => [
                ['nis' => '2024-5A-001', 'name' => 'Kartika Sari'],
                ['nis' => '2024-5A-002', 'name' => 'Lukman Hakim'],
                ['nis' => '2024-5A-003', 'name' => 'Maya Anggraini'],
                ['nis' => '2024-5A-004', 'name' => 'Nanda Putra'],
                ['nis' => '2024-5A-005', 'name' => 'Oka Firmansyah'],
            ],
            'Kelas 5B' => [
                ['nis' => '2024-5B-001', 'name' => 'Putri Handayani'],
                ['nis' => '2024-5B-002', 'name' => 'Qori Ramadhan'],
                ['nis' => '2024-5B-003', 'name' => 'Rizky Amalia'],
                ['nis' => '2024-5B-004', 'name' => 'Sinta Wulandari'],
                ['nis' => '2024-5B-005', 'name' => 'Taufik Hidayatullah'],
            ],
            'Kelas 6A' => [
                ['nis' => '2024-6A-001', 'name' => 'Umar Bakri'],
                ['nis' => '2024-6A-002', 'name' => 'Vina Safitri'],
                ['nis' => '2024-6A-003', 'name' => 'Wahyu Nugroho'],
                ['nis' => '2024-6A-004', 'name' => 'Xena Puspitasari'],
                ['nis' => '2024-6A-005', 'name' => 'Yusuf Ardiansyah'],
            ],
            'Kelas 6B' => [
                ['nis' => '2024-6B-001', 'name' => 'Zahra Amalia'],
                ['nis' => '2024-6B-002', 'name' => 'Alfian Dwi Putra'],
                ['nis' => '2024-6B-003', 'name' => 'Berliana Kusuma'],
                ['nis' => '2024-6B-004', 'name' => 'Cahyo Ramadhan'],
                ['nis' => '2024-6B-005', 'name' => 'Destiana Putri'],
            ],
        ];

        foreach ($studentsByClass as $classroomName => $students) {
            $classroom = Classroom::where('name', $classroomName)->first();
            if (! $classroom) {
                continue;
            }

            foreach ($students as $studentData) {
                Student::firstOrCreate(
                    ['nis' => $studentData['nis']],
                    array_merge($studentData, [
                        'classroom_id' => $classroom->id,
                        'is_active'    => true,
                    ])
                );
            }
        }

        $this->command->info('Students seeded: 5 students × 6 classrooms = 30 students total.');
    }
}
