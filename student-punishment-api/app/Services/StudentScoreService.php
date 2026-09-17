<?php

namespace App\Services;

use App\Models\Punishment;
use App\Models\Student;
use Illuminate\Support\Facades\Cache;

class StudentScoreService
{
    private const BASE_SCORE    = 150;
    private const CACHE_TTL_SEC = 3600; // 1 hour
    private const CACHE_PREFIX  = 'student:score:';

    /**
     * Get the current score for a student.
     * Tries Redis cache first; falls back to DB aggregation.
     *
     * @param int $studentId
     * @return int
     */
    public function getScore(int $studentId): int
    {
        $cacheKey = self::CACHE_PREFIX . $studentId;

        return (int) Cache::remember($cacheKey, self::CACHE_TTL_SEC, function () use ($studentId) {
            $student = Student::select('id', 'initial_points')->find($studentId);
            $initialPoints = $student?->initial_points ?? self::BASE_SCORE;

            $totalDeducted = Punishment::where('student_id', $studentId)
                ->sum('point_deducted');

            return max(0, (int) $initialPoints - (int) $totalDeducted);
        });
    }

    /**
     * Invalidate the cached score for a student.
     * Called on Punishment create/update/delete.
     *
     * @param int $studentId
     * @return void
     */
    public function invalidateScore(int $studentId): void
    {
        Cache::forget(self::CACHE_PREFIX . $studentId);
    }

    /**
     * Get scores for all students in a given classroom.
     * Returns an array keyed by student_id => score.
     *
     * @param int $classroomId
     * @return array<int, int>
     */
    public function getClassScores(int $classroomId): array
    {
        $students = Student::where('classroom_id', $classroomId)
            ->where('is_active', true)
            ->get(['id', 'name', 'nis']);

        $scores = [];
        foreach ($students as $student) {
            $scores[$student->id] = [
                'student_id'    => $student->id,
                'name'          => $student->name,
                'nis'           => $student->nis,
                'current_score' => $this->getScore($student->id),
            ];
        }

        return array_values($scores);
    }

    /**
     * Bulk-invalidate scores for all students in a classroom.
     * Useful when a batch operation affects an entire class.
     *
     * @param int $classroomId
     * @return void
     */
    public function invalidateClassScores(int $classroomId): void
    {
        $studentIds = Student::where('classroom_id', $classroomId)->pluck('id');

        foreach ($studentIds as $id) {
            $this->invalidateScore($id);
        }
    }
}
