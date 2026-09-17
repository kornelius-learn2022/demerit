<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\ViolationRule;
use Illuminate\Database\Seeder;

class ViolationRuleSeeder extends Seeder
{
    public function run(): void
    {
        $rules = [
            // Kedisiplinan
            'Kedisiplinan' => [
                ['description' => 'Terlambat masuk kelas tanpa keterangan',          'point_deduction' => 5],
                ['description' => 'Tidak membawa perlengkapan belajar yang diperlukan', 'point_deduction' => 5],
                ['description' => 'Membolos / tidak masuk sekolah tanpa izin',        'point_deduction' => 20],
                ['description' => 'Keluar kelas tanpa izin guru',                     'point_deduction' => 10],
            ],
            // Sopan Santun
            'Sopan Santun' => [
                ['description' => 'Berbicara tidak sopan kepada guru',               'point_deduction' => 15],
                ['description' => 'Mengejek atau mem-bully teman',                   'point_deduction' => 25],
                ['description' => 'Tidak menghormati tamu atau tanda penghargaan',   'point_deduction' => 10],
                ['description' => 'Menggunakan ponsel saat pelajaran berlangsung',   'point_deduction' => 10],
            ],
            // Kebersihan
            'Kebersihan' => [
                ['description' => 'Membuang sampah sembarangan di lingkungan sekolah', 'point_deduction' => 5],
                ['description' => 'Tidak berpakaian rapi sesuai tata tertib sekolah',  'point_deduction' => 8],
                ['description' => 'Tidak membersihkan kelas saat jadwal piket',         'point_deduction' => 10],
            ],
            // Akademik
            'Akademik' => [
                ['description' => 'Tidak mengerjakan pekerjaan rumah (PR)',           'point_deduction' => 10],
                ['description' => 'Mencontek saat ulangan / ujian',                   'point_deduction' => 25],
                ['description' => 'Tidak mengumpulkan tugas tepat waktu (tanpa izin)', 'point_deduction' => 8],
                ['description' => 'Plagiarisme pada karya tulis',                     'point_deduction' => 20],
            ],
        ];

        foreach ($rules as $categoryName => $categoryRules) {
            $category = Category::where('name', $categoryName)->first();
            if (! $category) {
                continue;
            }

            foreach ($categoryRules as $rule) {
                ViolationRule::firstOrCreate(
                    [
                        'category_id' => $category->id,
                        'description' => $rule['description'],
                    ],
                    array_merge($rule, ['category_id' => $category->id, 'is_active' => true])
                );
            }
        }

        $this->command->info('Violation rules seeded: 4 categories × 3-4 rules each.');
    }
}
