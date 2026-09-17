<?php

namespace App\Policies;

use App\Models\Student;
use App\Models\User;

class StudentPolicy
{
    /**
     * - admin: can see all students
     * - pc1: can see students in their classroom only
     * - subject: can see all students (needed to select who to punish)
     */
    public function viewAny(User $user): bool
    {
        return true; // scoped in controller
    }

    public function view(User $user, Student $student): bool
    {
        if ($user->isAdmin() || $user->isSubject()) {
            return true;
        }

        if ($user->isPc1()) {
            return $student->classroom_id === $user->classroom_id;
        }

        return false;
    }

    /**
     * Only admin can create/update/delete students.
     */
    public function create(User $user): bool
    {
        return $user->isAdmin();
    }

    public function update(User $user, Student $student): bool
    {
        return $user->isAdmin();
    }

    public function delete(User $user, Student $student): bool
    {
        return $user->isAdmin();
    }
}
