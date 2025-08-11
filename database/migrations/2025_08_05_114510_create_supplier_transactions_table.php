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
        Schema::create('supplier_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_id')->constrained()->onDelete('cascade');
            $table->date('transaction_date');
            $table->string('reference_number')->nullable(); // Optional reference for the transaction
            $table->decimal('previous_balance', 12, 2)->default(0); // Balance before this transaction
            $table->decimal('total_amount', 12, 2)->default(0); // Total purchase amount for this transaction
            $table->decimal('payment_amount', 12, 2)->default(0); // Payment made in this transaction
            $table->decimal('current_balance', 12, 2)->default(0); // Balance after this transaction
            $table->text('notes')->nullable();
            $table->enum('type', ['purchase', 'payment', 'adjustment'])->default('purchase');
            $table->timestamps();

            $table->index(['supplier_id', 'transaction_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('supplier_transactions');
    }
};
