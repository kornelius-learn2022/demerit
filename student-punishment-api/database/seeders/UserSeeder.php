<?php

namespace Database\Seeders;

use App\Models\Classroom;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // Lookup all 9 classrooms
        $c3A = Classroom::where('name', 'like', '%3A%')->first();
        $c3B = Classroom::where('name', 'like', '%3B%')->first();
        $c3C = Classroom::where('name', 'like', '%3C%')->first();
        $c3D = Classroom::where('name', 'like', '%3D%')->first();
        $c3E = Classroom::where('name', 'like', '%3E%')->first();
        $c4A = Classroom::where('name', 'like', '%4A%')->first();
        $c4B = Classroom::where('name', 'like', '%4B%')->first();
        $c4C = Classroom::where('name', 'like', '%4C%')->first();
        $c4D = Classroom::where('name', 'like', '%4D%')->first();

        // Release any old homeroom assignments on 4A and 4B
        User::whereIn('classroom_id', array_filter([$c4A?->id, $c4B?->id]))
            ->whereNotIn('username', ['sharon', 'lia'])
            ->update(['classroom_id' => null, 'role' => 'subject']);

        $defaultPassword = Hash::make('password');

        $users = [
            // Admin
            [
                'name'         => 'Administrator',
                'username'     => 'admin',
                'email'        => 'admin@school.com',
                'password'     => $defaultPassword,
                'role'         => 'admin',
                'classroom_id' => null,
            ],
            // 9 Homeroom Teachers (Guru Kelas)
            [
                'name'         => 'Ms Tina (Wali Kelas 3A)',
                'username'     => 'tina',
                'email'        => 'tina.3a@school.com',
                'password'     => $defaultPassword,
                'role'         => 'pc1',
                'classroom_id' => $c3A?->id,
            ],
            [
                'name'         => 'Ms Etha (Wali Kelas 3B)',
                'username'     => 'etha',
                'email'        => 'etha.3b@school.com',
                'password'     => $defaultPassword,
                'role'         => 'pc1',
                'classroom_id' => $c3B?->id,
            ],
            [
                'name'         => 'Ms Icha (Wali Kelas 3C)',
                'username'     => 'icha',
                'email'        => 'icha.3c@school.com',
                'password'     => $defaultPassword,
                'role'         => 'pc1',
                'classroom_id' => $c3C?->id,
            ],
            [
                'name'         => 'Ms Fefe (Wali Kelas 3D)',
                'username'     => 'fefe',
                'email'        => 'fefe.3d@school.com',
                'password'     => $defaultPassword,
                'role'         => 'pc1',
                'classroom_id' => $c3D?->id,
            ],
            [
                'name'         => 'Ms Nathali (Wali Kelas 3E)',
                'username'     => 'nathali',
                'email'        => 'nathali.3e@school.com',
                'password'     => $defaultPassword,
                'role'         => 'pc1',
                'classroom_id' => $c3E?->id,
            ],
            [
                'name'         => 'Ms Sharon (Wali Kelas 4A)',
                'username'     => 'sharon',
                'email'        => 'sharon.4a@school.com',
                'password'     => $defaultPassword,
                'role'         => 'pc1',
                'classroom_id' => $c4A?->id,
            ],
            [
                'name'         => 'Ms Lia (Wali Kelas 4B)',
                'username'     => 'lia',
                'email'        => 'lia.4b@school.com',
                'password'     => $defaultPassword,
                'role'         => 'pc1',
                'classroom_id' => $c4B?->id,
            ],
            [
                'name'         => 'Ms Fosa (Wali Kelas 4C)',
                'username'     => 'fosa',
                'email'        => 'fosa.4c@school.com',
                'password'     => $defaultPassword,
                'role'         => 'pc1',
                'classroom_id' => $c4C?->id,
            ],
            [
                'name'         => 'Mr Ferdi (Wali Kelas 4D)',
                'username'     => 'ferdi',
                'email'        => 'ferdi.4d@school.com',
                'password'     => $defaultPassword,
                'role'         => 'pc1',
                'classroom_id' => $c4D?->id,
            ],
        ];

        foreach ($users as $userData) {
            User::updateOrCreate(
                ['username' => $userData['username']],
                $userData
            );
        }

        $this->command->info('Users seeded: 1 Admin and 9 Homeroom Teachers (3A-3E, 4A-4D).');
    }
}
