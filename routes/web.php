<?php

use Illuminate\Support\Facades\Route;
// use App\Http\Controllers\SaleController;
use App\Http\Controllers\ExpenseController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\BankTransferController;
use App\Http\Controllers\ProductPriceController;
use App\Http\Controllers\StockControlController;
use App\Http\Controllers\ProfitAnalysisController;
use App\Http\Controllers\BankTransferTagController;
use App\Http\Controllers\CreditCollectionController;
use App\Http\Controllers\DailyCollectionsController;
use App\Http\Controllers\DailySalesReportController;
use App\Http\Controllers\SalesTransactionController;
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
    Route::put('/stock-control/{id}', [StockControlController::class, 'update'])->name('stock-control.update');
    Route::resource('daily-sales-report', DailySalesReportController::class);
    Route::resource('credit-collection', CreditCollectionController::class);
    Route::resource('profit-analysis', ProfitAnalysisController::class);
    Route::resource('bank-transfers', BankTransferController::class);
    Route::resource('suppliers', SupplierController::class);
    Route::resource('customers', CustomerController::class);
    Route::resource('daily-collections', DailyCollectionsController::class);
    Route::resource('sales-transactions', SalesTransactionController::class);
    Route::post('/bank-transfer-tags', [BankTransferTagController::class, 'store'])->name('bank-transfer-tags.store');
    Route::delete('/bank-transfer-tags/{tag}', [BankTransferTagController::class, 'destroy'])->name('bank-transfer-tags.destroy');
    Route::resource('expenses', ExpenseController::class);


    // New debt management routes
    Route::get('/suppliers/{supplier}/transactions', [SupplierController::class, 'transactions'])->name('suppliers.transactions');
    Route::post('/suppliers/{supplier}/transactions', [SupplierController::class, 'storeTransaction'])->name('suppliers.transactions.store');
    Route::post('/suppliers/{supplier}/payments', [SupplierController::class, 'makePayment'])->name('suppliers.payments.store');
    Route::get('/suppliers/{supplier}/summary', [SupplierController::class, 'getTransactionSummary'])->name('suppliers.summary');
    Route::patch('/suppliers/{supplier}/toggle-status', [SupplierController::class, 'toggleStatus'])->name('suppliers.toggle-status');

    // Enhanced customer debt management routes
    Route::get('/customers/{customer}/transactions', [CustomerController::class, 'transactions'])->name('customers.transactions');
    Route::post('/customers/{customer}/payments', [CustomerController::class, 'storePayment'])->name('customers.payments.store');
    Route::get('/customers/{customer}/summary', [CustomerController::class, 'getTransactionSummary'])->name('customers.summary');
    Route::patch('/customers/{customer}/toggle-status', [CustomerController::class, 'toggleStatus'])->name('customers.toggle-status');
});

require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
