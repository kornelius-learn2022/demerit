<?php

namespace App\Providers;

use App\Models\Punishment;
use App\Models\Student;
use App\Models\User;
use App\Policies\PunishmentPolicy;
use App\Policies\StudentPolicy;
use App\Policies\UserPolicy;
use App\Services\StudentScoreService;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Bind StudentScoreService as a singleton so Redis connections are reused
        $this->app->singleton(StudentScoreService::class, function ($app) {
            return new StudentScoreService();
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Register policies explicitly
        Gate::policy(User::class, UserPolicy::class);
        Gate::policy(Student::class, StudentPolicy::class);
        Gate::policy(Punishment::class, PunishmentPolicy::class);
    }
}
