<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Configure database timeouts to prevent execution time errors
        if (config('database.default') === 'sqlite') {
            \DB::connection()->getPdo()->setAttribute(\PDO::ATTR_TIMEOUT, 60);
            \DB::connection()->getPdo()->exec('PRAGMA busy_timeout = 60000');
            \DB::connection()->getPdo()->exec('PRAGMA journal_mode = WAL');
            \DB::connection()->getPdo()->exec('PRAGMA synchronous = NORMAL');
        }
    }
}
