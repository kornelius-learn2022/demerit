<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Classroom extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'grade_level',
    ];

    /**
     * Users (teachers) assigned to this classroom (pc1 homeroom teachers).
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /**
     * Students enrolled in this classroom.
     */
    public function students(): HasMany
    {
        return $this->hasMany(Student::class);
    }

    /**
     * Subject teachers assigned to teach this classroom.
     */
    public function subjectTeachers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'classroom_user')->withTimestamps();
    }
}
