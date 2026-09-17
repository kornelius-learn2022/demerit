<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'success' => true,
        'message' => 'Student Punishment Scoring System API',
        'version' => '1.0.0',
    ]);
});
