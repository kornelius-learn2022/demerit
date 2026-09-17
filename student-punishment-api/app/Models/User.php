<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'username',
        'email',
        'password',
        'role',
        'classroom_id',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password'          => 'hashed',
        ];
    }

    // -------------------------------------------------------------------------
    // Role helper methods
    // -------------------------------------------------------------------------

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isPc1(): bool
    {
        return $this->role === 'pc1';
    }

    public function isSubject(): bool
    {
        return $this->role === 'subject';
    }

    // -------------------------------------------------------------------------
    // Relations
    // -------------------------------------------------------------------------

    /**
     * The classroom this user is assigned to (only relevant for pc1 / homeroom teachers).
     */
    public function classroom(): BelongsTo
    {
        return $this->belongsTo(Classroom::class);
    }

    /**
     * Punishments recorded by this teacher.
     */
    public function punishments(): HasMany
    {
        return $this->hasMany(Punishment::class, 'teacher_id');
    }

    /**
     * Categories created by this user.
     */
    public function categories(): HasMany
    {
        return $this->hasMany(Category::class, 'created_by');
    }

    /**
     * Classrooms taught by this subject teacher.
     */
    public function taughtClassrooms(): BelongsToMany
    {
        return $this->belongsToMany(Classroom::class, 'classroom_user')->withTimestamps();
    }

    /**
     * Notifications for this user.
     */
    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class)->latest();
    }
}
