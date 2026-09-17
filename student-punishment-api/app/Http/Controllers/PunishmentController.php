<?php

namespace App\Http\Controllers;

use App\Models\Classroom;
use App\Models\Notification;
use App\Models\Punishment;
use App\Models\Student;
use App\Models\User;
use App\Models\ViolationRule;
use App\Services\CsvService;
use App\Services\StudentScoreService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Symfony\Component\HttpFoundation\Response;

class PunishmentController extends Controller
{
    public function __construct(
        private StudentScoreService $scoreService,
        private CsvService $csvService
    ) {}

    /**
     * List punishments with role-based scoping and filters.
     *
     * admin:   all punishments; filters: student_id, teacher_id, classroom_id, date_from, date_to, teacher_role
     * pc1:     only punishments for students in their classroom (all teacher_role records)
     * subject: ONLY punishments where teacher_id = auth()->id()
     */
    public function index(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', Punishment::class);

        $user  = $request->user();
        $query = Punishment::with([
            'student:id,name,nis,classroom_id',
            'student.classroom:id,name,grade_level',
            'violationRule:id,description,point_deduction,category_id',
            'violationRule.category:id,name',
            'teacher:id,name,role',
        ]);

        // Role-based scoping
        if ($user->isPc1()) {
            // pc1: only students in their classroom
            $studentIds = Student::where('classroom_id', $user->classroom_id)->pluck('id');
            $query->whereIn('student_id', $studentIds);
        } elseif ($user->isSubject()) {
            // subject: only own records
            $query->where('teacher_id', $user->id);
        } else {
            // admin: optional filters
            $query
                ->when($request->filled('teacher_id'), fn($q) => $q->where('teacher_id', $request->teacher_id))
                ->when($request->filled('classroom_id'), function ($q) use ($request) {
                    $studentIds = Student::where('classroom_id', $request->classroom_id)->pluck('id');
                    $q->whereIn('student_id', $studentIds);
                })
                ->when($request->filled('teacher_role'), fn($q) => $q->where('teacher_role', $request->teacher_role));
        }

        // Shared filters available to all roles
        $query
            ->when($request->filled('student_id'), fn($q) => $q->where('student_id', $request->student_id))
            ->when($request->filled('date_from'), fn($q) => $q->whereDate('punishment_date', '>=', $request->date_from))
            ->when($request->filled('date_to'), fn($q) => $q->whereDate('punishment_date', '<=', $request->date_to));

        $punishments = $query->orderByDesc('punishment_date')
            ->orderByDesc('created_at')
            ->get();

        $punishments->transform(function ($punishment) {
            if ($punishment->student) {
                $punishment->student->append('current_score');
            }
            return $punishment;
        });

        return response()->json([
            'success' => true,
            'message' => 'Punishments retrieved successfully.',
            'data'    => $punishments,
        ], Response::HTTP_OK);
    }

    /**
     * Record a new punishment.
     *
     * - pc1: student must be in their classroom
     * - subject: no classroom restriction
     * - auto-sets teacher_id, teacher_role, point_deducted (via model boot)
     * - invalidates student score Redis cache (via model boot)
     */
    public function store(Request $request): JsonResponse
    {
        Gate::authorize('create', Punishment::class);

        $user = $request->user();

        $validated = $request->validate([
            'student_id'        => 'required|exists:students,id',
            'violation_rule_id' => 'required|exists:violation_rules,id',
            'notes'             => 'nullable|string|max:1000',
            'punishment_date'   => 'required|date|before_or_equal:today',
        ]);

        // Get the student and violation rule
        $student = Student::findOrFail($validated['student_id']);
        $rule    = ViolationRule::findOrFail($validated['violation_rule_id']);

        // Classroom restrictions
        if ($user->isPc1()) {
            if ($student->classroom_id !== $user->classroom_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'You can only record punishments for students in your assigned classroom.',
                    'data'    => null,
                ], Response::HTTP_FORBIDDEN);
            }
        } elseif ($user->isSubject()) {
            $taughtIds = $user->taughtClassrooms()->pluck('classrooms.id');
            if ($taughtIds->isNotEmpty() && ! $taughtIds->contains($student->classroom_id)) {
                return response()->json([
                    'success' => false,
                    'message' => 'You can only record punishments for students in classrooms you are assigned to teach.',
                    'data'    => null,
                ], Response::HTTP_FORBIDDEN);
            }
        }

        // Check the violation rule is active
        if (! $rule->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'The selected violation rule is not active.',
                'data'    => null,
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        // Set teacher context (boot will also set teacher_role and point_deducted)
        $validated['teacher_id']    = $user->id;
        $validated['teacher_role']  = $user->role; // 'pc1' or 'subject'
        $validated['point_deducted'] = $rule->point_deduction;

        $punishment = Punishment::create($validated);

        // Reload with full relations for response
        $punishment->load([
            'student:id,name,nis,classroom_id',
            'student.classroom:id,name,grade_level',
            'violationRule:id,description,point_deduction,category_id',
            'violationRule.category:id,name',
            'teacher:id,name,role',
        ]);

        // Cross-teacher notifications on new demerit
        $classroom = $student->classroom;
        $className = $classroom?->name ?? 'Kelas';

        // 1. If recorded by Subject Teacher (or Admin): Notify Homeroom Teacher (pc1)
        if ($user->isSubject() || $user->isAdmin()) {
            $homeroomTeacher = User::where('role', 'pc1')
                ->where('classroom_id', $student->classroom_id)
                ->first();

            if ($homeroomTeacher && $homeroomTeacher->id !== $user->id) {
                $roleLabel = $user->isSubject() ? 'Guru Mapel' : 'Administrator';
                Notification::create([
                    'user_id' => $homeroomTeacher->id,
                    'type'    => 'demerit_created',
                    'title'   => "Demerit Baru Dicatat ({$className})",
                    'message' => "{$roleLabel} {$user->name} mencatat pelanggaran \"{$rule->description}\" (-{$rule->point_deduction} poin) untuk siswa {$student->name}.",
                    'data'    => [
                        'action'          => 'created',
                        'punishment_id'   => $punishment->id,
                        'actor_id'        => $user->id,
                        'actor_name'      => $user->name,
                        'actor_role'      => $user->role,
                        'student_id'      => $student->id,
                        'student_name'    => $student->name,
                        'classroom_name'  => $className,
                        'point_deducted'  => $rule->point_deduction,
                        'rule_description' => $rule->description,
                    ],
                ]);
            }
        }
        // 2. If recorded by Homeroom Teacher (pc1): Notify Subject Teachers
        elseif ($user->isPc1()) {
            $subjectTeachers = User::where('role', 'subject')->get();

            foreach ($subjectTeachers as $subj) {
                if ($subj->id === $user->id) continue;

                Notification::create([
                    'user_id' => $subj->id,
                    'type'    => 'demerit_created',
                    'title'   => "Demerit Dicatat oleh Guru Kelas ({$className})",
                    'message' => "Guru Kelas {$user->name} mencatat pelanggaran \"{$rule->description}\" (-{$rule->point_deduction} poin) untuk {$student->name}.",
                    'data'    => [
                        'action'          => 'created',
                        'punishment_id'   => $punishment->id,
                        'actor_id'        => $user->id,
                        'actor_name'      => $user->name,
                        'actor_role'      => $user->role,
                        'student_id'      => $student->id,
                        'student_name'    => $student->name,
                        'classroom_name'  => $className,
                        'point_deducted'  => $rule->point_deduction,
                        'rule_description' => $rule->description,
                    ],
                ]);
            }
        }

        // Include updated score in response
        $currentScore = $this->scoreService->getScore($student->id);

        return response()->json([
            'success' => true,
            'message' => 'Punishment recorded successfully.',
            'data'    => [
                'punishment'    => $punishment,
                'current_score' => $currentScore,
            ],
        ], Response::HTTP_CREATED);
    }

    /**
     * Show a single punishment (policy-guarded).
     */
    public function show(int $id): JsonResponse
    {
        $punishment = Punishment::with([
            'student:id,name,nis,classroom_id',
            'student.classroom:id,name,grade_level',
            'violationRule:id,description,point_deduction,category_id',
            'violationRule.category:id,name',
            'teacher:id,name,role',
        ])->findOrFail($id);

        Gate::authorize('view', $punishment);

        return response()->json([
            'success' => true,
            'message' => 'Punishment retrieved successfully.',
            'data'    => $punishment,
        ], Response::HTTP_OK);
    }

    /**
     * Delete a punishment (policy-guarded).
     * Homeroom teachers can delete records of their classroom students.
     * Cross-notifications sent to counterparts upon deletion.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $punishment = Punishment::with([
            'student:id,name,nis,classroom_id',
            'student.classroom:id,name,grade_level',
            'violationRule:id,description,point_deduction,category_id',
            'teacher:id,name,role',
        ])->findOrFail($id);

        Gate::authorize('delete', $punishment);

        $student = $punishment->student;
        $classroom = $student?->classroom;
        $rule = $punishment->violationRule;
        $recordingTeacher = $punishment->teacher;
        $actor = $request->user();
        $studentId = $punishment->student_id;
        $pointDeducted = $punishment->point_deducted;
        $ruleDesc = $rule?->description ?? 'Pelanggaran';
        $studentName = $student?->name ?? 'Siswa';
        $className = $classroom?->name ?? 'Kelas';

        // Find Homeroom Teacher (pc1) of the student's classroom
        $homeroomTeacher = null;
        if ($student && $student->classroom_id) {
            $homeroomTeacher = User::where('role', 'pc1')
                ->where('classroom_id', $student->classroom_id)
                ->first();
        }

        // --- Cross Notification Triggers on Deletion ---
        // 1. If deleted by Homeroom Teacher (pc1): notify subject teachers
        if ($actor->isPc1()) {
            $subjectTeachers = User::where('role', 'subject')->get();

            if ($recordingTeacher && $recordingTeacher->role === 'subject' && ! $subjectTeachers->contains('id', $recordingTeacher->id)) {
                $subjectTeachers->push($recordingTeacher);
            }

            foreach ($subjectTeachers as $subj) {
                if ($subj->id === $actor->id) continue;

                $isRecording = ($recordingTeacher && $recordingTeacher->id === $subj->id);
                $msg = $isRecording
                    ? "Demerit \"{$ruleDesc}\" (-{$pointDeducted} poin) untuk siswa {$studentName} ({$className}) yang Anda catat telah dihapus oleh {$actor->name} (Guru Kelas)."
                    : "Demerit \"{$ruleDesc}\" (-{$pointDeducted} poin) untuk siswa {$studentName} ({$className}) telah dihapus oleh Guru Kelas {$actor->name}.";

                Notification::create([
                    'user_id' => $subj->id,
                    'type'    => 'demerit_deleted',
                    'title'   => 'Demerit Dihapus oleh Guru Kelas',
                    'message' => $msg,
                    'data'    => [
                        'action'          => 'deleted',
                        'actor_id'        => $actor->id,
                        'actor_name'      => $actor->name,
                        'actor_role'      => $actor->role,
                        'student_id'      => $studentId,
                        'student_name'    => $studentName,
                        'classroom_name'  => $className,
                        'point_deducted'  => $pointDeducted,
                        'rule_description' => $ruleDesc,
                    ],
                ]);
            }
        }
        // 2. If deleted by Subject Teacher: notify the student's Homeroom Teacher (pc1)
        elseif ($actor->isSubject()) {
            if ($homeroomTeacher && $homeroomTeacher->id !== $actor->id) {
                Notification::create([
                    'user_id' => $homeroomTeacher->id,
                    'type'    => 'demerit_deleted',
                    'title'   => 'Demerit Dihapus oleh Guru Mapel',
                    'message' => "Demerit \"{$ruleDesc}\" (-{$pointDeducted} poin) untuk siswa kelas Anda ({$studentName}) telah dihapus oleh {$actor->name} (Guru Mapel).",
                    'data'    => [
                        'action'          => 'deleted',
                        'actor_id'        => $actor->id,
                        'actor_name'      => $actor->name,
                        'actor_role'      => $actor->role,
                        'student_id'      => $studentId,
                        'student_name'    => $studentName,
                        'classroom_name'  => $className,
                        'point_deducted'  => $pointDeducted,
                        'rule_description' => $ruleDesc,
                    ],
                ]);
            }
        }
        // 3. If deleted by Admin: notify recording teacher (if not admin) and homeroom teacher
        elseif ($actor->isAdmin()) {
            if ($recordingTeacher && $recordingTeacher->id !== $actor->id && $recordingTeacher->role !== 'admin') {
                Notification::create([
                    'user_id' => $recordingTeacher->id,
                    'type'    => 'demerit_deleted',
                    'title'   => 'Demerit Dihapus oleh Admin',
                    'message' => "Demerit \"{$ruleDesc}\" (-{$pointDeducted} poin) untuk {$studentName} yang Anda catat telah dihapus oleh Administrator.",
                    'data'    => [
                        'action'          => 'deleted',
                        'actor_id'        => $actor->id,
                        'actor_name'      => $actor->name,
                        'student_id'      => $studentId,
                        'student_name'    => $studentName,
                        'point_deducted'  => $pointDeducted,
                        'rule_description' => $ruleDesc,
                    ],
                ]);
            }
            if ($homeroomTeacher && $homeroomTeacher->id !== $actor->id) {
                Notification::create([
                    'user_id' => $homeroomTeacher->id,
                    'type'    => 'demerit_deleted',
                    'title'   => 'Demerit Dihapus oleh Admin',
                    'message' => "Demerit \"{$ruleDesc}\" (-{$pointDeducted} poin) untuk siswa kelas Anda ({$studentName}) telah dihapus oleh Administrator.",
                    'data'    => [
                        'action'          => 'deleted',
                        'actor_id'        => $actor->id,
                        'actor_name'      => $actor->name,
                        'student_id'      => $studentId,
                        'student_name'    => $studentName,
                        'point_deducted'  => $pointDeducted,
                        'rule_description' => $ruleDesc,
                    ],
                ]);
            }
        }

        $punishment->delete();

        // Score cache is also invalidated by Punishment::boot (deleted event)
        $currentScore = $this->scoreService->getScore($studentId);

        return response()->json([
            'success' => true,
            'message' => 'Punishment deleted successfully.',
            'data'    => [
                'current_score' => $currentScore,
            ],
        ], Response::HTTP_OK);
    }

    /**
     * Export punishments (demerits) to CSV with role scoping.
     */
    public function export(Request $request)
    {
        Gate::authorize('viewAny', Punishment::class);

        $user  = $request->user();
        $query = Punishment::with([
            'student:id,name,nis,classroom_id',
            'student.classroom:id,name,grade_level',
            'violationRule:id,description,point_deduction,category_id',
            'violationRule.category:id,name',
            'teacher:id,name,role',
        ]);

        // Role-based scoping
        if ($user->isPc1()) {
            $studentIds = Student::where('classroom_id', $user->classroom_id)->pluck('id');
            $query->whereIn('student_id', $studentIds);
        } elseif ($user->isSubject()) {
            $query->where('teacher_id', $user->id);
        } else {
            $query
                ->when($request->filled('teacher_id'), fn($q) => $q->where('teacher_id', $request->teacher_id))
                ->when($request->filled('classroom_id'), function ($q) use ($request) {
                    $studentIds = Student::where('classroom_id', $request->classroom_id)->pluck('id');
                    $q->whereIn('student_id', $studentIds);
                })
                ->when($request->filled('teacher_role'), fn($q) => $q->where('teacher_role', $request->teacher_role));
        }

        $query
            ->when($request->filled('student_id'), fn($q) => $q->where('student_id', $request->student_id))
            ->when($request->filled('date_from'), fn($q) => $q->whereDate('punishment_date', '>=', $request->date_from))
            ->when($request->filled('date_to'), fn($q) => $q->whereDate('punishment_date', '<=', $request->date_to));

        $punishments = $query->orderByDesc('punishment_date')
            ->orderByDesc('created_at')
            ->get();

        $headers = [
            'No',
            'Tanggal',
            'Nama Siswa',
            'Kelas',
            'Kategori',
            'Pelanggaran Disiplin',
            'Poin Demerit',
            'Guru Pencatat',
            'Peran Guru',
            'Catatan',
        ];

        $index = 1;
        $rows = $punishments->map(function ($p) use (&$index) {
            return [
                $index++,
                $p->punishment_date?->format('d M Y') ?? '',
                $p->student?->name ?? '-',
                $p->student?->classroom?->name ?? '-',
                $p->violationRule?->category?->name ?? '-',
                $p->violationRule?->description ?? '-',
                $p->point_deducted,
                $p->teacher?->name ?? '-',
                $p->teacher_role === 'pc1' ? 'Wali Kelas' : ($p->teacher_role === 'subject' ? 'Guru Mapel' : 'Admin'),
                $p->notes ?? '',
            ];
        });

        $format = strtolower($request->query('format', 'xlsx'));
        $dateStr = date('Ymd_His');

        if ($format === 'csv') {
            $filename = 'rekap_pelanggaran_demerit_' . $dateStr . '.csv';
            return $this->csvService->streamCsv($headers, $rows, $filename);
        }

        $filename = 'rekap_pelanggaran_demerit_' . $dateStr . '.xlsx';
        return $this->csvService->streamXlsx($headers, $rows, $filename, 'Rekap Demerit');
    }

    /**
     * Download Excel/CSV template for bulk punishment (demerit) import.
     */
    public function template(Request $request)
    {
        $format = strtolower($request->query('format', 'xlsx'));
        $headers = ['nis', 'violation_rule', 'punishment_date', 'notes'];
        $samples = [
            ['STU00001', 'Terlambat masuk kelas tanpa keterangan', Carbon::today()->toDateString(), 'Terlambat 15 menit'],
            ['STU00002', 'Tidak berpakaian rapi sesuai tata tertib sekolah', Carbon::today()->toDateString(), 'Seragam tidak lengkap'],
        ];

        if ($format === 'csv') {
            return $this->csvService->streamCsv($headers, $samples, 'template_pelanggaran.csv');
        }

        return $this->csvService->streamXlsx($headers, $samples, 'template_pelanggaran.xlsx', 'Template Pelanggaran');
    }

    /**
     * Bulk import punishments (demerits) from Excel or CSV.
     */
    public function import(Request $request): JsonResponse
    {
        $user = $request->user();

        $request->validate([
            'file' => 'required|file|max:10240',
        ]);

        try {
            $parsed = $this->csvService->parseSpreadsheet($request->file('file'));
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to parse file: ' . $e->getMessage(),
                'errors'  => [$e->getMessage()],
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $rows = $parsed['rows'];
        if (empty($rows)) {
            return response()->json([
                'success' => false,
                'message' => 'The CSV file has no data rows.',
                'errors'  => ['No data rows found.'],
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        // Preload students with classroom for quick lookup
        $studentsByNis = Student::with('classroom')->get()->keyBy(fn($s) => strtolower(trim($s->nis)));

        // Preload active violation rules (keyed by ID and lowercase description)
        $activeRules = ViolationRule::where('is_active', true)->get();
        $rulesById = $activeRules->keyBy('id');
        $rulesByDesc = $activeRules->keyBy(fn($r) => strtolower(trim($r->description)));

        // Preload subject teacher taught classroom IDs if role is subject
        $subjectTaughtIds = $user->isSubject()
            ? $user->taughtClassrooms()->pluck('classrooms.id')->toArray()
            : [];

        $errors = [];
        $recordsToInsert = [];

        foreach ($rows as $item) {
            $line = $item['line'];
            $data = array_change_key_case($item['data'], CASE_LOWER);

            $nis      = trim($data['nis'] ?? '');
            $ruleStr  = trim($data['violation_rule'] ?? ($data['rule'] ?? ''));
            $dateStr  = trim($data['punishment_date'] ?? ($data['date'] ?? ''));
            $notes    = trim($data['notes'] ?? '');

            // 1. Validate student
            if (empty($nis)) {
                $errors[] = "Row {$line}: Student NIS is required.";
                continue;
            }

            $student = $studentsByNis->get(strtolower($nis));
            if (! $student) {
                $errors[] = "Row {$line}: Student with NIS '{$nis}' not found.";
                continue;
            }

            // Check classroom permissions
            if ($user->isPc1()) {
                if ($student->classroom_id !== $user->classroom_id) {
                    $errors[] = "Row {$line}: Student '{$student->name}' (NIS {$nis}) is in '{$student->classroom?->name}', not your assigned classroom.";
                }
            } elseif ($user->isSubject()) {
                if (! empty($subjectTaughtIds) && ! in_array($student->classroom_id, $subjectTaughtIds)) {
                    $errors[] = "Row {$line}: Student '{$student->name}' (NIS {$nis}) is in '{$student->classroom?->name}', which is not in classrooms assigned to you.";
                }
            }

            // 2. Validate violation rule
            if (empty($ruleStr)) {
                $errors[] = "Row {$line}: Violation rule is required.";
            } else {
                $matchedRule = null;
                if (is_numeric($ruleStr)) {
                    $matchedRule = $rulesById->get((int) $ruleStr);
                } else {
                    $matchedRule = $rulesByDesc->get(strtolower($ruleStr));
                }

                if (! $matchedRule) {
                    $errors[] = "Row {$line}: Violation rule '{$ruleStr}' not found or is inactive.";
                }
            }

            // 3. Validate punishment date
            $punishmentDate = Carbon::today()->toDateString();
            if (! empty($dateStr)) {
                try {
                    $parsedDate = Carbon::parse($dateStr);
                    if ($parsedDate->isAfter(Carbon::today())) {
                        $errors[] = "Row {$line}: Punishment date '{$dateStr}' cannot be in the future.";
                    } else {
                        $punishmentDate = $parsedDate->toDateString();
                    }
                } catch (\Exception $e) {
                    $errors[] = "Row {$line}: Invalid date format '{$dateStr}'. Use YYYY-MM-DD.";
                }
            }

            if (isset($matchedRule) && $matchedRule) {
                $recordsToInsert[] = [
                    'student_id'        => $student->id,
                    'violation_rule_id' => $matchedRule->id,
                    'teacher_id'        => $user->id,
                    'teacher_role'      => $user->role,
                    'point_deducted'    => $matchedRule->point_deduction,
                    'punishment_date'   => $punishmentDate,
                    'notes'             => $notes ?: null,
                ];
            }
        }

        if (! empty($errors)) {
            return response()->json([
                'success'        => false,
                'message'        => 'Validation failed for ' . count($errors) . ' item(s) in CSV file.',
                'errors'         => $errors,
                'imported_count' => 0,
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        DB::transaction(function () use ($recordsToInsert) {
            foreach ($recordsToInsert as $record) {
                Punishment::create($record);
            }
        });

        return response()->json([
            'success'        => true,
            'message'        => 'Successfully imported ' . count($recordsToInsert) . ' demerit record(s).',
            'imported_count' => count($recordsToInsert),
            'errors'         => [],
        ], Response::HTTP_OK);
    }
}
