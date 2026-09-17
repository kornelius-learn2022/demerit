<?php

namespace App\Models;

use App\Services\StudentScoreService;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Punishment extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id',
        'violation_rule_id',
        'teacher_id',
        'teacher_role',
        'notes',
        'punishment_date',
        'point_deducted',
    ];

    protected function casts(): array
    {
        return [
            'punishment_date' => 'date',
            'point_deducted'  => 'integer',
        ];
    }

    // -------------------------------------------------------------------------
    // Boot — auto-set teacher_role & point_deducted snapshot, invalidate cache
    // -------------------------------------------------------------------------

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (Punishment $punishment) {
            // Auto-set teacher_role from the recording teacher's role
            if (empty($punishment->teacher_role) && $punishment->teacher_id) {
                $teacher = User::find($punishment->teacher_id);
                if ($teacher) {
                    $punishment->teacher_role = $teacher->role; // 'pc1' or 'subject'
                }
            }

            // Snapshot point_deduction from the violation rule
            if (empty($punishment->point_deducted) && $punishment->violation_rule_id) {
                $rule = ViolationRule::find($punishment->violation_rule_id);
                if ($rule) {
                    $punishment->point_deducted = $rule->point_deduction;
                }
            }
        });

        static::created(function (Punishment $punishment) {
            app(StudentScoreService::class)->invalidateScore($punishment->student_id);
        });

        static::updated(function (Punishment $punishment) {
            app(StudentScoreService::class)->invalidateScore($punishment->student_id);
        });

        static::deleted(function (Punishment $punishment) {
            app(StudentScoreService::class)->invalidateScore($punishment->student_id);
        });
    }

    // -------------------------------------------------------------------------
    // Relations
    // -------------------------------------------------------------------------

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function violationRule(): BelongsTo
    {
        return $this->belongsTo(ViolationRule::class);
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }
}
