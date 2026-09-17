<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use App\Models\Category;
use App\Models\ViolationRule;
use App\Models\User;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Create settings table if not exists
        if (!Schema::hasTable('settings')) {
            Schema::create('settings', function (Blueprint $table) {
                $table->id();
                $table->string('key')->unique();
                $table->text('value')->nullable();
                $table->timestamps();
            });

            DB::table('settings')->insert([
                'key'        => 'active_academic_year',
                'value'      => '2024/2025',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // 2. Ensure admin user exists for category creation
        $admin = User::where('role', 'admin')->first();
        $adminId = $admin ? $admin->id : 1;

        // 3. Ensure canonical Minor Offences and Major Offences categories exist
        $minorCategory = Category::firstOrCreate(
            ['name' => 'Minor Offences'],
            [
                'description' => 'Minor disciplinary offences punishable by 2 to 10 demerit points and counseling.',
                'created_by'  => $adminId,
            ]
        );

        $majorCategory = Category::firstOrCreate(
            ['name' => 'Major Offences'],
            [
                'description' => 'Severe disciplinary offences punishable by 30 demerit points and mandatory parent meeting.',
                'created_by'  => $adminId,
            ]
        );

        // 4. Migrate any existing violation rules to either Minor or Major based on point_deduction
        $otherCategories = Category::whereNotIn('id', [$minorCategory->id, $majorCategory->id])->get();
        foreach ($otherCategories as $oldCat) {
            $rules = ViolationRule::where('category_id', $oldCat->id)->get();
            foreach ($rules as $r) {
                if ($r->point_deduction >= 30) {
                    $r->update(['category_id' => $majorCategory->id]);
                } else {
                    $r->update(['category_id' => $minorCategory->id]);
                }
            }
            // Now safe to delete old category
            $oldCat->delete();
        }

        // 5. Seed the exact 15 Minor Offences
        $minorRules = [
            ['description' => 'Bringing toys (unless asked by teachers to support learning activities)', 'point_deduction' => 2],
            ['description' => 'Not wearing appropriate shoes and socks at school', 'point_deduction' => 2],
            ['description' => 'Go to senior school building without teacher\'s permission/supervision (proved by hall pass)', 'point_deduction' => 2],
            ['description' => 'Coming late to class (including: in the morning, after break time, or transition between lessons)', 'point_deduction' => 2],
            ['description' => 'Not waiting in the designated area after going home time', 'point_deduction' => 2],
            ['description' => 'Improper wearing of school uniform which includes: colored nails and hairs, wearing unnecessary body accessories, and indecent haircut (improper hair style)', 'point_deduction' => 2],
            ['description' => 'Not doing and submitting homework/project on time', 'point_deduction' => 2],
            ['description' => 'Not bringing school supplies (including PE/uniform clothes)*Even if the supplies are sent later by their parents/driver, the demerit will still be given', 'point_deduction' => 2],
            ['description' => 'Bringing or using gadget (tablet, laptop, cell phone and other electronic communication devices including smart watch) without teacher\'s discretion (Includes: accessing social media account and playing games at school at all times)', 'point_deduction' => 2],
            ['description' => 'Selling/purchasing any items including food, toys, stationeries, etc. at the school grounds/premises during school hours from individuals that are not official vendors of the school, unless under the permission/assignment of a teacher. (The official school vendors include canteen booths, the school bookshop, cafÃ©, and temporary booths with a permit from the school)', 'point_deduction' => 2],
            ['description' => 'Intentionally being annoying/troublesome in the class (after being reminded 3 times)', 'point_deduction' => 5],
            ['description' => 'Insubordination and disobedience', 'point_deduction' => 5],
            ['description' => 'Using offensive language', 'point_deduction' => 5],
            ['description' => 'Telling a lie', 'point_deduction' => 10],
            ['description' => 'Using other\'s gadget (tablet or laptop) without permission from the owner', 'point_deduction' => 10],
        ];

        foreach ($minorRules as $item) {
            ViolationRule::firstOrCreate(
                [
                    'category_id' => $minorCategory->id,
                    'description' => $item['description'],
                ],
                [
                    'category_id'     => $minorCategory->id,
                    'description'     => $item['description'],
                    'point_deduction' => $item['point_deduction'],
                    'is_active'       => true,
                ]
            );
        }

        // 6. Seed the exact 8 Major Offences
        $majorRules = [
            ['description' => 'Cheating (Also applied to the students who help or give the answer)', 'point_deduction' => 30],
            ['description' => 'Vandalism (breaking school property intentionally) In certain conditions, students have to pay for the broken property', 'point_deduction' => 30],
            ['description' => 'Unacceptable or disruptive action', 'point_deduction' => 30],
            ['description' => 'Stealing', 'point_deduction' => 30],
            ['description' => 'Viewing of or dealing with pornography and/or pornographic act', 'point_deduction' => 30],
            ['description' => 'Harmful actions toward others', 'point_deduction' => 30],
            ['description' => 'Bullying', 'point_deduction' => 30],
            ['description' => 'Fighting', 'point_deduction' => 30],
        ];

        foreach ($majorRules as $item) {
            ViolationRule::firstOrCreate(
                [
                    'category_id' => $majorCategory->id,
                    'description' => $item['description'],
                ],
                [
                    'category_id'     => $majorCategory->id,
                    'description'     => $item['description'],
                    'point_deduction' => $item['point_deduction'],
                    'is_active'       => true,
                ]
            );
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
