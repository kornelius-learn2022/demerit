<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    /**
     * Get system settings (accessible to all authenticated users).
     */
    public function index(): JsonResponse
    {
        $settings = Setting::all()->pluck('value', 'key')->toArray();

        // Ensure active_academic_year has a sensible default
        if (!isset($settings['active_academic_year'])) {
            $settings['active_academic_year'] = '2024/2025';
        }

        return response()->json([
            'success' => true,
            'data'    => $settings,
        ]);
    }

    /**
     * Update system settings (admin only).
     */
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'active_academic_year' => 'required|string|max:20',
        ]);

        Setting::set('active_academic_year', $validated['active_academic_year']);

        return response()->json([
            'success' => true,
            'message' => 'Academic year setting updated successfully.',
            'data'    => [
                'active_academic_year' => $validated['active_academic_year'],
            ],
        ]);
    }
}
