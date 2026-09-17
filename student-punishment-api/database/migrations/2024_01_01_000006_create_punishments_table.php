<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('punishments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')
                ->constrained('students')
                ->cascadeOnDelete();
            $table->foreignId('violation_rule_id')
                ->constrained('violation_rules')
                ->restrictOnDelete();
            $table->foreignId('teacher_id')
                ->constrained('users')
                ->restrictOnDelete();
            $table->enum('teacher_role', ['pc1', 'subject']);
            $table->text('notes')->nullable();
            $table->date('punishment_date');
            $table->unsignedInteger('point_deducted'); // snapshot at time of recording
            $table->timestamps();

            // Individual indexes
            $table->index('student_id');
            $table->index('teacher_id');
            $table->index('punishment_date');
            $table->index('teacher_role');

            // Composite indexes
            $table->index(['student_id', 'teacher_role']);
            $table->index(['teacher_id', 'punishment_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('punishments');
    }
};
