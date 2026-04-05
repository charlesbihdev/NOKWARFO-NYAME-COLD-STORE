<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('daily_stock_snapshots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->onDelete('cascade');
            $table->date('date');
            $table->integer('available_stock')->nullable();
            $table->integer('received_today')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['product_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_stock_snapshots');
    }
};
