<?php

use App\Http\Controllers\BankTransferController;
// use App\Http\Controllers\SaleController;
use App\Http\Controllers\BankTransferTagController;
use App\Http\Controllers\CashNoteController;
use App\Http\Controllers\CreditCollectionController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\DailyCollectionsController;
use App\Http\Controllers\DailySalesReportController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ExpenseController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ProfitAnalysisController;
use App\Http\Controllers\SalesTransactionController;
use App\Http\Controllers\StockControlController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\TripEstimationController;
use Illuminate\Support\Facades\Route;

// use App\Http\Controllers\ProductManagementController;

Route::get('/', function () {
    return redirect()->route('login');
})->name('home');

Route::get('/home', function () {
    return redirect()->route('dashboard.index');
})->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::resource('dashboard', DashboardController::class);
    Route::resource('products', ProductController::class);
    Route::resource('stock-control', StockControlController::class);
    Route::post('/stock-control/adjust', [StockControlController::class, 'adjust'])->name('stock-control.adjust');
    Route::put('/stock-control/adjustment/{id}', [StockControlController::class, 'updateAdjustment'])->name('stock-control.updateAdjustment');
    Route::resource('daily-sales-report', DailySalesReportController::class);
    Route::resource('credit-collection', CreditCollectionController::class);
    Route::resource('profit-analysis', ProfitAnalysisController::class);
    Route::post('/profit-analysis/recalculate', [ProfitAnalysisController::class, 'recalculate'])->name('profit-analysis.recalculate');
    Route::resource('bank-transfers', BankTransferController::class);
    Route::resource('cash-notes', CashNoteController::class);
    Route::resource('suppliers', SupplierController::class);
    Route::resource('customers', CustomerController::class);
    Route::resource('daily-collections', DailyCollectionsController::class);
    Route::resource('sales-transactions', SalesTransactionController::class);
    Route::post('/bank-transfer-tags', [BankTransferTagController::class, 'store'])->name('bank-transfer-tags.store');
    Route::put('/bank-transfer-tags/{tag}', [BankTransferTagController::class, 'update'])->name('bank-transfer-tags.update');
    Route::delete('/bank-transfer-tags/{tag}', [BankTransferTagController::class, 'destroy'])->name('bank-transfer-tags.destroy');
    Route::resource('expenses', ExpenseController::class);
    Route::resource('trip-estimations', TripEstimationController::class);

    // New debt management routes
    Route::get('/suppliers/{supplier}/transactions', [SupplierController::class, 'transactions'])->name('suppliers.transactions');
    Route::get('/debug/supplier/{id}/transactions', function ($id) {
        $supplier = \App\Models\Supplier::find($id);
        $transactions = \App\Models\SupplierCreditTransaction::where('supplier_id', $id)->get();

        return response()->json([
            'supplier' => $supplier ? $supplier->only(['id', 'name']) : null,
            'transactions_count' => $transactions->count(),
            'transactions' => $transactions->map(function ($t) {
                return [
                    'id' => $t->id,
                    'transaction_date' => $t->transaction_date,
                    'amount_owed' => $t->amount_owed,
                    'description' => $t->description,
                ];
            }),
        ]);
    });
    Route::post('/suppliers/{supplier}/credit-transactions', [SupplierController::class, 'createCreditTransaction'])->name('suppliers.create-credit-transaction');
    Route::put('/suppliers/credit-transactions/{transaction}', [SupplierController::class, 'updateCreditTransaction'])->name('suppliers.update-credit-transaction');
    Route::delete('/suppliers/credit-transactions/{transaction}', [SupplierController::class, 'deleteCreditTransaction'])->name('suppliers.delete-credit-transaction');
    Route::put('/suppliers/credit-transactions/{transaction}/items/{item}', [SupplierController::class, 'updateTransactionItem'])->name('suppliers.update-transaction-item');
    Route::delete('/suppliers/credit-transactions/{transaction}/items/{item}', [SupplierController::class, 'deleteTransactionItem'])->name('suppliers.delete-transaction-item');
    Route::post('/suppliers/{supplier}/payments', [SupplierController::class, 'makePayment'])->name('suppliers.make-payment');
    Route::put('/suppliers/payments/{payment}', [SupplierController::class, 'updatePayment'])->name('suppliers.update-payment');
    Route::delete('/suppliers/payments/{payment}', [SupplierController::class, 'deletePayment'])->name('suppliers.delete-payment');
    Route::post('/suppliers/{supplier}/debts', [SupplierController::class, 'storeDebt'])->name('suppliers.debts.store');
    Route::put('/suppliers/{supplier}/debts/{debt}', [SupplierController::class, 'updateDebt'])->name('suppliers.debts.update');
    Route::delete('/suppliers/{supplier}/debts/{debt}', [SupplierController::class, 'destroyDebt'])->name('suppliers.debts.destroy');
    Route::patch('/suppliers/{supplier}/toggle-status', [SupplierController::class, 'toggleStatus'])->name('suppliers.toggle-status');

    // Enhanced customer debt management routes
    Route::get('/customers/{customer}/transactions', [CustomerController::class, 'transactions'])->name('customers.transactions');
    Route::post('/customers/{customer}/payments', [CustomerController::class, 'storePayment'])->name('customers.payments.store');
    Route::put('/customers/payments/{payment}', [CustomerController::class, 'updatePayment'])->name('customers.payments.update');
    Route::delete('/customers/payments/{payment}', [CustomerController::class, 'deletePayment'])->name('customers.payments.delete');
    Route::post('/customers/{customer}/debts', [CustomerController::class, 'storeDebt'])->name('customers.debts.store');
    Route::put('/customers/{customer}/debts/{debt}', [CustomerController::class, 'updateDebt'])->name('customers.debts.update');
    Route::delete('/customers/{customer}/debts/{debt}', [CustomerController::class, 'destroyDebt'])->name('customers.debts.destroy');
    Route::get('/customers/{customer}/summary', [CustomerController::class, 'getTransactionSummary'])->name('customers.summary');
    Route::patch('/customers/{customer}/toggle-status', [CustomerController::class, 'toggleStatus'])->name('customers.toggle-status');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
