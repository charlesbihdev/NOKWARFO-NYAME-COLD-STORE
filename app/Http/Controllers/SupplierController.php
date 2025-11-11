<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use App\Models\Supplier;
use Illuminate\Http\Request;
use App\Models\SupplierPayment;
use App\Services\SupplierCreditService;
use App\Models\SupplierCreditTransaction;

class SupplierController extends Controller
{
    protected $creditService;

    public function __construct(SupplierCreditService $creditService)
    {
        $this->creditService = $creditService;
    }

    public function index()
    {
        $suppliers = Supplier::with(['creditTransactions'])
            ->orderBy('name')
            ->get()
            ->map(function ($supplier) {
                return $this->creditService->getSupplierSummary($supplier);
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
        // Check if supplier has outstanding debt
        if ($supplier->has_outstanding_debt) {
            return back()->withErrors([
                'error' => 'Cannot delete supplier with outstanding debt. Current balance: ' . $supplier->formatted_total_outstanding,
            ]);
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
            'items.*.product_name' => 'required|string|max:255',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0.01',
            'make_payment' => 'nullable|boolean',
            'payment_amount' => 'nullable|numeric|min:0',
            'payment_method' => 'nullable|string|max:50',
            'payment_notes' => 'nullable|string|max:1000',
        ]);

        try {
            // Calculate total amount from items
            $totalAmount = collect($validated['items'])->sum(function ($item) {
                return $item['quantity'] * $item['unit_price'];
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
            'items.*.product_name' => 'required|string|max:255',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0.01',
        ]);

        try {
            // Calculate total amount from items
            $totalAmount = collect($validated['items'])->sum(function ($item) {
                return $item['quantity'] * $item['unit_price'];
            });

            // Auto-generate description from items
            $description = 'Credit purchase: ' . collect($validated['items'])
                ->map(function ($item) {
                    return $item['product_name'] . ' (Qty: ' . $item['quantity'] . ')';
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

        // Calculate filtered totals based on date range
        $filteredTransactionsQuery = $supplier->creditTransactions();
        $filteredPaymentsQuery = $supplier->payments();

        // Apply date filters to both transactions and payments
        if ($startDate && $endDate) {
            $filteredTransactionsQuery->whereBetween('transaction_date', [$startDate, $endDate]);
            $filteredPaymentsQuery->whereBetween('payment_date', [$startDate, $endDate]);
        }

        $filteredTotalOwed = $filteredTransactionsQuery->sum('amount_owed');
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
            'start_date' => $startDate,
            'end_date' => $endDate,
            'products' => $products,
        ]);
    }
}
