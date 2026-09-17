<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('password');
            $table->enum('role', ['admin', 'pc1', 'subject']);
            $table->foreignId('classroom_id')
                ->nullable()
                ->constrained('classrooms')
                ->nullOnDelete();
            $table->rememberToken();
            $table->timestamps();

            // Indexes
            $table->index('role');
            $table->index('classroom_id');
            $table->index(['role', 'classroom_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
