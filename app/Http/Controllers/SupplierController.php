<?php

namespace App\Http\Controllers;

use App\Models\Supplier;
use App\Models\SupplierCreditTransaction;
use App\Services\SupplierCreditService;
use Illuminate\Http\Request;
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
        $suppliers = Supplier::with(['creditTransactions.payments'])
            ->orderBy('name')
            ->get()
            ->map(function ($supplier) {
                return $this->creditService->getSupplierSummary($supplier);
            });

        // Get products for dropdown
        $products = \App\Models\Product::select('id', 'name', 'unit_cost_price', 'unit_selling_price')
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
                'error' => 'Cannot delete supplier with outstanding debt. Current balance: ' . $supplier->formatted_total_outstanding
            ]);
        }

        $supplier->delete();
        return back()->with('success', 'Supplier deleted successfully');
    }

    public function toggleStatus(Supplier $supplier)
    {
        $supplier->update([
            'is_active' => !$supplier->is_active
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
            'payment_amount' => 'nullable|numeric|min:0',
            'payment_date' => 'nullable|date',
            'payment_method' => 'nullable|string|max:50',
        ]);

        try {
            // Calculate total amount from items
            $totalAmount = collect($validated['items'])->sum(function ($item) {
                return $item['quantity'] * $item['unit_price'];
            });

            // Calculate amount owed (total - payment)
            $paymentAmount = $validated['payment_amount'] ?? 0;
            $amountOwed = $totalAmount; // Amount owed is the total, not total minus payment

            $transaction = $this->creditService->createCreditTransaction([
                'supplier_id' => $supplier->id,
                'transaction_date' => $validated['transaction_date'],
                'description' => $validated['notes'] ?: 'Credit transaction',
                'amount_owed' => $amountOwed,
                'notes' => $validated['notes'],
                'items' => $validated['items'],
            ]);

            // Create payment record separately if payment amount > 0
            if ($paymentAmount > 0) {
                $this->creditService->makePayment([
                    'supplier_credit_transaction_id' => $transaction->id,
                    'supplier_id' => $supplier->id,
                    'payment_date' => $validated['payment_date'] ?? $validated['transaction_date'],
                    'payment_amount' => $paymentAmount,
                    'payment_method' => $validated['payment_method'] ?? null,
                    'notes' => $validated['notes'] ?? null,
                ]);
            }

            return back()->with('success', 'Credit transaction created successfully');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Failed to create transaction: ' . $e->getMessage()]);
        }
    }

    public function makePayment(Request $request, SupplierCreditTransaction $transaction)
    {
        $validated = $request->validate([
            'payment_amount' => 'required|numeric|min:0.01',
            'payment_date' => 'required|date',
            'payment_method' => 'nullable|string|max:50',
            'notes' => 'nullable|string|max:1000',
        ]);

        try {
            $payment = $this->creditService->makePayment([
                'supplier_credit_transaction_id' => $transaction->id,
                ...$validated
            ]);

            return back()->with('success', 'Payment recorded successfully');
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
        // Get filter parameters with current month defaults
        $startDate = request()->input('start_date');
        $endDate = request()->input('end_date');
        $statusFilter = request()->input('status', 'all');

        // Default to current month if no dates provided
        if (!$startDate && !$endDate) {
            $now = now();
            $startDate = $now->startOfMonth()->format('Y-m-d');
            $endDate = $now->endOfMonth()->format('Y-m-d');
        } elseif ($startDate && !$endDate) {
            $endDate = $startDate;
        } elseif (!$startDate && $endDate) {
            $startDate = $endDate;
        }

        // Validate and parse dates
        if ($startDate > $endDate) {
            [$startDate, $endDate] = [$endDate, $startDate];
        }

        // Build query with filters
        $query = $supplier->creditTransactions()
            ->with(['payments', 'items'])
            ->whereBetween('transaction_date', [$startDate, $endDate]);

        // Apply status filter
        if ($statusFilter !== 'all') {
            switch ($statusFilter) {
                case 'debt':
                    // Debt = not fully paid
                    $query->where('is_fully_paid', false);
                    break;
                case 'paid':
                    // Fully paid
                    $query->where('is_fully_paid', true);
                    break;
            }
        }

        // Order and paginate
        $transactions = $query
            ->orderByDesc('transaction_date')
            ->simplePaginate(20)
            ->through(function ($transaction) {
                return $this->creditService->getTransactionSummary($transaction);
            });

        // Get products for dropdown
        $products = \App\Models\Product::select('id', 'name', 'unit_cost_price', 'unit_selling_price')
            ->where('is_active', true)
            ->orderBy('name')
            ->get();

        return Inertia::render('SupplierTransactions', [
            'supplier' => $supplier,
            'transactions' => $transactions,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'products' => $products,
        ]);
    }
}
