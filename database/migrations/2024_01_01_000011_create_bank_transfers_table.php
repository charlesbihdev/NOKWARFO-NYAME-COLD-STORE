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
        Schema::create('bank_transfers', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            $table->decimal('previous_balance', 15, 2);
            $table->decimal('credit', 15, 2)->default(0);
            $table->decimal('total_balance', 15, 2);
            $table->decimal('debit', 15, 2)->default(0);
            $table->string('debit_tag')->nullable();
            $table->decimal('current_balance', 15, 2);
            $table->text('custom_tag')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('user_id')->constrained()->onDelete('cascade'); // Who recorded the transfer
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bank_transfers');
    }
}; 