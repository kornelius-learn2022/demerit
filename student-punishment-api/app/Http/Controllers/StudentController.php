<?php

namespace App\Http\Controllers;

use App\Models\Classroom;
use App\Models\Student;
use App\Services\CsvService;
use App\Services\StudentScoreService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class StudentController extends Controller
{
    public function __construct(
        private StudentScoreService $scoreService,
        private CsvService $csvService
    ) {}

    /**
     * List students with role-based scoping:
     * - admin: all students (optionally filtered by classroom_id)
     * - pc1:   only students in their assigned classroom
     * - subject: all students (for punishment creation form)
     *
     * Always includes current_score from Redis/DB.
     */
    public function index(Request $request): JsonResponse
    {
        $user  = $request->user();
        $query = Student::with(['classroom', 'latestPunishment.violationRule'])
            ->when($request->filled('is_active'), fn($q) => $q->where('is_active', $request->boolean('is_active')))
            ->when($request->filled('search'), function ($q) use ($request) {
                $q->where(function ($sub) use ($request) {
                    $sub->where('name', 'like', "%{$request->search}%")
                        ->orWhere('nis', 'like', "%{$request->search}%");
                });
            });

        // Scoping by role
        if ($user->isPc1()) {
            $query->where('classroom_id', $user->classroom_id);
        } elseif ($user->isSubject()) {
            $taughtIds = $user->taughtClassrooms()->pluck('classrooms.id');
            if ($taughtIds->isNotEmpty()) {
                if ($request->filled('classroom_id')) {
                    if ($taughtIds->contains((int) $request->classroom_id)) {
                        $query->where('classroom_id', $request->classroom_id);
                    } else {
                        $query->whereRaw('1 = 0');
                    }
                } else {
                    $query->whereIn('classroom_id', $taughtIds);
                }
            } elseif ($request->filled('classroom_id')) {
                $query->where('classroom_id', $request->classroom_id);
            }
        } elseif ($request->filled('classroom_id')) {
            // admin can filter by classroom_id
            $query->where('classroom_id', $request->classroom_id);
        }

        $students = $query->orderBy('name')->get();

        // Append current_score to each student (via accessor which checks Redis)
        $students->transform(function (Student $student) {
            $student->append('current_score');
            return $student;
        });

        return response()->json([
            'success' => true,
            'message' => 'Students retrieved successfully.',
            'data'    => $students,
        ], Response::HTTP_OK);
    }

    /**
     * Create a new student (admin only).
     */
    public function store(Request $request): JsonResponse
    {
        Gate::authorize('create', Student::class);

        if (!$request->filled('nis')) {
            $nextId = (Student::max('id') ?? 0) + 1;
            $request->merge(['nis' => 'STU' . str_pad((string) $nextId, 5, '0', STR_PAD_LEFT)]);
        }

        $validated = $request->validate([
            'nis'            => 'required|string|max:20|unique:students,nis',
            'name'           => 'required|string|max:255',
            'classroom_id'   => 'required|exists:classrooms,id',
            'initial_points' => 'sometimes|integer|min:0|max:1000',
            'is_active'      => 'sometimes|boolean',
        ]);

        $student = Student::create($validated);
        $student->load(['classroom', 'latestPunishment.violationRule']);

        return response()->json([
            'success' => true,
            'message' => 'Student created successfully.',
            'data'    => $student,
        ], Response::HTTP_CREATED);
    }

    /**
     * Show a single student with current score (policy-guarded).
     */
    public function show(int $id): JsonResponse
    {
        $student = Student::with(['classroom', 'latestPunishment.violationRule'])->findOrFail($id);
        Gate::authorize('view', $student);

        $student->append('current_score');

        return response()->json([
            'success' => true,
            'message' => 'Student retrieved successfully.',
            'data'    => $student,
        ], Response::HTTP_OK);
    }

    /**
     * Update a student (admin only).
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $student = Student::findOrFail($id);
        Gate::authorize('update', $student);

        $validated = $request->validate([
            'nis'            => ["sometimes", "required", "string", "max:20", Rule::unique('students', 'nis')->ignore($id)],
            'name'           => 'sometimes|required|string|max:255',
            'classroom_id'   => 'sometimes|required|exists:classrooms,id',
            'initial_points' => 'sometimes|integer|min:0|max:1000',
            'is_active'      => 'sometimes|boolean',
        ]);

        $student->update($validated);

        // Invalidate score cache if classroom or initial_points changed
        if (isset($validated['classroom_id']) || isset($validated['initial_points'])) {
            $this->scoreService->invalidateScore($student->id);
        }

        $student->load('classroom');
        $student->append('current_score');

        return response()->json([
            'success' => true,
            'message' => 'Student updated successfully.',
            'data'    => $student,
        ], Response::HTTP_OK);
    }

    /**
     * Delete a student (admin only).
     */
    public function destroy(int $id): JsonResponse
    {
        $student = Student::findOrFail($id);
        Gate::authorize('delete', $student);

        // Invalidate cache before delete (boot also handles this)
        $this->scoreService->invalidateScore($student->id);

        $student->delete();

        return response()->json([
            'success' => true,
            'message' => 'Student deleted successfully.',
            'data'    => null,
        ], Response::HTTP_OK);
    }

    /**
     * Export students to CSV with role-based scoping and filtering.
     */
    public function export(Request $request)
    {
        $user  = $request->user();
        $query = Student::with('classroom')
            ->when($request->filled('is_active'), fn($q) => $q->where('is_active', $request->boolean('is_active')))
            ->when($request->filled('search'), function ($q) use ($request) {
                $q->where(function ($sub) use ($request) {
                    $sub->where('name', 'like', "%{$request->search}%")
                        ->orWhere('nis', 'like', "%{$request->search}%");
                });
            });

        // Scoping by role
        if ($user->isPc1()) {
            $query->where('classroom_id', $user->classroom_id);
        } elseif ($user->isSubject()) {
            $taughtIds = $user->taughtClassrooms()->pluck('classrooms.id');
            if ($taughtIds->isNotEmpty()) {
                if ($request->filled('classroom_id')) {
                    if ($taughtIds->contains((int) $request->classroom_id)) {
                        $query->where('classroom_id', $request->classroom_id);
                    } else {
                        $query->whereRaw('1 = 0');
                    }
                } else {
                    $query->whereIn('classroom_id', $taughtIds);
                }
            } elseif ($request->filled('classroom_id')) {
                $query->where('classroom_id', $request->classroom_id);
            }
        } elseif ($request->filled('classroom_id')) {
            $query->where('classroom_id', $request->classroom_id);
        }

        $students = $query
            ->with(['classroom', 'latestPunishment.violationRule'])
            ->orderBy('name')
            ->get();

        $headers = [
            'No',
            'Nama Siswa',
            'Kelas',
            'Tingkat',
            'Poin Awal',
            'Total Demerit',
            'Skor Saat Ini',
            'Status Milestone Ortu',
            'Pelanggaran Terakhir',
            'Tanggal Pelanggaran Terakhir',
        ];

        $index = 1;
        $rows = $students->map(function ($s) use (&$index) {
            $initial = $s->initial_points ?? 150;
            $current = $this->scoreService->getScore($s->id);
            $totalDemerit = max(0, $initial - $current);
            $parentStatus = $current <= 120 ? 'Wajib Hubungi Ortu (≥30 Demerit)' : 'Aman';
            $lastViolation = $s->latestPunishment?->violationRule?->description ?? 'Belum ada';
            $lastDate = $s->latestPunishment?->punishment_date ? date('d M Y', strtotime($s->latestPunishment->punishment_date)) : '-';

            return [
                $index++,
                $s->name,
                $s->classroom?->name ?? '-',
                'Grade ' . ($s->classroom?->grade_level ?? '-'),
                $initial,
                $totalDemerit,
                $current,
                $parentStatus,
                $lastViolation,
                $lastDate,
            ];
        });

        $format = strtolower($request->query('format', 'xlsx'));
        $dateStr = date('Ymd_His');

        if ($format === 'csv') {
            $filename = 'rekap_siswa_disiplin_' . $dateStr . '.csv';
            return $this->csvService->streamCsv($headers, $rows, $filename);
        }

        $filename = 'rekap_siswa_disiplin_' . $dateStr . '.xlsx';
        return $this->csvService->streamXlsx($headers, $rows, $filename, 'Rekap Siswa Disiplin');
    }

    /**
     * Download Excel/CSV template for students import.
     */
    public function template(Request $request)
    {
        $format = strtolower($request->query('format', 'xlsx'));
        $headers = ['Nama Siswa', 'Kelas', 'Poin Awal'];
        $samples = [
            ['Aaron Davidson Gumulia', 'Kelas 3A', '148'],
            ['Achiera Veinholy Setiawan', 'Kelas 3A', '150'],
            ['Elisha Glorius Wibowo', 'Kelas 3A', '124'],
            ['Aldrich Demora', 'Kelas 3C', '150'],
            ['Axl Dylan Laksono', 'Kelas 3C', '133'],
            ['Chelsea Nobelle Chia', 'Kelas 3B', '150'],
        ];

        if ($format === 'csv') {
            return $this->csvService->streamCsv($headers, $samples, 'template_siswa.csv');
        }

        return $this->csvService->streamXlsx($headers, $samples, 'template_siswa.xlsx', 'Template Siswa');
    }

    /**
     * Bulk import students from Excel or CSV (admin only).
     * Supports initial points from spreadsheet and updates existing students by NIS or Name+Class.
     */
    public function import(Request $request): JsonResponse
    {
        Gate::authorize('create', Student::class);

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

        // Cache classrooms for fast lookup by name and flexible aliases
        $classroomLookup = [];
        foreach (Classroom::all() as $c) {
            $raw = strtolower(trim($c->name));
            $classroomLookup[$raw] = $c;
            $stripped = preg_replace('/^(kelas|class)\s+/i', '', $raw);
            $classroomLookup[$stripped] = $c;
            $classroomLookup[$stripped . ' class'] = $c;
            $classroomLookup['class ' . $stripped] = $c;
            $classroomLookup['kelas ' . $stripped] = $c;
        }

        // Cache existing students by NIS and by name+classroom_id
        $existingStudentsByNis = Student::all()->keyBy(fn($s) => strtolower(trim($s->nis)));
        $existingStudentsByNameClass = Student::all()->keyBy(fn($s) => $s->classroom_id . '_' . strtolower(trim($s->name)));

        $errors = [];
        $recordsToInsert = [];
        $recordsToUpdate = [];
        $nextGeneratedId = (Student::max('id') ?? 0) + 1;

        foreach ($rows as $item) {
            $line = $item['line'];
            $data = [];
            foreach ($item['data'] as $k => $v) {
                $cleanKey = strtolower(trim(str_replace([' ', '_', '-'], '', (string) $k)));
                $data[$cleanKey] = trim((string) $v);
            }

            // Extract student name with flexible aliases
            $name = $data['namasiswa']
                ?? $data['nama']
                ?? $data['name']
                ?? $data['studentname']
                ?? $data['student']
                ?? '';

            // Extract classroom with flexible aliases
            $classStr = $data['kelas']
                ?? $data['classroom']
                ?? $data['class']
                ?? $data['ruangkelas']
                ?? '';

            // Optional NIS
            $nis = $data['nis']
                ?? $data['studentid']
                ?? $data['nomorinduk']
                ?? $data['noinduk']
                ?? '';

            // Extract initial points
            $rawPoints = $data['poinawal']
                ?? $data['initialpoints']
                ?? $data['poin']
                ?? $data['points']
                ?? $data['point']
                ?? $data['nilai']
                ?? $data['nilaipoin']
                ?? $data['skor']
                ?? $data['score']
                ?? $data['totalpoints']
                ?? null;

            $initialPoints = 150;
            if ($rawPoints !== null && trim((string) $rawPoints) !== '') {
                $cleanPoints = trim((string) $rawPoints);
                if (is_numeric($cleanPoints)) {
                    $initialPoints = max(0, (int) $cleanPoints);
                } else {
                    $errors[] = "Baris {$line}: Nilai poin '{$cleanPoints}' harus berupa angka numerik.";
                }
            }

            if (empty($name)) {
                $errors[] = "Baris {$line}: Nama siswa wajib diisi.";
            }

            $classroom = null;
            if (empty($classStr)) {
                $errors[] = "Baris {$line}: Kelas siswa wajib diisi.";
            } else {
                $key = strtolower(trim($classStr));
                $classroom = $classroomLookup[$key] ?? null;
                if (! $classroom) {
                    $errors[] = "Baris {$line}: Kelas '{$classStr}' tidak ditemukan di sistem.";
                }
            }

            $isActiveRaw = $data['isactive'] ?? $data['status'] ?? $data['aktif'] ?? '1';
            $isActiveBool = ! in_array(strtolower($isActiveRaw), ['0', 'false', 'no', 'nonaktif'], true);

            // Check if existing student by NIS or by Name+Classroom
            $existing = null;
            if (!empty($nis) && isset($existingStudentsByNis[strtolower($nis)])) {
                $existing = $existingStudentsByNis[strtolower($nis)];
            } elseif ($classroom && isset($existingStudentsByNameClass[$classroom->id . '_' . strtolower($name)])) {
                $existing = $existingStudentsByNameClass[$classroom->id . '_' . strtolower($name)];
            }

            if ($existing) {
                $recordsToUpdate[] = [
                    'id'   => $existing->id,
                    'data' => [
                        'name'           => $name,
                        'classroom_id'   => $classroom?->id ?? $existing->classroom_id,
                        'initial_points' => $initialPoints,
                        'is_active'      => $isActiveBool,
                    ],
                ];
            } else {
                $finalNis = !empty($nis) ? $nis : 'STU' . str_pad((string) $nextGeneratedId++, 5, '0', STR_PAD_LEFT);
                $recordsToInsert[] = [
                    'nis'            => $finalNis,
                    'name'           => $name,
                    'classroom_id'   => $classroom?->id,
                    'initial_points' => $initialPoints,
                    'is_active'      => $isActiveBool,
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

        DB::transaction(function () use ($recordsToInsert, $recordsToUpdate) {
            foreach ($recordsToInsert as $record) {
                Student::create($record);
            }
            foreach ($recordsToUpdate as $item) {
                $student = Student::find($item['id']);
                if ($student) {
                    $student->update($item['data']);
                    $this->scoreService->invalidateScore($student->id);
                }
            }
        });

        $totalProcessed = count($recordsToInsert) + count($recordsToUpdate);

        return response()->json([
            'success'        => true,
            'message'        => "Successfully processed {$totalProcessed} student(s) (" . count($recordsToInsert) . " new, " . count($recordsToUpdate) . " updated).",
            'imported_count' => $totalProcessed,
            'errors'         => [],
        ], Response::HTTP_OK);
    }
}
