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
        // Drop existing tables if they exist (in case of partial migration)
        Schema::dropIfExists('supplier_payments');
        Schema::dropIfExists('supplier_credit_transaction_items');
        Schema::dropIfExists('supplier_credit_transactions');

        // Create supplier_credit_transactions table
        Schema::create('supplier_credit_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_id')->constrained()->onDelete('cascade');
            $table->date('transaction_date');
            $table->text('description')->nullable();
            $table->decimal('amount_owed', 12, 2); // Total amount owed for this transaction
            $table->boolean('is_fully_paid')->default(false); // Track if transaction is fully paid
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['supplier_id', 'transaction_date']);
        });

        // Create supplier_credit_transaction_items table
        Schema::create('supplier_credit_transaction_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_credit_transaction_id')->constrained('supplier_credit_transactions', 'id', 'fk_supplier_items_transaction')->onDelete('cascade');
            $table->string('product_name');
            $table->integer('quantity');
            $table->decimal('unit_price', 12, 2);
            $table->decimal('total_amount', 12, 2);
            $table->timestamps();
        });

        // Create supplier_payments table
        Schema::create('supplier_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_credit_transaction_id')->constrained('supplier_credit_transactions', 'id', 'fk_supplier_payments_transaction')->onDelete('cascade');
            $table->foreignId('supplier_id')->constrained('suppliers', 'id', 'fk_supplier_payments_supplier')->onDelete('cascade');
            $table->date('payment_date');
            $table->decimal('payment_amount', 12, 2);
            $table->string('payment_method')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['supplier_id', 'payment_date']);
            $table->index('supplier_credit_transaction_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('supplier_payments');
        Schema::dropIfExists('supplier_credit_transaction_items');
        Schema::dropIfExists('supplier_credit_transactions');
    }
};
