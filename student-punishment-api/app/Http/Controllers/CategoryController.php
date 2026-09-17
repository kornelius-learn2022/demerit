<?php

namespace App\Http\Controllers;

use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class CategoryController extends Controller
{
    /**
     * List all categories (all authenticated users).
     */
    public function index(Request $request): JsonResponse
    {
        $categories = Category::with('createdBy:id,name')
            ->withCount('violationRules')
            ->when($request->filled('search'), fn ($q) =>
                $q->where('name', 'like', "%{$request->search}%"))
            ->orderBy('name')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Categories retrieved successfully.',
            'data'    => $categories,
        ], Response::HTTP_OK);
    }

    /**
     * Create a new category (admin only — enforced in routes).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'        => 'required|string|max:255|unique:categories,name',
            'description' => 'nullable|string|max:1000',
        ]);

        $validated['created_by'] = $request->user()->id;

        $category = Category::create($validated);
        $category->load('createdBy:id,name');

        return response()->json([
            'success' => true,
            'message' => 'Category created successfully.',
            'data'    => $category,
        ], Response::HTTP_CREATED);
    }

    /**
     * Show a single category with its violation rules.
     */
    public function show(int $id): JsonResponse
    {
        $category = Category::with(['createdBy:id,name', 'violationRules'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'message' => 'Category retrieved successfully.',
            'data'    => $category,
        ], Response::HTTP_OK);
    }

    /**
     * Update a category (admin only — enforced in routes).
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $category = Category::findOrFail($id);

        $validated = $request->validate([
            'name'        => ["sometimes", "required", "string", "max:255", Rule::unique('categories', 'name')->ignore($id)],
            'description' => 'sometimes|nullable|string|max:1000',
        ]);

        $category->update($validated);
        $category->load('createdBy:id,name');

        return response()->json([
            'success' => true,
            'message' => 'Category updated successfully.',
            'data'    => $category,
        ], Response::HTTP_OK);
    }

    /**
     * Delete a category (admin only — enforced in routes).
     * Blocked if it has associated violation rules.
     */
    public function destroy(int $id): JsonResponse
    {
        $category = Category::withCount('violationRules')->findOrFail($id);

        if ($category->violation_rules_count > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete category because it has violation rules. Delete the rules first.',
                'data'    => null,
            ], Response::HTTP_CONFLICT);
        }

        $category->delete();

        return response()->json([
            'success' => true,
            'message' => 'Category deleted successfully.',
            'data'    => null,
        ], Response::HTTP_OK);
    }
}
