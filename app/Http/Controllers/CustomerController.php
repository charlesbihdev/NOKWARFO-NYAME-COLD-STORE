<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Sale;
use App\Models\CreditCollection;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Carbon\Carbon;

class CustomerController extends Controller
{
    public function index()
    {
        $customers = Customer::with(['sales', 'creditCollections'])
            ->orderByDesc('created_at')
            ->get()
            ->map(function ($customer) {
                return [
                    'id' => $customer->id,
                    'name' => $customer->name,
                    'phone' => $customer->phone,
                    'email' => $customer->email,
                    'address' => $customer->address,
                    'is_active' => $customer->is_active,
                    'total_debt' => $customer->getDebt(),
                    'outstanding_balance' => $customer->getOutstandingBalance(),
                    'total_payments' => $customer->creditCollections->sum('amount_collected'),
                    'last_transaction_date' => $this->getLastTransactionDate($customer),
                    'has_outstanding_debt' => $customer->getOutstandingBalance() > 0,
                    'debt_status' => $this->getDebtStatus($customer),
                ];
            });

        return Inertia::render('customers', [
            'customers' => $customers,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string|max:500',
        ]);

        $validated['is_active'] = true;
        Customer::create($validated);

        return back()->with([
            'success' => 'Customer created successfully',
        ]);
    }

    public function update(Request $request, Customer $customer)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string|max:500',
        ]);

        $customer->update($validated);

        return back()->with([
            'success' => 'Customer updated successfully',
        ]);
    }

    public function destroy(Customer $customer)
    {
        // Check if customer has outstanding debt
        if ($customer->getOutstandingBalance() > 0) {
            return back()->withErrors([
                'error' => 'Cannot delete customer with outstanding debt. Current balance: GHC ' . number_format($customer->getOutstandingBalance(), 2)
            ]);
        }

        $customer->delete();
        return back()->with([
            'success' => 'Customer deleted successfully',
        ]);
    }

    public function transactions(Customer $customer)
    {
        // Get credit sales (debt transactions) with proper relationships
        $creditSales = $customer->sales()
            ->whereIn('payment_type', ['credit', 'partial'])
            ->with('saleItems')
            ->orderByDesc('created_at')
            ->get()
            ->map(function ($sale) {
                $debtAmount = $sale->payment_type === 'credit' 
                    ? $sale->total 
                    : ($sale->total - $sale->amount_paid);

                return [
                    'id' => 'sale_' . $sale->id,
                    'date' => $sale->created_at->format('Y-m-d'),
                    'type' => 'debt',
                    'reference' => $sale->transaction_id,
                    'description' => 'Sale: ' . $sale->saleItems->pluck('product_name')->join(', '),
                    'debt_amount' => $debtAmount,
                    'payment_amount' => 0,
                    'current_balance' => 0, // Will be calculated in running balance
                    'notes' => $sale->notes,
                    'sale_items' => $sale->saleItems->map(function ($item) {
                        return [
                            'product' => $item->product_name,
                            'quantity' => $item->quantity,
                            'unit_price' => $item->unit_selling_price,
                            'total' => $item->total,
                        ];
                    }),
                    'created_at' => $sale->created_at,
                ];
            });

        // Get payment transactions
        $payments = $customer->creditCollections()
            ->orderByDesc('created_at')
            ->get()
            ->map(function ($collection) {
                return [
                    'id' => 'payment_' . $collection->id,
                    'date' => $collection->created_at->format('Y-m-d'),
                    'type' => 'payment',
                    'reference' => 'PAY-' . $collection->id,
                    'description' => 'Payment received',
                    'debt_amount' => 0,
                    'payment_amount' => $collection->amount_collected,
                    'current_balance' => 0, // Will be calculated in running balance
                    'notes' => $collection->notes,
                    'created_at' => $collection->created_at,
                ];
            });

        // Combine and sort by created_at desc (newest first)
        $allTransactions = $creditSales->concat($payments)
            ->sortByDesc('created_at')
            ->values();

        // Calculate running balances properly
        $runningBalance = 0;
        $transactionsWithBalance = $allTransactions->reverse()->map(function ($transaction) use (&$runningBalance) {
            $transaction['previous_balance'] = $runningBalance;
            
            if ($transaction['type'] === 'debt') {
                // Debt increases the balance owed
                $runningBalance += $transaction['debt_amount'];
            } else {
                // Payment reduces the balance owed
                $runningBalance -= $transaction['payment_amount'];
            }
            
            $transaction['current_balance'] = $runningBalance;
            return $transaction;
        })->reverse()->values();

        // Manual pagination
        $perPage = 30;
        $page = request()->get('page', 1);
        $offset = ($page - 1) * $perPage;
        $paginatedTransactions = $transactionsWithBalance->slice($offset, $perPage)->values();

        // Create simple paginator
        $hasMore = $transactionsWithBalance->count() > ($offset + $perPage);
        $paginator = new \Illuminate\Pagination\Paginator(
            $paginatedTransactions,
            $perPage,
            $page,
            ['path' => request()->url(), 'query' => request()->query()]
        );
        $paginator->hasMorePagesWhen($hasMore);

        return Inertia::render('CustomerTransactions', [
            'customer' => [
                'id' => $customer->id,
                'name' => $customer->name,
                'phone' => $customer->phone,
                'email' => $customer->email,
                'address' => $customer->address,
                'total_debt' => $customer->getDebt(),
                'outstanding_balance' => $customer->getOutstandingBalance(),
                'total_payments' => $customer->creditCollections->sum('amount_collected'),
            ],
            'transactions' => $paginator,
        ]);
    }

    public function storePayment(Request $request, Customer $customer)
    {
        $validated = $request->validate([
            'amount_collected' => 'required|numeric|min:0.01',
            'notes' => 'nullable|string|max:1000',
        ]);

        // Validate payment amount doesn't exceed debt
        $outstandingBalance = $customer->getOutstandingBalance();
        if ($validated['amount_collected'] > $outstandingBalance) {
            return back()->withErrors([
                'amount_collected' => 'Payment amount cannot exceed current debt of GHC ' . number_format($outstandingBalance, 2)
            ]);
        }

        // Create the credit collection record
        CreditCollection::create([
            'customer_id' => $customer->id,
            'amount_collected' => $validated['amount_collected'],
            'notes' => $validated['notes'],
        ]);

        return back()->with([
            'success' => 'Payment recorded successfully',
        ]);
    }

    public function getTransactionSummary(Customer $customer)
    {
        $summary = [
            'total_debt' => $customer->getDebt(),
            'outstanding_balance' => $customer->getOutstandingBalance(),
            'total_payments' => $customer->creditCollections->sum('amount_collected'),
            'total_credit_sales' => $customer->sales()->where('payment_type', 'credit')->count(),
            'total_partial_sales' => $customer->sales()->where('payment_type', 'partial')->count(),
            'total_payments_made' => $customer->creditCollections()->count(),
            'last_payment_date' => $customer->creditCollections()->latest()->first()?->created_at,
            'last_credit_sale_date' => $customer->sales()
                ->whereIn('payment_type', ['credit', 'partial'])
                ->latest()
                ->first()?->created_at,
            'debt_status' => $this->getDebtStatus($customer),
            'recent_transactions' => $this->getRecentTransactions($customer),
        ];

        return response()->json($summary);
    }

    public function toggleStatus(Customer $customer)
    {
        $customer->update([
            'is_active' => !$customer->is_active
        ]);

        return back()->with([
            'success' => 'Customer status updated successfully',
        ]);
    }

    // Helper Methods
    private function getLastTransactionDate(Customer $customer)
    {
        $lastPayment = $customer->creditCollections()->latest()->first();
        $lastSale = $customer->sales()
            ->whereIn('payment_type', ['credit', 'partial'])
            ->latest()
            ->first();

        if ($lastPayment && $lastSale) {
            return $lastPayment->created_at > $lastSale->created_at 
                ? $lastPayment->created_at 
                : $lastSale->created_at;
        }

        return $lastPayment?->created_at ?? $lastSale?->created_at;
    }

    private function getDebtStatus(Customer $customer)
    {
        $outstandingBalance = $customer->getOutstandingBalance();
        $lastTransactionDate = $this->getLastTransactionDate($customer);

        if ($outstandingBalance == 0) {
            return 'paid';
        }

        if (!$lastTransactionDate) {
            return 'unknown';
        }

        $daysSinceLastTransaction = now()->diffInDays($lastTransactionDate);

        if ($daysSinceLastTransaction <= 30) {
            return 'current';
        } elseif ($daysSinceLastTransaction <= 60) {
            return 'overdue_30';
        } elseif ($daysSinceLastTransaction <= 90) {
            return 'overdue_60';
        } else {
            return 'overdue_90';
        }
    }

    private function getRecentTransactions(Customer $customer)
    {
        // Get last 5 transactions (sales and payments combined)
        $recentSales = $customer->sales()
            ->whereIn('payment_type', ['credit', 'partial'])
            ->with('saleItems')
            ->latest()
            ->take(3)
            ->get()
            ->map(function ($sale) {
                return [
                    'type' => 'sale',
                    'date' => $sale->created_at->format('Y-m-d'),
                    'amount' => $sale->payment_type === 'credit' 
                        ? $sale->total 
                        : ($sale->total - $sale->amount_paid),
                    'description' => 'Sale: ' . $sale->saleItems->pluck('product_name')->join(', '),
                ];
            });

        $recentPayments = $customer->creditCollections()
            ->latest()
            ->take(3)
            ->get()
            ->map(function ($payment) {
                return [
                    'type' => 'payment',
                    'date' => $payment->created_at->format('Y-m-d'),
                    'amount' => -$payment->amount_collected, // Negative to show as payment
                    'description' => 'Payment received',
                ];
            });

        return $recentSales->concat($recentPayments)
            ->sortByDesc('date')
            ->take(5)
            ->values();
    }
}
