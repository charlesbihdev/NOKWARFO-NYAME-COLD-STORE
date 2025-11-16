<?php

namespace App\Http\Controllers;

use App\Models\BankTransfer;
use App\Models\BankTransferTag;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class BankTransferController extends Controller
{
    public function index(Request $request)
    {
        // Validate and parse dates
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');

        $today = now()->toDateString();

        // Default to current month if no dates provided
        if (! $startDate && ! $endDate) {
            $now = now();
            $startDate = $now->startOfMonth()->format('Y-m-d');
            $endDate = $now->endOfMonth()->format('Y-m-d');
        } elseif ($startDate && ! $endDate) {
            $endDate = $startDate;
        } elseif (! $startDate && $endDate) {
            $startDate = $endDate;
        }

        // Ensure startDate <= endDate
        if ($startDate > $endDate) {
            [$startDate, $endDate] = [$endDate, $startDate];
        }

        $bank_transfers = BankTransfer::with('tag')
            ->whereDate('date', '>=', $startDate)
            ->whereDate('date', '<=', $endDate)
            ->orderByDesc('date')
            ->orderByDesc('created_at')
            ->paginate(25)
            ->through(function ($transfer) {
                return [
                    'id' => $transfer->id,
                    'date' => $transfer->date ? $transfer->date->format('d M, Y') : null,
                    'created_at' => $transfer->created_at->format('d M, Y h:i A'),
                    'previous_balance' => number_format($transfer->previous_balance, 2),
                    'credit' => number_format($transfer->credit, 2),
                    'total_balance' => number_format($transfer->total_balance, 2),
                    'debit' => number_format($transfer->debit, 2),
                    'current_balance' => number_format($transfer->current_balance, 2),
                    'notes' => $transfer->notes,
                    'tag' => $transfer->tag ? ['id' => $transfer->tag->id, 'name' => $transfer->tag->name] : null,
                ];
            });

        $tags = BankTransferTag::orderBy('name')->get();

        $lastBalance = BankTransfer::latest()->value('current_balance') ?? 0;

        // Calculate useful statistics for the selected period
        $statistics = $this->calculateStatistics($startDate, $endDate, $today);

        return Inertia::render('bank-transfers', [
            'bank_transfers' => $bank_transfers,
            'tags' => $tags,
            'last_balance' => $lastBalance,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'statistics' => $statistics,
        ]);
    }

    private function calculateStatistics($startDate, $endDate, $today)
    {
        // Get transfers for selected period
        $periodTransfers = BankTransfer::whereDate('date', '>=', $startDate)
            ->whereDate('date', '<=', $endDate)
            ->get();

        // Get today's transfers only
        $todayTransfers = BankTransfer::whereDate('date', $today)->get();

        // 1. Total Credit (Money IN) for selected period
        $totalCredit = $periodTransfers->sum('credit');

        // 2. Total Debit (Money OUT) for selected period
        $totalDebit = $periodTransfers->sum('debit');

        // 3. Net Flow (Profit/Loss) = Credit - Debit
        $netFlow = $totalCredit - $totalDebit;

        // 4. Today's Credit (Money IN today)
        $todayCredit = $todayTransfers->sum('credit');

        // 5. Today's Debit (Money OUT today)
        $todayDebit = $todayTransfers->sum('debit');

        // 6. Today's transaction count
        $todayCount = $todayTransfers->count();

        // 7. Breakdown by tags (for selected period)
        $tagBreakdown = BankTransfer::with('tag')
            ->whereDate('date', '>=', $startDate)
            ->whereDate('date', '<=', $endDate)
            ->whereNotNull('tag_id')
            ->get()
            ->groupBy('tag_id')
            ->map(function ($transfers) {
                $tag = $transfers->first()->tag;

                return [
                    'tag_name' => $tag ? $tag->name : 'No Tag',
                    'total_credit' => $transfers->sum('credit'),
                    'total_debit' => $transfers->sum('debit'),
                    'transaction_count' => $transfers->count(),
                    'net_amount' => $transfers->sum('credit') - $transfers->sum('debit'),
                ];
            })
            ->sortByDesc('total_debit')
            ->values();

        return [
            'total_credit' => $totalCredit,
            'total_debit' => $totalDebit,
            'net_flow' => $netFlow,
            'today_credit' => $todayCredit,
            'today_debit' => $todayDebit,
            'today_count' => $todayCount,
            'tag_breakdown' => $tagBreakdown,
        ];
    }

    public function store(Request $request)
    {

        // dd('Store method called with request:', $request->all());
        $validated = $request->validate([
            'date' => 'required|date',
            'previous_balance' => 'required|numeric|min:0',
            'credit' => ['nullable', 'numeric', 'min:0'],
            'debit' => ['nullable', 'numeric', 'min:0'],
            'total_balance' => ['required', 'numeric', 'min:1'],
            'tag_id' => 'required|exists:bank_transfer_tags,id',
            'current_balance' => 'required|numeric|min:0',
            'notes' => 'nullable|string|max:1000',
        ]);

        // 🔁 Replace null with 0
        $validated['credit'] = $validated['credit'] ?? 0;
        $validated['debit'] = $validated['debit'] ?? 0;

        // ❗Ensure at least one is greater than 0
        if ($validated['credit'] == 0 && $validated['debit'] == 0) {
            return back()->withErrors(['credit' => 'Either credit or debit must be greater than 0']);
        }

        // ✅ Add user_id
        $validated['user_id'] = Auth::user()->id ?? 1;

        BankTransfer::create($validated);

        return redirect()->route('bank-transfers.index')->with('success', 'Bank transfer recorded successfully.');
    }

    public function destroy(BankTransfer $bankTransfer)
    {
        $bankTransfer->delete();

        return redirect()->route('bank-transfers.index')->with('success', 'Bank transfer deleted successfully.');
    }
}
