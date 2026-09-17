<?php

namespace App\Policies;

use App\Models\Punishment;
use App\Models\User;

class PunishmentPolicy
{
    /**
     * Determine whether the user can list punishments.
     * All roles can call index(); the controller handles scoping.
     */
    public function viewAny(User $user): bool
    {
        return true; // scoped per role in controller
    }

    /**
     * Determine whether the user can view a specific punishment.
     * - admin: always allowed
     * - pc1: allowed if the punishment's student is in their classroom
     * - subject: allowed only if they recorded the punishment themselves
     */
    public function view(User $user, Punishment $punishment): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        if ($user->isPc1()) {
            return $punishment->student->classroom_id === $user->classroom_id;
        }

        if ($user->isSubject()) {
            return $punishment->teacher_id === $user->id;
        }

        return false;
    }

    /**
     * Determine whether the user can create punishments.
     * Only pc1 and subject teachers record punishments.
     */
    public function create(User $user): bool
    {
        return $user->isPc1() || $user->isSubject();
    }

    /**
     * Determine whether the user can update a punishment.
     * - admin: always allowed
     * - pc1: must be the teacher AND student must be in their classroom
     * - subject: must be the teacher who recorded it
     */
    public function update(User $user, Punishment $punishment): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        if ($user->isPc1()) {
            return $punishment->teacher_id === $user->id
                && $punishment->student->classroom_id === $user->classroom_id;
        }

        if ($user->isSubject()) {
            return $punishment->teacher_id === $user->id;
        }

        return false;
    }

    /**
     * Determine whether the user can delete a punishment.
     * - admin: always allowed
     * - pc1 (guru kelas): allowed for any student in their assigned classroom
     * - subject: allowed only for punishments they recorded
     */
    public function delete(User $user, Punishment $punishment): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        if ($user->isPc1()) {
            return $punishment->student->classroom_id === $user->classroom_id;
        }

        if ($user->isSubject()) {
            return $punishment->teacher_id === $user->id;
        }

        return false;
    }
}
