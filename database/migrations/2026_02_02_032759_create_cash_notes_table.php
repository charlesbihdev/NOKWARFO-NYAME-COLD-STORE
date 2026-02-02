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
        Schema::create('cash_notes', function (Blueprint $table) {
            $table->id();
            $table->date('record_date');
            $table->integer('note_200')->default(0);
            $table->integer('note_100')->default(0);
            $table->integer('note_50')->default(0);
            $table->integer('note_20')->default(0);
            $table->integer('note_10')->default(0);
            $table->integer('note_5')->default(0);
            $table->decimal('total', 15, 2)->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique('record_date');
            $table->index('record_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cash_notes');
    }
};
