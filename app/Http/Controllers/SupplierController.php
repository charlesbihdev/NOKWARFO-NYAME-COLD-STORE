<?php

namespace App\Http\Controllers;

use App\Models\Supplier;
use App\Models\SupplierCreditTransaction;
use App\Models\SupplierCreditTransactionItem;
use App\Models\SupplierDebt;
use App\Models\SupplierPayment;
use App\Services\SupplierCreditService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class SupplierController extends Controller
{
    protected $creditService;

    public function __construct(SupplierCreditService $creditService)
    {
        $this->creditService = $creditService;
    }

    public function index()
    {
        $suppliers = Supplier::where('is_active', true)
            ->with(['creditTransactions'])
            ->orderBy('name')
            ->get()
            ->map(function ($supplier) {
                $summary = $this->creditService->getSupplierSummary($supplier);
                $summary['transactions_count'] = $supplier->creditTransactions()->count();
                $summary['payments_count'] = $supplier->payments()->count();
                $summary['debts_count'] = $supplier->debts()->count();

                return $summary;
            });

        // Get products for dropdown
        $products = \App\Models\Product::select('id', 'name')
            ->where('is_active', true)
            ->orderBy('name')
            ->get();

        return Inertia::render('suppliers', [
            'suppliers' => $suppliers,
            'products' => $products,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'contact_person' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string|max:500',
            'additional_info' => 'nullable|string|max:1000',
        ]);

        $validated['is_active'] = true;
        Supplier::create($validated);

        return back()->with('success', 'Supplier created successfully');
    }

    public function update(Request $request, Supplier $supplier)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string|max:500',
            'additional_info' => 'nullable|string|max:1000',
        ]);

        $supplier->update($validated);

        return back()->with('success', 'Supplier updated successfully');
    }

    public function destroy(Supplier $supplier)
    {
        $hasRelatedData = $supplier->creditTransactions()->exists()
            || $supplier->payments()->exists()
            || $supplier->debts()->exists();

        if ($hasRelatedData) {
            $supplier->update(['is_active' => false]);

            return back()->with('success', 'Supplier archived successfully');
        }

        $supplier->delete();

        return back()->with('success', 'Supplier deleted successfully');
    }

    public function toggleStatus(Supplier $supplier)
    {
        $supplier->update([
            'is_active' => ! $supplier->is_active,
        ]);

        return back()->with('success', 'Supplier status updated successfully');
    }

    // Credit Transaction Management
    public function createCreditTransaction(Request $request, Supplier $supplier)
    {
        $validated = $request->validate([
            'transaction_date' => 'required|date',
            'notes' => 'nullable|string|max:1000',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'nullable|exists:products,id',
            'items.*.product_name' => 'required|string|max:255',
            'items.*.cartons' => 'required|integer|min:0',
            'items.*.lines' => 'required|integer|min:0',
            'items.*.lines_per_carton' => 'nullable|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
            'make_payment' => 'nullable|boolean',
            'payment_amount' => 'nullable|numeric|min:0',
            'payment_method' => 'nullable|string|max:50',
            'payment_notes' => 'nullable|string|max:1000',
        ]);

        try {
            // Calculate total amount from items
            $totalAmount = collect($validated['items'])->sum(function ($item) {
                $cartons = $item['cartons'] ?? 0;
                $lines = $item['lines'] ?? 0;
                $linesPerCarton = $item['lines_per_carton'] ?? 1;
                $totalQuantity = ($cartons * $linesPerCarton) + $lines;

                return $totalQuantity * $item['unit_price'];
            });

            // Create the credit transaction
            $transaction = $this->creditService->createCreditTransaction([
                'supplier_id' => $supplier->id,
                'transaction_date' => $validated['transaction_date'],
                'description' => $validated['notes'] ?: 'Credit transaction',
                'amount_owed' => $totalAmount,
                'notes' => $validated['notes'],
                'items' => $validated['items'],
            ]);

            // Create payment record if payment option is selected and amount > 0
            if (($validated['make_payment'] ?? false) && ($validated['payment_amount'] ?? 0) > 0) {
                $this->creditService->makePayment([
                    'transaction_id' => $transaction->id,
                    'supplier_id' => $supplier->id,
                    'payment_date' => $validated['transaction_date'],
                    'payment_amount' => $validated['payment_amount'],
                    'payment_method' => $validated['payment_method'] ?? 'cash',
                    'notes' => $validated['payment_notes'] ?? null,
                ]);
            }

            return back()->with('success', 'Credit transaction created successfully');
        } catch (\Exception $e) {
            Log::error('Failed to create transaction: ' . $e->getMessage());

            return back()->withErrors(['error' => 'Failed to create transaction: ' . $e->getMessage()]);
        }
    }

    public function makePayment(Request $request, Supplier $supplier)
    {
        $validated = $request->validate([
            'payment_amount' => 'required|numeric|min:0.01',
            'payment_date' => 'required|date',
            'payment_method' => 'nullable|string|max:50',
            'notes' => 'nullable|string|max:1000',
        ]);

        try {
            $payment = $this->creditService->makePayment([
                'supplier_id' => $supplier->id,
                ...$validated,
            ]);

            return back()->with('success', 'Payment recorded successfully');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function updatePayment(Request $request, SupplierPayment $payment)
    {
        $validated = $request->validate([
            'payment_date' => 'required|date',
            'payment_amount' => 'required|numeric|min:0.01',
            'payment_method' => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:1000',
        ]);

        try {
            $payment->update($validated);

            return back()->with('success', 'Payment updated successfully');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function deletePayment(SupplierPayment $payment)
    {
        try {
            $payment->delete();

            return back()->with('success', 'Payment deleted successfully');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function updateCreditTransaction(Request $request, SupplierCreditTransaction $transaction)
    {
        $validated = $request->validate([
            'transaction_date' => 'required|date',
            'notes' => 'nullable|string|max:1000',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'nullable|exists:products,id',
            'items.*.product_name' => 'required|string|max:255',
            'items.*.cartons' => 'required|integer|min:0',
            'items.*.lines' => 'required|integer|min:0',
            'items.*.lines_per_carton' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
        ]);

        try {
            // Calculate total amount from items
            $totalAmount = collect($validated['items'])->sum(function ($item) {
                $cartons = $item['cartons'] ?? 0;
                $lines = $item['lines'] ?? 0;
                $linesPerCarton = $item['lines_per_carton'] ?? 1;
                $totalQuantity = ($cartons * $linesPerCarton) + $lines;

                return $totalQuantity * $item['unit_price'];
            });

            // Auto-generate description from items
            $description = 'Credit purchase: ' . collect($validated['items'])
                ->map(function ($item) {
                    $cartons = $item['cartons'] ?? 0;
                    $lines = $item['lines'] ?? 0;
                    $linesPerCarton = $item['lines_per_carton'] ?? 1;
                    $totalQuantity = ($cartons * $linesPerCarton) + $lines;

                    return $item['product_name'] . ' (Qty: ' . $totalQuantity . ')';
                })
                ->join(', ');

            $this->creditService->updateCreditTransaction($transaction, [
                'transaction_date' => $validated['transaction_date'],
                'description' => $description,
                'notes' => $validated['notes'],
                'items' => $validated['items'],
            ]);

            return back()->with('success', 'Transaction updated successfully');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function deleteCreditTransaction(SupplierCreditTransaction $transaction)
    {
        try {
            $this->creditService->deleteCreditTransaction($transaction);

            return back()->with('success', 'Transaction deleted successfully');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function updateTransactionItem(Request $request, SupplierCreditTransaction $transaction, SupplierCreditTransactionItem $item)
    {
        // Ensure the item belongs to the transaction
        if ($item->supplier_credit_transaction_id !== $transaction->id) {
            return back()->withErrors(['error' => 'Item does not belong to this transaction']);
        }

        $validated = $request->validate([
            'product_id' => 'nullable|exists:products,id',
            'product_name' => 'required|string|max:255',
            'cartons' => 'required|integer|min:0',
            'lines' => 'required|integer|min:0',
            'lines_per_carton' => 'required|integer|min:1',
            'unit_price' => 'required|numeric|min:0',
        ]);

        // If product_id is provided, get product details
        if (! empty($validated['product_id'])) {
            $product = \App\Models\Product::find($validated['product_id']);
            if ($product) {
                $validated['product_name'] = $product->name;
                $validated['lines_per_carton'] = $product->lines_per_carton ?? 1;
            }
        }

        $item->update($validated);

        // Recalculate transaction total
        $newTotal = $transaction->items->sum('total_amount');
        $transaction->update(['amount_owed' => $newTotal]);

        return back()->with('success', 'Item updated successfully');
    }

    public function deleteTransactionItem(SupplierCreditTransaction $transaction, SupplierCreditTransactionItem $item)
    {
        // Ensure the item belongs to the transaction
        if ($item->supplier_credit_transaction_id !== $transaction->id) {
            return back()->withErrors(['error' => 'Item does not belong to this transaction']);
        }

        // Prevent deleting the last item
        if ($transaction->items()->count() <= 1) {
            return back()->withErrors(['error' => 'Cannot delete the last item. Delete the entire transaction instead.']);
        }

        $item->delete();

        // Recalculate transaction total
        $newTotal = $transaction->items->sum('total_amount');
        $transaction->update(['amount_owed' => $newTotal]);

        return back()->with('success', 'Item deleted successfully');
    }

    // Debt Management
    public function storeDebt(Request $request, Supplier $supplier)
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'debt_date' => 'required|date',
            'description' => 'nullable|string|max:500',
            'notes' => 'nullable|string|max:1000',
        ]);

        $supplier->debts()->create($validated);

        return back()->with([
            'success' => 'Debt recorded successfully',
        ]);
    }

    public function updateDebt(Request $request, Supplier $supplier, SupplierDebt $debt)
    {
        // Ensure debt belongs to this supplier
        if ($debt->supplier_id !== $supplier->id) {
            return back()->withErrors([
                'error' => 'Debt does not belong to this supplier',
            ]);
        }

        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'debt_date' => 'required|date',
            'description' => 'nullable|string|max:500',
            'notes' => 'nullable|string|max:1000',
        ]);

        $debt->update($validated);

        return back()->with([
            'success' => 'Debt updated successfully',
        ]);
    }

    public function destroyDebt(Supplier $supplier, SupplierDebt $debt)
    {
        // Ensure debt belongs to this supplier
        if ($debt->supplier_id !== $supplier->id) {
            return back()->withErrors([
                'error' => 'Debt does not belong to this supplier',
            ]);
        }

        $debt->delete();

        return back()->with([
            'success' => 'Debt deleted successfully',
        ]);
    }

    public function transactions(Supplier $supplier)
    {
        // Get filter parameters
        $startDate = request()->input('start_date');
        $endDate = request()->input('end_date');

        // Build query - show all transactions if no date range specified
        $query = $supplier->creditTransactions()->with(['items']);

        // Apply date filter only if both dates are provided
        if ($startDate && $endDate) {
            // Validate and parse dates
            if ($startDate > $endDate) {
                [$startDate, $endDate] = [$endDate, $startDate];
            }
            $query->whereBetween('transaction_date', [$startDate, $endDate]);
        }

        // Order and paginate - use transaction_date DESC to show newest first, created_at as tie-breaker
        // Calculations remain correct as they're based on date comparisons, not query order
        $transactions = $query
            ->orderByDesc('transaction_date')
            ->orderByDesc('created_at')
            ->paginate(20)
            ->through(function ($transaction) use ($startDate, $endDate) {
                return $this->creditService->getTransactionSummary($transaction, $startDate, $endDate);
            });

        // Get products for dropdown
        $products = \App\Models\Product::select('id', 'name')
            ->where('is_active', true)
            ->orderBy('name')
            ->get();

        // Get payments for the supplier (filtered by date if specified)
        $paymentsQuery = $supplier->payments();
        if ($startDate && $endDate) {
            $paymentsQuery->whereBetween('payment_date', [$startDate, $endDate]);
        }
        // Order by payment_date DESC to show newest first, created_at as tie-breaker
        // Calculations remain correct as they're based on date comparisons, not query order
        $payments = $paymentsQuery->orderByDesc('payment_date')->orderByDesc('created_at')->get()
            ->map(function ($payment) use ($startDate, $endDate) {
                return $this->creditService->getPaymentSummary($payment, $startDate, $endDate);
            });

        // Get historical debts for the supplier (filtered by date if specified)
        $debtsQuery = $supplier->debts();
        if ($startDate && $endDate) {
            $debtsQuery->whereBetween('debt_date', [$startDate, $endDate]);
        }
        $debts = $debtsQuery->orderByDesc('debt_date')->orderByDesc('created_at')->get()
            ->map(function ($debt) {
                return [
                    'id' => 'debt_' . $debt->id,
                    'debt_id' => $debt->id,
                    'date' => $debt->debt_date->format('Y-m-d'),
                    'type' => 'historical_debt',
                    'amount' => $debt->amount,
                    'description' => $debt->description ?? 'Historical debt',
                    'notes' => $debt->notes,
                ];
            });

        // Calculate filtered totals based on date range
        $filteredTransactionsQuery = $supplier->creditTransactions();
        $filteredPaymentsQuery = $supplier->payments();
        $filteredDebtsQuery = $supplier->debts();

        // Apply date filters to transactions, payments, and debts
        if ($startDate && $endDate) {
            $filteredTransactionsQuery->whereBetween('transaction_date', [$startDate, $endDate]);
            $filteredPaymentsQuery->whereBetween('payment_date', [$startDate, $endDate]);
            $filteredDebtsQuery->whereBetween('debt_date', [$startDate, $endDate]);
        }

        $filteredHistoricalDebt = $filteredDebtsQuery->sum('amount');
        $filteredTransactionDebt = $filteredTransactionsQuery->sum('amount_owed');
        $filteredTotalOwed = $filteredHistoricalDebt + $filteredTransactionDebt;
        $filteredTotalPayments = $filteredPaymentsQuery->sum('payment_amount');
        $filteredOutstanding = max(0, $filteredTotalOwed - $filteredTotalPayments);
        $filteredTransactionsCount = $filteredTransactionsQuery->count();

        // Ensure supplier data is fresh and includes computed attributes
        $supplierData = [
            'id' => $supplier->id,
            'name' => $supplier->name,
            'contact_person' => $supplier->contact_person,
            'phone' => $supplier->phone,
            'email' => $supplier->email,
            'address' => $supplier->address,
            'is_active' => $supplier->is_active,
            'total_owed' => $filteredTotalOwed,
            'total_payments_made' => $filteredTotalPayments,
            'total_outstanding' => $filteredOutstanding,
            'transactions_count' => $filteredTransactionsCount,
        ];

        return Inertia::render('SupplierTransactions', [
            'supplier' => $supplierData,
            'transactions' => $transactions,
            'payments' => $payments,
            'debts' => $debts,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'products' => $products,
        ]);
    }
}
