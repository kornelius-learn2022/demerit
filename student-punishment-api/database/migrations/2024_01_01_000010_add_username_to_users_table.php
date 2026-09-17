<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('users', 'username')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('username')->nullable()->unique()->after('name');
            });
        }

        // Assign default clean usernames for existing users
        foreach (User::all() as $user) {
            if (empty($user->username)) {
                $prefix = strtolower(explode('@', $user->email)[0]);
                $clean = preg_replace('/[^a-zA-Z0-9_\.]/', '', $prefix);
                if (empty($clean)) {
                    $clean = 'user' . $user->id;
                }
                // Ensure unique
                $candidate = $clean;
                $i = 1;
                while (User::where('username', $candidate)->where('id', '!=', $user->id)->exists()) {
                    $candidate = $clean . $i;
                    $i++;
                }
                $user->username = $candidate;
                $user->save();
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('users', 'username')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('username');
            });
        }
    }
};
