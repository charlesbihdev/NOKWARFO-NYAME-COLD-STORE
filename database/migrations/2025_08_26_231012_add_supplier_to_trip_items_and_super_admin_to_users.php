<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add supplier_name to trip_estimation_items table
        Schema::table('trip_estimation_items', function (Blueprint $table) {
            $table->string('supplier_name')->nullable()->after('product_name');
        });

        // Add is_super_admin to users table
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_super_admin')->default(false)->after('email');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove supplier_name from trip_estimation_items table
        Schema::table('trip_estimation_items', function (Blueprint $table) {
            $table->dropColumn('supplier_name');
        });

        // Remove is_super_admin from users table
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('is_super_admin');
        });
    }
};
