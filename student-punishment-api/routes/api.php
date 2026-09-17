<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\ClassroomController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PunishmentController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\StudentController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\ViolationRuleController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes — Student Punishment Scoring System
|--------------------------------------------------------------------------
*/

// -------------------------------------------------------------------------
// Auth routes (public)
// -------------------------------------------------------------------------
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login'])->name('login');

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::put('/change-password', [AuthController::class, 'changePassword']);
        Route::put('/profile', [AuthController::class, 'updateProfile']);
    });
});

// -------------------------------------------------------------------------
// Public settings
// -------------------------------------------------------------------------
Route::get('/settings', [SettingController::class, 'index']);

// -------------------------------------------------------------------------
// Protected routes (require Sanctum token)
// -------------------------------------------------------------------------
Route::middleware('auth:sanctum')->group(function () {

    // Dashboard — all authenticated roles, response scoped by role
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // ------------------------------------------------------------------
    // User management — admin only
    // ------------------------------------------------------------------
    Route::middleware('role:admin')->group(function () {
        Route::get('/users/export', [UserController::class, 'export']);
        Route::get('/users/template', [UserController::class, 'template']);
        Route::post('/users/import', [UserController::class, 'import']);
        Route::apiResource('users', UserController::class);
    });

    // ------------------------------------------------------------------
    // Classrooms
    // ------------------------------------------------------------------
    // Read: all roles
    Route::get('/classrooms', [ClassroomController::class, 'index']);
    Route::get('/classrooms/{id}', [ClassroomController::class, 'show']);

    // Write: admin only
    Route::middleware('role:admin')->group(function () {
        Route::post('/classrooms', [ClassroomController::class, 'store']);
        Route::put('/classrooms/{id}', [ClassroomController::class, 'update']);
        Route::delete('/classrooms/{id}', [ClassroomController::class, 'destroy']);
    });

    // ------------------------------------------------------------------
    // Students
    // ------------------------------------------------------------------
    // Read: all roles (scoped in controller by role)
    Route::get('/students', [StudentController::class, 'index']);
    Route::get('/students/export', [StudentController::class, 'export']);
    Route::get('/students/template', [StudentController::class, 'template']);
    Route::get('/students/{id}', [StudentController::class, 'show']);

    // Write: admin only
    Route::middleware('role:admin')->group(function () {
        Route::post('/students', [StudentController::class, 'store']);
        Route::post('/students/import', [StudentController::class, 'import']);
        Route::put('/students/{id}', [StudentController::class, 'update']);
        Route::delete('/students/{id}', [StudentController::class, 'destroy']);
    });

    // ------------------------------------------------------------------
    // Categories
    // ------------------------------------------------------------------
    // Read: all roles
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/categories/{id}', [CategoryController::class, 'show']);

    // Write: admin only
    Route::middleware('role:admin')->group(function () {
        Route::post('/categories', [CategoryController::class, 'store']);
        Route::put('/categories/{id}', [CategoryController::class, 'update']);
        Route::delete('/categories/{id}', [CategoryController::class, 'destroy']);
    });

    // ------------------------------------------------------------------
    // Violation Rules
    // ------------------------------------------------------------------
    // Read: all roles
    Route::get('/violation-rules', [ViolationRuleController::class, 'index']);
    Route::get('/violation-rules/{id}', [ViolationRuleController::class, 'show']);

    // Write: admin only
    Route::middleware('role:admin')->group(function () {
        Route::post('/violation-rules', [ViolationRuleController::class, 'store']);
        Route::put('/violation-rules/{id}', [ViolationRuleController::class, 'update']);
        Route::delete('/violation-rules/{id}', [ViolationRuleController::class, 'destroy']);
    });

    // ------------------------------------------------------------------
    // Punishments
    // ------------------------------------------------------------------
    // Read: all roles (scoped in controller by role)
    Route::get('/punishments', [PunishmentController::class, 'index']);
    Route::get('/punishments/export', [PunishmentController::class, 'export']);
    Route::get('/punishments/template', [PunishmentController::class, 'template']);
    Route::get('/punishments/{id}', [PunishmentController::class, 'show']);

    // Create & Import: pc1, subject, and admin
    Route::middleware('role:pc1,subject,admin')->group(function () {
        Route::post('/punishments', [PunishmentController::class, 'store']);
        Route::post('/punishments/import', [PunishmentController::class, 'import']);
    });

    // Delete: pc1, subject, and admin (policy handles ownership check)
    Route::delete('/punishments/{id}', [PunishmentController::class, 'destroy']);

    // ------------------------------------------------------------------
    // Notifications (Cross-role alerts)
    // ------------------------------------------------------------------
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::delete('/notifications/{id}', [NotificationController::class, 'destroy']);

    // ------------------------------------------------------------------
    // System Settings (Academic Year, etc.)
    // ------------------------------------------------------------------
    Route::middleware('role:admin')->group(function () {
        Route::put('/settings', [SettingController::class, 'update']);
        Route::post('/settings', [SettingController::class, 'update']);
    });
});
