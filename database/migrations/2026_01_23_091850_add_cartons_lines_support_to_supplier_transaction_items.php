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
        Schema::table('supplier_credit_transaction_items', function (Blueprint $table) {
            // Add product_id as nullable foreign key
            $table->foreignId('product_id')->nullable()->after('supplier_credit_transaction_id')->constrained()->onDelete('set null');

            // Add lines_per_carton column (default 1) - snapshot at transaction time
            $table->integer('lines_per_carton')->default(1)->after('product_name');

            // Add lines column (default 0)
            $table->integer('lines')->default(0)->after('product_name');
        });

        // Rename quantity to cartons in separate statement
        Schema::table('supplier_credit_transaction_items', function (Blueprint $table) {
            $table->renameColumn('quantity', 'cartons');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Rename cartons back to quantity first
        Schema::table('supplier_credit_transaction_items', function (Blueprint $table) {
            $table->renameColumn('cartons', 'quantity');
        });

        Schema::table('supplier_credit_transaction_items', function (Blueprint $table) {
            $table->dropForeign(['product_id']);
            $table->dropColumn(['product_id', 'lines_per_carton', 'lines']);
        });
    }
};
