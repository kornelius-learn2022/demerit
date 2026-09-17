<?php

namespace App\Http\Controllers;

use App\Models\Punishment;
use App\Models\Student;
use App\Models\User;
use App\Services\StudentScoreService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class DashboardController extends Controller
{
    public function __construct(private StudentScoreService $scoreService) {}

    /**
     * Return role-appropriate dashboard summary statistics.
     *
     * admin:   total users, students, today's punishments, top violations this month
     * pc1:     class student count, total punishments in class, students below 100pts, recent 5
     * subject: my punishment count, this month's count, recent 5 mine
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = match (true) {
            $user->isAdmin()   => $this->adminDashboard(),
            $user->isPc1()     => $this->pc1Dashboard($user),
            $user->isSubject() => $this->subjectDashboard($user),
            default            => [],
        };

        return response()->json([
            'success' => true,
            'message' => 'Dashboard data retrieved successfully.',
            'data'    => $data,
        ], Response::HTTP_OK);
    }

    // -------------------------------------------------------------------------
    // Private dashboard builders
    // -------------------------------------------------------------------------

    private function adminDashboard(): array
    {
        $totalUsers    = User::count();
        $totalStudents = Student::count();
        $todayPunishments = Punishment::whereDate('punishment_date', today())->count();

        // Top 5 violations this month
        $topViolations = Punishment::select('violation_rule_id', DB::raw('COUNT(*) as count'))
            ->with('violationRule:id,description,category_id', 'violationRule.category:id,name')
            ->whereYear('punishment_date', now()->year)
            ->whereMonth('punishment_date', now()->month)
            ->groupBy('violation_rule_id')
            ->orderByDesc('count')
            ->limit(5)
            ->get()
            ->map(fn($p) => [
                'violation_rule_id'  => $p->violation_rule_id,
                'rule_description'   => $p->violationRule?->description,
                'category_name'      => $p->violationRule?->category?->name,
                'count'              => $p->count,
            ]);

        // Recent 5 punishments across all classes
        $recentPunishments = Punishment::with([
            'student:id,name,classroom_id',
            'student.classroom:id,name',
            'violationRule:id,description',
            'teacher:id,name',
        ])
            ->orderByDesc('punishment_date')
            ->orderByDesc('created_at')
            ->limit(5)
            ->get();

        return [
            'total_users'              => $totalUsers,
            'total_students'           => $totalStudents,
            'today_punishments'        => $todayPunishments,
            'top_violations'           => $topViolations,
            'recent_punishments'       => $recentPunishments,
        ];
    }

    private function pc1Dashboard(User $user): array
    {
        $classroomId = $user->classroom_id;

        $studentIds = Student::where('classroom_id', $classroomId)->pluck('id');

        $classStudentCount   = $studentIds->count();
        $totalClassPunishments = Punishment::whereIn('student_id', $studentIds)->count();

        // Students below or at 120 pts (attention threshold: >= 30 demerits)
        $studentsBelowThreshold = [];
        foreach ($studentIds as $sid) {
            $score = $this->scoreService->getScore($sid);
            if ($score <= 120) {
                $studentsBelowThreshold[] = ['student_id' => $sid, 'current_score' => $score];
            }
        }

        // Enrich with names and classroom
        if (! empty($studentsBelowThreshold)) {
            $idList   = array_column($studentsBelowThreshold, 'student_id');
            $students = Student::with('classroom:id,name')->whereIn('id', $idList)->get(['id', 'name', 'nis', 'classroom_id'])->keyBy('id');

            $studentsBelowThreshold = array_map(function ($item) use ($students) {
                $s = $students[$item['student_id']] ?? null;
                return array_merge($item, [
                    'id'        => $s?->id,
                    'name'      => $s?->name,
                    'nis'       => $s?->nis,
                    'classroom' => $s?->classroom,
                ]);
            }, $studentsBelowThreshold);
        }

        // Recent 5 punishments in class
        $recentPunishments = Punishment::whereIn('student_id', $studentIds)
            ->with([
                'student:id,name,nis,classroom_id',
                'student.classroom:id,name',
                'violationRule:id,description',
                'teacher:id,name,role',
            ])
            ->orderByDesc('punishment_date')
            ->orderByDesc('created_at')
            ->limit(5)
            ->get();

        return [
            'classroom_id'             => $classroomId,
            'class_student_count'      => $classStudentCount,
            'total_class_punishments'  => $totalClassPunishments,
            'students_below_120_pts'   => $studentsBelowThreshold,
            'students_below_100_pts'   => $studentsBelowThreshold, // alias for backwards compatibility
            'students_below_count'     => count($studentsBelowThreshold),
            'recent_punishments'       => $recentPunishments,
        ];
    }

    private function subjectDashboard(User $user): array
    {
        $myTotal = Punishment::where('teacher_id', $user->id)->count();

        $myThisMonth = Punishment::where('teacher_id', $user->id)
            ->whereYear('punishment_date', now()->year)
            ->whereMonth('punishment_date', now()->month)
            ->count();

        $recentPunishments = Punishment::where('teacher_id', $user->id)
            ->with([
                'student:id,name,nis,classroom_id',
                'student.classroom:id,name',
                'violationRule:id,description',
                'teacher:id,name,role',
            ])
            ->orderByDesc('punishment_date')
            ->orderByDesc('created_at')
            ->limit(5)
            ->get();

        return [
            'my_total_punishments'       => $myTotal,
            'my_punishments_this_month'  => $myThisMonth,
            'recent_punishments'         => $recentPunishments,
        ];
    }
}
