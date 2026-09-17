<?php

namespace App\Models;

use App\Services\StudentScoreService;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Student extends Model
{
    use HasFactory;

    protected $fillable = [
        'nis',
        'name',
        'classroom_id',
        'initial_points',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active'      => 'boolean',
            'initial_points' => 'integer',
        ];
    }

    /**
     * Append the computed current_score attribute to array/JSON output.
     */
    protected $appends = ['current_score'];

    // -------------------------------------------------------------------------
    // Boot — invalidate score cache whenever a punishment related to this
    // student is saved or deleted (Punishment model also calls this directly).
    // -------------------------------------------------------------------------

    protected static function boot(): void
    {
        parent::boot();

        // Invalidate cache when student is deleted
        static::deleting(function (Student $student) {
            app(StudentScoreService::class)->invalidateScore($student->id);
        });
    }

    // -------------------------------------------------------------------------
    // Accessor
    // -------------------------------------------------------------------------

    /**
     * current_score = 150 - SUM(point_deducted).
     * Checks Redis cache first, falls back to DB calculation.
     */
    public function getCurrentScoreAttribute(): int
    {
        return app(StudentScoreService::class)->getScore($this->id);
    }

    // -------------------------------------------------------------------------
    // Relations
    // -------------------------------------------------------------------------

    public function classroom(): BelongsTo
    {
        return $this->belongsTo(Classroom::class);
    }

    public function punishments(): HasMany
    {
        return $this->hasMany(Punishment::class);
    }

    public function latestPunishment(): HasOne
    {
        return $this->hasOne(Punishment::class)->latestOfMany('punishment_date');
    }
}
