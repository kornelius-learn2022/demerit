<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\User;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('role', 'admin')->first();

        $categories = [
            [
                'name'        => 'Kedisiplinan',
                'description' => 'Pelanggaran terkait ketidakdisiplinan siswa seperti terlambat, tidak mengerjakan tugas, dan tidak mengikuti aturan sekolah.',
            ],
            [
                'name'        => 'Sopan Santun',
                'description' => 'Pelanggaran terkait perilaku tidak sopan terhadap guru, teman, dan lingkungan sekolah.',
            ],
            [
                'name'        => 'Kebersihan',
                'description' => 'Pelanggaran terkait kebersihan diri, pakaian, dan lingkungan sekolah.',
            ],
            [
                'name'        => 'Akademik',
                'description' => 'Pelanggaran terkait kegiatan akademik seperti tidak mengerjakan PR, mencontek, dan plagiarisme.',
            ],
        ];

        foreach ($categories as $cat) {
            Category::firstOrCreate(
                ['name' => $cat['name']],
                array_merge($cat, ['created_by' => $admin->id])
            );
        }

        $this->command->info('Categories seeded: Kedisiplinan, Sopan Santun, Kebersihan, Akademik.');
    }
}
