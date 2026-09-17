<?php

namespace App\Http\Controllers;

use App\Models\Classroom;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ClassroomController extends Controller
{
    /**
     * List all classrooms (all authenticated roles).
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Classroom::withCount('students')
            ->when($request->filled('grade_level'), fn($q) => $q->where('grade_level', $request->grade_level))
            ->orderBy('grade_level')
            ->orderBy('name');

        if ($user && $user->isSubject()) {
            $taughtIds = $user->taughtClassrooms()->pluck('classrooms.id');
            if ($taughtIds->isNotEmpty()) {
                $query->whereIn('id', $taughtIds);
            }
        }

        $classrooms = $query->get();

        return response()->json([
            'success' => true,
            'message' => 'Classrooms retrieved successfully.',
            'data'    => $classrooms,
        ], Response::HTTP_OK);
    }

    /**
     * Create a new classroom (admin only — enforced in routes).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'        => 'required|string|max:100|unique:classrooms,name',
            'grade_level' => 'required|string|max:20',
        ]);

        $classroom = Classroom::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Classroom created successfully.',
            'data'    => $classroom,
        ], Response::HTTP_CREATED);
    }

    /**
     * Show a single classroom with student count (all authenticated roles).
     */
    public function show(int $id): JsonResponse
    {
        $classroom = Classroom::withCount('students')->findOrFail($id);

        return response()->json([
            'success' => true,
            'message' => 'Classroom retrieved successfully.',
            'data'    => $classroom,
        ], Response::HTTP_OK);
    }

    /**
     * Update a classroom (admin only — enforced in routes).
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $classroom = Classroom::findOrFail($id);

        $validated = $request->validate([
            'name'        => "sometimes|required|string|max:100|unique:classrooms,name,{$id}",
            'grade_level' => 'sometimes|required|string|max:20',
        ]);

        $classroom->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Classroom updated successfully.',
            'data'    => $classroom,
        ], Response::HTTP_OK);
    }

    /**
     * Delete a classroom (admin only).
     * Blocked if it has enrolled students.
     */
    public function destroy(int $id): JsonResponse
    {
        $classroom = Classroom::findOrFail($id);

        if (Student::where('classroom_id', $id)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete classroom because it has enrolled students.',
                'data'    => null,
            ], Response::HTTP_CONFLICT);
        }

        $classroom->delete();

        return response()->json([
            'success' => true,
            'message' => 'Classroom deleted successfully.',
            'data'    => null,
        ], Response::HTTP_OK);
    }
}
