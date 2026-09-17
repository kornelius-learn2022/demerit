<?php

namespace App\Http\Controllers;

use App\Models\Classroom;
use App\Models\Punishment;
use App\Models\User;
use App\Services\CsvService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class UserController extends Controller
{
    public function __construct(private CsvService $csvService) {}
    /**
     * List all users with optional filters (role, classroom_id).
     * Admin only.
     */
    public function index(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', User::class);

        $query = User::with(['classroom', 'taughtClassrooms:id,name,grade_level'])
            ->when($request->filled('role'), fn($q) => $q->where('role', $request->role))
            ->when($request->filled('classroom_id'), fn($q) => $q->where('classroom_id', $request->classroom_id))
            ->when($request->filled('search'), function ($q) use ($request) {
                $q->where(function ($sub) use ($request) {
                    $sub->where('name', 'like', "%{$request->search}%")
                        ->orWhere('email', 'like', "%{$request->search}%");
                });
            })
            ->orderBy('name');

        $users = $query->get();

        return response()->json([
            'success' => true,
            'message' => 'Users retrieved successfully.',
            'data'    => $users,
        ], Response::HTTP_OK);
    }

    /**
     * Create a new user.
     * Admin only.
     */
    public function store(Request $request): JsonResponse
    {
        Gate::authorize('create', User::class);

        if (!$request->filled('username') && $request->filled('name')) {
            $baseUsername = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', explode(' ', $request->name)[0]));
            if (empty($baseUsername)) $baseUsername = 'user';
            $candidate = $baseUsername;
            $i = 1;
            while (User::where('username', $candidate)->exists()) {
                $candidate = $baseUsername . $i;
                $i++;
            }
            $request->merge(['username' => $candidate]);
        }

        if ($request->filled('username')) {
            $request->merge(['username' => ltrim(trim($request->username), '@')]);
        } elseif (!$request->filled('username') && $request->filled('email')) {
            $baseUser = strtolower(explode('@', $request->email)[0]);
            $request->merge(['username' => $baseUser]);
        }

        if (!$request->filled('email') && $request->filled('username')) {
            $request->merge(['email' => $request->username . '@school.local']);
        }

        $validated = $request->validate([
            'name'          => 'required|string|max:255',
            'username'      => 'required|string|max:50|unique:users,username',
            'email'         => 'required|email|unique:users,email',
            'password'      => 'required|string|min:6',
            'role'          => 'required|in:admin,pc1,subject',
            'classroom_id'  => [
                'nullable',
                Rule::requiredIf(fn() => $request->role === 'pc1'),
                'exists:classrooms,id',
            ],
            'classroom_ids'   => 'sometimes|array',
            'classroom_ids.*' => 'exists:classrooms,id',
        ]);

        // Ensure classroom_id only applies to pc1
        if ($validated['role'] !== 'pc1') {
            $validated['classroom_id'] = null;
        }

        $validated['password'] = Hash::make($validated['password']);

        $user = User::create($validated);

        if ($validated['role'] === 'subject' && isset($validated['classroom_ids'])) {
            $user->taughtClassrooms()->sync($validated['classroom_ids']);
        }

        $user->load(['classroom', 'taughtClassrooms:id,name,grade_level']);

        return response()->json([
            'success' => true,
            'message' => 'User created successfully.',
            'data'    => $user,
        ], Response::HTTP_CREATED);
    }

    /**
     * Show a single user.
     * Admin only.
     */
    public function show(int $id): JsonResponse
    {
        $user = User::with(['classroom', 'taughtClassrooms:id,name,grade_level'])->findOrFail($id);
        Gate::authorize('view', $user);

        return response()->json([
            'success' => true,
            'message' => 'User retrieved successfully.',
            'data'    => $user,
        ], Response::HTTP_OK);
    }

    /**
     * Update a user (including optional password reset).
     * Admin only.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $user = User::findOrFail($id);
        Gate::authorize('update', $user);

        if ($request->filled('username')) {
            $request->merge(['username' => ltrim(trim($request->username), '@')]);
        }

        $validated = $request->validate([
            'name'            => 'sometimes|required|string|max:255',
            'username'        => ['sometimes', 'nullable', 'string', 'max:50', Rule::unique('users', 'username')->ignore($id)],
            'email'           => ['sometimes', 'required', 'email', Rule::unique('users', 'email')->ignore($id)],
            'password'        => 'sometimes|nullable|string|min:6',
            'role'            => 'sometimes|required|in:admin,pc1,subject',
            'classroom_id'    => 'sometimes|nullable|exists:classrooms,id',
            'classroom_ids'   => 'sometimes|array',
            'classroom_ids.*' => 'exists:classrooms,id',
        ]);

        // Hash password if provided
        if (isset($validated['password']) && $validated['password']) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        // Enforce classroom_id only for pc1
        $role = $validated['role'] ?? $user->role;
        if ($role !== 'pc1') {
            $validated['classroom_id'] = null;
        }

        $user->update($validated);

        if ($role === 'subject') {
            if (array_key_exists('classroom_ids', $validated)) {
                $user->taughtClassrooms()->sync($validated['classroom_ids']);
            }
        } else {
            $user->taughtClassrooms()->detach();
        }

        $user->load(['classroom', 'taughtClassrooms:id,name,grade_level']);

        return response()->json([
            'success' => true,
            'message' => 'User updated successfully.',
            'data'    => $user,
        ], Response::HTTP_OK);
    }

    /**
     * Delete a user.
     * Admin only. Prevents deletion if user has recorded punishments.
     */
    public function destroy(int $id): JsonResponse
    {
        $user = User::findOrFail($id);
        Gate::authorize('delete', $user);

        // Guard: cannot delete if user has punishments (data integrity)
        if (Punishment::where('teacher_id', $id)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete this user because they have recorded punishments. Consider deactivating the account instead.',
                'data'    => null,
            ], Response::HTTP_CONFLICT);
        }

        $user->delete();

        return response()->json([
            'success' => true,
            'message' => 'User deleted successfully.',
            'data'    => null,
        ], Response::HTTP_OK);
    }

    /**
     * Export users/teachers to CSV. Admin only.
     */
    public function export(Request $request)
    {
        Gate::authorize('viewAny', User::class);

        $query = User::with(['classroom', 'taughtClassrooms:id,name,grade_level'])
            ->when($request->filled('role'), function ($q) use ($request) {
                if ($request->role === 'teacher') {
                    $q->whereIn('role', ['pc1', 'subject']);
                } else {
                    $q->where('role', $request->role);
                }
            })
            ->when($request->filled('classroom_id'), fn($q) => $q->where('classroom_id', $request->classroom_id))
            ->when($request->filled('search'), function ($q) use ($request) {
                $q->where(function ($sub) use ($request) {
                    $sub->where('name', 'like', "%{$request->search}%")
                        ->orWhere('email', 'like', "%{$request->search}%");
                });
            })
            ->orderBy('name');

        $users = $query->get();

        $headers = ['No', 'Username', 'Nama', 'Peran', 'Wali Kelas', 'Kelas Mapel', 'Email', 'Tanggal Dibuat'];
        $index = 1;
        $rows = $users->map(function ($u) use (&$index) {
            $roleLabel = $u->role === 'admin' ? 'Administrator' : ($u->role === 'pc1' ? 'Wali Kelas' : 'Guru Mapel');
            return [
                $index++,
                $u->username ?? strtolower(explode('@', $u->email)[0]),
                $u->name,
                $roleLabel,
                $u->classroom?->name ?? '-',
                $u->taughtClassrooms->pluck('name')->implode(', ') ?: '-',
                $u->email,
                $u->created_at?->format('d M Y') ?? '',
            ];
        });

        $format = strtolower($request->query('format', 'xlsx'));
        $dateStr = date('Ymd_His');

        if ($format === 'csv') {
            $filename = 'rekap_pengguna_guru_' . $dateStr . '.csv';
            return $this->csvService->streamCsv($headers, $rows, $filename);
        }

        $filename = 'rekap_pengguna_guru_' . $dateStr . '.xlsx';
        return $this->csvService->streamXlsx($headers, $rows, $filename, 'Rekap Pengguna');
    }

    /**
     * Download Excel/CSV template for users/teachers import.
     */
    public function template(Request $request)
    {
        Gate::authorize('create', User::class);

        $format = strtolower($request->query('format', 'xlsx'));
        $headers = ['username', 'name', 'password', 'role', 'classroom', 'taught_classrooms', 'email'];
        $samples = [
            ['ahmad', 'Ahmad Subandi', 'password123', 'pc1', 'Kelas 4A', '', 'ahmad.pc1@school.com'],
            ['dewi', 'Dewi Sartika', 'password123', 'subject', '', 'Kelas 4A, Kelas 4B', 'dewi.subject@school.com'],
        ];

        if ($format === 'csv') {
            return $this->csvService->streamCsv($headers, $samples, 'template_pengguna.csv');
        }

        return $this->csvService->streamXlsx($headers, $samples, 'template_pengguna.xlsx', 'Template Pengguna');
    }

    /**
     * Bulk import users/teachers from Excel or CSV. Admin only.
     */
    public function import(Request $request): JsonResponse
    {
        Gate::authorize('create', User::class);

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

        $classrooms = Classroom::all()->keyBy(fn($c) => strtolower(trim($c->name)));
        $existingEmails = User::pluck('email')->map(fn($e) => strtolower(trim($e)))->flip()->toArray();

        $errors = [];
        $recordsToInsert = [];
        $seenEmailsInBatch = [];

        foreach ($rows as $item) {
            $line = $item['line'];
            $data = array_change_key_case($item['data'], CASE_LOWER);

            $name             = trim($data['name'] ?? '');
            $email            = trim($data['email'] ?? '');
            $password         = trim($data['password'] ?? '');
            $role             = strtolower(trim($data['role'] ?? ''));
            $classroomStr     = trim($data['classroom'] ?? '');
            $taughtClassesStr = trim($data['taught_classrooms'] ?? '');

            if (empty($name)) {
                $errors[] = "Row {$line}: Name is required.";
            }

            if (empty($email)) {
                $errors[] = "Row {$line}: Email is required.";
            } elseif (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $errors[] = "Row {$line}: Email '{$email}' is invalid.";
            } else {
                $lowerEmail = strtolower($email);
                if (isset($existingEmails[$lowerEmail])) {
                    $errors[] = "Row {$line}: Email '{$email}' already exists in database.";
                }
                if (isset($seenEmailsInBatch[$lowerEmail])) {
                    $errors[] = "Row {$line}: Email '{$email}' is duplicated in the file (first seen on row {$seenEmailsInBatch[$lowerEmail]}).";
                }
                $seenEmailsInBatch[$lowerEmail] = $line;
            }

            if (empty($password)) {
                $errors[] = "Row {$line}: Password is required.";
            } elseif (strlen($password) < 8) {
                $errors[] = "Row {$line}: Password must be at least 8 characters.";
            }

            if (! in_array($role, ['admin', 'pc1', 'subject'], true)) {
                $errors[] = "Row {$line}: Role must be one of: admin, pc1, subject.";
            }

            $classroomId = null;
            if ($role === 'pc1') {
                if (empty($classroomStr)) {
                    $errors[] = "Row {$line}: Assigned classroom is required for pc1 role.";
                } else {
                    $c = $classrooms->get(strtolower($classroomStr));
                    if (! $c) {
                        $errors[] = "Row {$line}: Assigned classroom '{$classroomStr}' not found.";
                    } else {
                        $classroomId = $c->id;
                    }
                }
            }

            $taughtClassroomIds = [];
            if ($role === 'subject' && ! empty($taughtClassesStr)) {
                $classNames = array_filter(array_map('trim', explode(',', $taughtClassesStr)));
                foreach ($classNames as $cn) {
                    $c = $classrooms->get(strtolower($cn));
                    if (! $c) {
                        $errors[] = "Row {$line}: Taught classroom '{$cn}' not found.";
                    } else {
                        $taughtClassroomIds[] = $c->id;
                    }
                }
            }

            $recordsToInsert[] = [
                'name'                 => $name,
                'email'                => $email,
                'password'             => Hash::make($password),
                'role'                 => $role,
                'classroom_id'         => $classroomId,
                'taught_classroom_ids' => $taughtClassroomIds,
            ];
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
                $taughtIds = $record['taught_classroom_ids'];
                unset($record['taught_classroom_ids']);

                $user = User::create($record);
                if ($user->role === 'subject' && ! empty($taughtIds)) {
                    $user->taughtClassrooms()->sync($taughtIds);
                }
            }
        });

        return response()->json([
            'success'        => true,
            'message'        => 'Successfully imported ' . count($recordsToInsert) . ' user(s).',
            'imported_count' => count($recordsToInsert),
            'errors'         => [],
        ], Response::HTTP_OK);
    }
}
