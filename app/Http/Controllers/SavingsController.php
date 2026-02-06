<?php

namespace App\Http\Controllers;

use App\Models\Saving;
use App\Models\SavingsTransaction;
use Illuminate\Http\Request;
use Illuminate\Pagination\Paginator;
use Inertia\Inertia;
use Inertia\Response;

class SavingsController extends Controller
{
    /**
     * Display a listing of all savings.
     */
    public function index(Request $request): Response
    {
        $search = $request->query('search');

        $savingsQuery = Saving::query()
            ->when($search, function ($query, $search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            })
            ->orderByDesc('created_at');

        $savings = $savingsQuery->paginate(15)->through(function ($saving) {
            return [
                'id' => $saving->id,
                'name' => $saving->name,
                'description' => $saving->description,
                'date' => $saving->date->format('Y-m-d'),
                'is_active' => $saving->is_active,
                'total_credits' => $saving->getTotalCredits(),
                'total_debits' => $saving->getTotalDebits(),
                'balance' => $saving->getBalance(),
                'balance_status' => $saving->getBalanceStatus(),
            ];
        });

        $allSavings = Saving::all();
        $totalBalance = $allSavings->sum(fn($s) => $s->getBalance());

        return Inertia::render('savings', [
            'savings' => $savings,
            'filters' => [
                'search' => $search,
            ],
            'summary' => [
                'total_accounts' => $allSavings->count(),
                'total_balance' => $totalBalance,
            ],
        ]);
    }

    /**
     * Store a newly created savings.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:savings,name',
            'description' => 'nullable|string|max:1000',
            'date' => 'required|date',
        ]);

        Saving::create([
            'name' => $validated['name'],
            'description' => $validated['description'],
            'date' => $validated['date'],
            'is_active' => true,
        ]);

        return redirect()->route('savings.index')->with('success', 'Savings created successfully.');
    }

    /**
     * Display the specified savings with transactions.
     */
    public function show(Request $request, Saving $saving): Response
    {
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');

        $transactionsQuery = $saving->transactions()
            ->when($startDate, fn($q) => $q->where('transaction_date', '>=', $startDate))
            ->when($endDate, fn($q) => $q->where('transaction_date', '<=', $endDate))
            ->orderBy('transaction_date', 'asc')
            ->orderBy('created_at', 'asc')
            ->get();

        $runningBalance = 0;
        $transactionsWithBalance = $transactionsQuery->map(function ($transaction) use (&$runningBalance) {
            if ($transaction->type === 'credit') {
                $runningBalance += $transaction->amount;
            } else {
                $runningBalance -= $transaction->amount;
            }

            return [
                'id' => $transaction->id,
                'type' => $transaction->type,
                'amount' => $transaction->amount,
                'transaction_date' => $transaction->transaction_date->format('Y-m-d'),
                'reason' => $transaction->reason,
                'notes' => $transaction->notes,
                'running_balance' => $runningBalance,
                'created_at' => $transaction->created_at,
            ];
        })->reverse()->values();

        $perPage = 30;
        $page = $request->get('page', 1);
        $offset = ($page - 1) * $perPage;
        $paginatedTransactions = $transactionsWithBalance->slice($offset, $perPage)->values();

        $hasMore = $transactionsWithBalance->count() > ($offset + $perPage);
        $paginator = new Paginator(
            $paginatedTransactions,
            $perPage,
            $page,
            ['path' => $request->url(), 'query' => $request->query()]
        );
        $paginator->hasMorePagesWhen($hasMore);

        $totalCredits = $saving->getTotalCredits($startDate, $endDate);
        $totalDebits = $saving->getTotalDebits($startDate, $endDate);
        $balance = $totalCredits - $totalDebits;

        return Inertia::render('savings-detail', [
            'saving' => [
                'id' => $saving->id,
                'name' => $saving->name,
                'description' => $saving->description,
                'date' => $saving->date->format('Y-m-d'),
                'is_active' => $saving->is_active,
            ],
            'transactions' => $paginator,
            'summary' => [
                'total_credits' => $totalCredits,
                'total_debits' => $totalDebits,
                'balance' => $balance,
                'balance_status' => $balance > 0 ? 'positive' : ($balance < 0 ? 'negative' : 'zero'),
            ],
            'filters' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
        ]);
    }

    /**
     * Update the specified savings.
     */
    public function update(Request $request, Saving $saving)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:savings,name,' . $saving->id,
            'description' => 'nullable|string|max:1000',
        ]);

        $saving->update([
            'name' => $validated['name'],
            'description' => $validated['description'],
        ]);

        return back()->with('success', 'Savings updated successfully.');
    }

    /**
     * Archive or restore the specified savings.
     */
    public function archive(Saving $saving)
    {
        $saving->update([
            'is_active' => ! $saving->is_active,
        ]);

        $status = $saving->is_active ? 'restored' : 'archived';

        return back()->with('success', "Savings {$status} successfully.");
    }

    /**
     * Store a new transaction (credit or debit).
     */
    public function storeTransaction(Request $request, Saving $saving)
    {
        $validated = $request->validate([
            'type' => 'required|in:credit,debit',
            'amount' => 'required|numeric|min:0.01',
            'transaction_date' => 'required|date',
            'reason' => 'nullable|string|max:1000',
            'notes' => 'nullable|string|max:1000',
        ]);

        if ($validated['type'] === 'debit' && empty($validated['reason'])) {
            return back()->withErrors(['reason' => 'Reason is required for debit transactions.']);
        }

        $currentBalance = $saving->getBalance();
        $warning = null;

        if ($validated['type'] === 'debit' && $validated['amount'] > $currentBalance) {
            $warning = 'Warning: This debit will result in a negative balance.';
        }

        SavingsTransaction::create([
            'savings_id' => $saving->id,
            'type' => $validated['type'],
            'amount' => $validated['amount'],
            'transaction_date' => $validated['transaction_date'],
            'reason' => $validated['reason'] ?? null,
            'notes' => $validated['notes'] ?? null,
        ]);

        $message = ucfirst($validated['type']) . ' recorded successfully.';
        if ($warning) {
            $message .= ' ' . $warning;
        }

        return back()->with('success', $message);
    }

    /**
     * Update the specified transaction.
     */
    public function updateTransaction(Request $request, SavingsTransaction $transaction)
    {
        $validated = $request->validate([
            'type' => 'required|in:credit,debit',
            'amount' => 'required|numeric|min:0.01',
            'transaction_date' => 'required|date',
            'reason' => 'nullable|string|max:1000',
            'notes' => 'nullable|string|max:1000',
        ]);

        if ($validated['type'] === 'debit' && empty($validated['reason'] ?? null)) {
            return back()->withErrors(['reason' => 'Reason is required for debit transactions.']);
        }

        $transaction->update([
            'type' => $validated['type'],
            'amount' => $validated['amount'],
            'transaction_date' => $validated['transaction_date'],
            'reason' => $validated['reason'] ?? null,
            'notes' => $validated['notes'] ?? null,
        ]);

        return back()->with('success', 'Transaction updated successfully.');
    }

    /**
     * Delete the specified transaction.
     */
    public function destroyTransaction(SavingsTransaction $transaction)
    {
        $transaction->delete();

        return back()->with('success', 'Transaction deleted successfully.');
    }
}
