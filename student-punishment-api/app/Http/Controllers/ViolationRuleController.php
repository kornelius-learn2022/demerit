<?php

namespace App\Http\Controllers;

use App\Models\ViolationRule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class ViolationRuleController extends Controller
{
    /**
     * List violation rules with optional filters by category_id and is_active.
     * All authenticated roles can read.
     */
    public function index(Request $request): JsonResponse
    {
        $rules = ViolationRule::with('category:id,name')
            ->when($request->filled('category_id'), fn ($q) => $q->where('category_id', $request->category_id))
            ->when($request->filled('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->when($request->filled('search'), fn ($q) =>
                $q->where('description', 'like', "%{$request->search}%"))
            ->orderBy('category_id')
            ->orderBy('description')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Violation rules retrieved successfully.',
            'data'    => $rules,
        ], Response::HTTP_OK);
    }

    /**
     * Create a violation rule (admin only — enforced in routes).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'category_id'     => 'required|exists:categories,id',
            'description'     => 'required|string|max:500',
            'point_deduction' => 'required|integer|min:1|max:150',
            'is_active'       => 'sometimes|boolean',
        ]);

        $rule = ViolationRule::create($validated);
        $rule->load('category:id,name');

        return response()->json([
            'success' => true,
            'message' => 'Violation rule created successfully.',
            'data'    => $rule,
        ], Response::HTTP_CREATED);
    }

    /**
     * Show a single violation rule.
     */
    public function show(int $id): JsonResponse
    {
        $rule = ViolationRule::with('category:id,name')->findOrFail($id);

        return response()->json([
            'success' => true,
            'message' => 'Violation rule retrieved successfully.',
            'data'    => $rule,
        ], Response::HTTP_OK);
    }

    /**
     * Update a violation rule (admin only — enforced in routes).
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $rule = ViolationRule::findOrFail($id);

        $validated = $request->validate([
            'category_id'     => 'sometimes|required|exists:categories,id',
            'description'     => 'sometimes|required|string|max:500',
            'point_deduction' => 'sometimes|required|integer|min:1|max:150',
            'is_active'       => 'sometimes|boolean',
        ]);

        $rule->update($validated);
        $rule->load('category:id,name');

        return response()->json([
            'success' => true,
            'message' => 'Violation rule updated successfully.',
            'data'    => $rule,
        ], Response::HTTP_OK);
    }

    /**
     * Delete a violation rule (admin only — enforced in routes).
     * Blocked if it has associated punishments (data integrity).
     */
    public function destroy(int $id): JsonResponse
    {
        $rule = ViolationRule::withCount('punishments')->findOrFail($id);

        if ($rule->punishments_count > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete this rule because it is referenced by existing punishments. Deactivate it instead.',
                'data'    => null,
            ], Response::HTTP_CONFLICT);
        }

        $rule->delete();

        return response()->json([
            'success' => true,
            'message' => 'Violation rule deleted successfully.',
            'data'    => null,
        ], Response::HTTP_OK);
    }
}
