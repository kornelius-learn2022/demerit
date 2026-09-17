<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class AuthController extends Controller
{
    /**
     * Authenticate a user and issue a Sanctum token.
     * Rate limited to 5 attempts per minute per IP.
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'username' => 'sometimes|nullable|string',
            'email'    => 'sometimes|nullable|string',
            'password' => 'required|string',
        ]);

        $identifier = trim((string) ($request->input('username') ?? $request->input('email') ?? ''));

        if ($identifier === '') {
            return response()->json([
                'success' => false,
                'message' => 'Username is required.',
                'data'    => null,
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        // Rate limiting via cache (5 attempts per minute per IP)
        $key = 'login:' . $request->ip();

        if (RateLimiter::tooManyAttempts($key, 5)) {
            $seconds = RateLimiter::availableIn($key);
            return response()->json([
                'success' => false,
                'message' => "Too many login attempts. Please try again in {$seconds} seconds.",
                'data'    => null,
            ], Response::HTTP_TOO_MANY_REQUESTS);
        }

        $raw = trim($identifier);
        $clean = ltrim($raw, '@');
        $lower = strtolower($clean);

        // Strip prefix (ms, mr, mrs, bu, pak) with optional dot, space, dash, or underscore
        $stripped = preg_replace('/^(ms|mr|mrs|bu|pak)[\.\s_-]*/i', '', $clean);
        $strippedLower = strtolower(trim($stripped));

        // Compact alphanumeric variations
        $compact = preg_replace('/[\s\._-]+/', '', $lower);
        $compactStripped = preg_replace('/^(ms|mr|mrs|bu|pak)/i', '', $compact);

        $candidates = array_values(array_unique(array_filter([
            $lower,
            $strippedLower,
            $compact,
            $compactStripped,
            'ms' . $strippedLower,
            'mr' . $strippedLower,
            $clean,
            $raw,
        ])));

        // Search user case-insensitively with all variations
        $user = User::where(function ($q) use ($candidates, $clean, $raw) {
            foreach ($candidates as $c) {
                $q->orWhereRaw('LOWER(username) = ?', [$c])
                    ->orWhereRaw('LOWER(name) = ?', [$c])
                    ->orWhereRaw('LOWER(email) = ?', [$c])
                    ->orWhere('email', 'like', $c . '@%');
            }
            $q->orWhere('username', $clean)
                ->orWhere('username', '@' . $clean)
                ->orWhere('email', $raw);
        })->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            RateLimiter::hit($key, 60);

            return response()->json([
                'success' => false,
                'message' => 'The provided credentials are incorrect.',
                'data'    => null,
            ], Response::HTTP_UNAUTHORIZED);
        }

        RateLimiter::clear($key);

        // Load classroom relations
        $user->load(['classroom', 'taughtClassrooms:id,name,grade_level']);

        $token = $user->createToken('api-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Login successful.',
            'data'    => [
                'user'  => $this->formatUser($user),
                'token' => $token,
                'token_type' => 'Bearer',
            ],
        ], Response::HTTP_OK);
    }

    /**
     * Revoke the current user's access token (logout).
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully.',
            'data'    => null,
        ], Response::HTTP_OK);
    }

    /**
     * Return the currently authenticated user with classroom relations.
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load(['classroom', 'taughtClassrooms:id,name,grade_level']);

        return response()->json([
            'success' => true,
            'message' => 'Authenticated user retrieved.',
            'data'    => $this->formatUser($user),
        ], Response::HTTP_OK);
    }

    /**
     * Change the authenticated user's password.
     */
    public function changePassword(Request $request): JsonResponse
    {
        $request->validate([
            'current_password'          => 'required|string',
            'new_password'              => 'required|string|min:8|different:current_password|confirmed',
        ], [
            'current_password.required' => 'Password saat ini wajib diisi.',
            'new_password.required'     => 'Password baru wajib diisi.',
            'new_password.min'          => 'Password baru minimal 8 karakter.',
            'new_password.different'    => 'Password baru harus berbeda dari password saat ini.',
            'new_password.confirmed'    => 'Konfirmasi password baru tidak cocok.',
        ]);

        $user = $request->user();

        if (! Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Password saat ini salah.',
                'data'    => [
                    'current_password' => ['Password saat ini yang Anda masukkan salah.']
                ],
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $user->update([
            'password' => Hash::make($request->new_password),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Password berhasil diubah.',
            'data'    => null,
        ], Response::HTTP_OK);
    }

    /**
     * Update the authenticated user's display name.
     * Allows pc1, subject, and admin users to change their name.
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|min:2|max:100',
        ], [
            'name.required' => 'Nama wajib diisi.',
            'name.min'      => 'Nama minimal 2 karakter.',
            'name.max'      => 'Nama maksimal 100 karakter.',
        ]);

        $user = $request->user();
        $user->update([
            'name' => trim($request->name),
        ]);

        $user->load(['classroom', 'taughtClassrooms:id,name,grade_level']);

        return response()->json([
            'success' => true,
            'message' => 'Nama profil berhasil diperbarui.',
            'data'    => $this->formatUser($user),
        ], Response::HTTP_OK);
    }

    /**
     * Format user data for API response.
     */
    private function formatUser(User $user): array
    {
        return [
            'id'           => $user->id,
            'name'         => $user->name,
            'username'     => $user->username ?? strtolower(explode('@', $user->email)[0]),
            'email'        => $user->email,
            'role'         => $user->role,
            'classroom_id' => $user->classroom_id,
            'classroom'    => $user->classroom ? [
                'id'          => $user->classroom->id,
                'name'        => $user->classroom->name,
                'grade_level' => $user->classroom->grade_level,
            ] : null,
            'taught_classrooms' => $user->taughtClassrooms->map(fn($c) => [
                'id'          => $c->id,
                'name'        => $c->name,
                'grade_level' => $c->grade_level,
            ])->values()->all(),
        ];
    }
}
