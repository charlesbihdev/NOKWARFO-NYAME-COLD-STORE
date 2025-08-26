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
        Schema::create('trip_estimations', function (Blueprint $table) {
            $table->id();
            $table->date('trip_date');
            $table->string('description')->nullable();
            $table->string('location')->nullable();
            
            // Auto-calculated totals
            $table->decimal('total_cost_price', 15, 2)->default(0);
            $table->decimal('total_selling_price', 15, 2)->default(0);
            $table->decimal('gross_profit', 15, 2)->default(0);
            
            // Trip expenses
            $table->decimal('transportation_cost', 15, 2)->default(0);
            $table->decimal('other_expenses', 15, 2)->default(0);
            $table->decimal('total_expenses', 15, 2)->default(0);
            
            // Final calculations
            $table->decimal('net_profit', 15, 2)->default(0);
            
            $table->text('notes')->nullable();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('trip_estimations');
    }
};