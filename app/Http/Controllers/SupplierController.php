<?php

namespace App\Http\Controllers;

use App\Models\Supplier;
use App\Models\SupplierTransaction;
use App\Models\SupplierTransactionItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Carbon\Carbon;

class SupplierController extends Controller
{
    public function index()
    {
        $suppliers = Supplier::with(['latestTransaction'])
            ->withCount('transactions')
            ->orderByDesc('created_at')
            ->get()
            ->map(function ($supplier) {
                return [
                    'id' => $supplier->id,
                    'name' => $supplier->name,
                    'contact_person' => $supplier->contact_person,
                    'phone' => $supplier->phone,
                    'email' => $supplier->email,
                    'address' => $supplier->address,
                    'additional_info' => $supplier->additional_info,
                    'is_active' => $supplier->is_active,
                    'current_balance' => $supplier->current_balance,
                    'total_purchases' => $supplier->total_purchases,
                    'total_payments' => $supplier->total_payments,
                    'last_transaction_date' => $supplier->last_transaction_date,
                    'transactions_count' => $supplier->transactions_count,
                    'balance_status' => $supplier->balance_status,
                    'has_outstanding_debt' => $supplier->hasOutstandingDebt(),
                ];
            });

        return Inertia::render('suppliers', [
            'suppliers' => $suppliers,
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

        return back()->with([
            'success' => 'Supplier created successfully',
        ]);
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

        return back()->with([
            'success' => 'Supplier updated successfully',
        ]);
    }

    public function destroy(Supplier $supplier)
    {
        // Check if supplier has outstanding debt
        if ($supplier->hasOutstandingDebt()) {
            return back()->withErrors([
                'error' => 'Cannot delete supplier with outstanding debt. Current balance: GHC ' . number_format($supplier->current_balance, 2)
            ]);
        }

        $supplier->delete();
        return back()->with([
            'success' => 'Supplier deleted successfully',
        ]);
    }

    // Transaction Management Methods
    public function transactions(Supplier $supplier)
    {
        $transactions = $supplier->transactions()
            ->with('items')
            ->paginate(15);

        // dd($transactions);

        return Inertia::render('SupplierTransactions', [
            'supplier' => $supplier,
            'transactions' => $transactions,
        ]);
    }

    public function storeTransaction(Request $request, Supplier $supplier)
    {
        $validated = $request->validate([
            'transaction_date' => 'required|date',
            'reference_number' => 'nullable|string|max:100',
            'type' => 'required|in:purchase,payment,adjustment',
            'payment_amount' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:1000',
            'items' => 'required_if:type,purchase|array|min:1',
            'items.*.product_name' => 'required_if:type,purchase|string|max:255',
            'items.*.quantity' => 'required_if:type,purchase|integer|min:1',
            'items.*.unit_price' => 'required_if:type,purchase|numeric|min:1',
        ]);

        DB::transaction(function () use ($validated, $supplier) {
            $previousBalance = $supplier->current_balance;
            $totalAmount = 0;
            $paymentAmount = $validated['payment_amount'] ?? 0;

            // Calculate total amount for purchase transactions
            if ($validated['type'] === 'purchase' && isset($validated['items'])) {
                $totalAmount = collect($validated['items'])->sum(function ($item) {
                    return $item['quantity'] * $item['unit_price'];
                });
            }

            // Calculate new balance
            $currentBalance = $previousBalance;
            if ($validated['type'] === 'purchase') {
                $currentBalance += $totalAmount;
            }
            $currentBalance -= $paymentAmount;

            // Create transaction record
            $transaction = SupplierTransaction::create([
                'supplier_id' => $supplier->id,
                'transaction_date' => $validated['transaction_date'],
                'reference_number' => $validated['reference_number'],
                'previous_balance' => $previousBalance,
                'total_amount' => $totalAmount,
                'payment_amount' => $paymentAmount,
                'current_balance' => $currentBalance,
                'notes' => $validated['notes'],
                'type' => $validated['type'],
            ]);

            // Create transaction items for purchases
            if ($validated['type'] === 'purchase' && isset($validated['items'])) {
                foreach ($validated['items'] as $item) {
                    SupplierTransactionItem::create([
                        'supplier_transaction_id' => $transaction->id,
                        'product_name' => $item['product_name'],
                        'quantity' => $item['quantity'],
                        'unit_price' => $item['unit_price'],
                        'total_amount' => $item['quantity'] * $item['unit_price'],
                    ]);
                }
            }

            // Update supplier totals
            $this->updateSupplierTotals($supplier);
        });

        return back()->with([
            'success' => 'Transaction recorded successfully',
        ]);
    }

    public function makePayment(Request $request, Supplier $supplier)
    {
        $validated = $request->validate([
            'payment_amount' => 'required|numeric|min:0.01',
            'transaction_date' => 'required|date',
            'reference_number' => 'nullable|string|max:100',
            'notes' => 'nullable|string|max:1000',
        ]);

        // Validate payment amount doesn't exceed debt
        if ($validated['payment_amount'] > $supplier->current_balance) {
            return back()->withErrors([
                'payment_amount' => 'Payment amount cannot exceed current debt of GHC ' . number_format($supplier->current_balance, 2)
            ]);
        }

        DB::transaction(function () use ($validated, $supplier) {
            $previousBalance = $supplier->current_balance;
            $currentBalance = $previousBalance - $validated['payment_amount'];

            SupplierTransaction::create([
                'supplier_id' => $supplier->id,
                'transaction_date' => $validated['transaction_date'],
                'reference_number' => $validated['reference_number'],
                'previous_balance' => $previousBalance,
                'total_amount' => 0,
                'payment_amount' => $validated['payment_amount'],
                'current_balance' => $currentBalance,
                'notes' => $validated['notes'],
                'type' => 'payment',
            ]);

            $this->updateSupplierTotals($supplier);
        });

        return back()->with([
            'success' => 'Payment recorded successfully',
        ]);
    }

    public function getTransactionSummary(Supplier $supplier)
    {
        $summary = [
            'total_transactions' => $supplier->transactions()->count(),
            'total_purchases' => $supplier->transactions()->purchases()->sum('total_amount'),
            'total_payments' => $supplier->transactions()->payments()->sum('payment_amount'),
            'current_balance' => $supplier->current_balance,
            'last_transaction_date' => $supplier->last_transaction_date,
            'recent_transactions' => $supplier->transactions()
                ->with('items')
                ->take(5)
                ->get(),
        ];

        return response()->json($summary);
    }

    // Helper Methods
    private function updateSupplierTotals(Supplier $supplier)
    {
        $totals = $supplier->transactions()
            ->selectRaw('
                SUM(total_amount) as total_purchases,
                SUM(payment_amount) as total_payments,
                MAX(transaction_date) as last_transaction_date
            ')
            ->first();

        $supplier->update([
            'total_purchases' => $totals->total_purchases ?? 0,
            'total_payments' => $totals->total_payments ?? 0,
            'current_balance' => ($totals->total_purchases ?? 0) - ($totals->total_payments ?? 0),
            'last_transaction_date' => $totals->last_transaction_date,
        ]);
    }

    public function toggleStatus(Supplier $supplier)
    {
        $supplier->update([
            'is_active' => !$supplier->is_active
        ]);

        return back()->with([
            'success' => 'Supplier status updated successfully',
        ]);
    }
}
