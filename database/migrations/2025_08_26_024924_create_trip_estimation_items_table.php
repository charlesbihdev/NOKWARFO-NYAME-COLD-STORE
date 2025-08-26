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
        Schema::create('trip_estimation_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('trip_estimation_id')->constrained()->onDelete('cascade');
            
            $table->string('product_name');
            $table->integer('quantity');
            $table->decimal('unit_cost_price', 10, 2);
            $table->decimal('total_cost_price', 10, 2); // qty * unit_cost
            $table->decimal('unit_selling_price', 10, 2);
            $table->decimal('total_selling_price', 10, 2); // qty * unit_selling
            $table->decimal('profit_per_item', 10, 2); // total_selling - total_cost
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('trip_estimation_items');
    }
};