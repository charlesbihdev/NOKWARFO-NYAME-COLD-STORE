<?php

namespace App\Http\Controllers;

use App\Models\CashNote;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CashNoteController extends Controller
{
    /**
     * Display a listing of the resource with analytics.
     */
    public function index(Request $request)
    {
        $filterDate = $request->input('filter_date');
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

        // Get today's record
        $today = now()->format('Y-m-d');
        $todayRecord = CashNote::whereDate('record_date', $today)->first();

        // Get records for the table (last 30, or filtered)
        $recordsQuery = CashNote::query()->orderByDesc('record_date');

        if ($filterDate) {
            $recordsQuery->whereDate('record_date', $filterDate);
        }

        $records = $recordsQuery->paginate(30);

        // Calculate analytics
        // Period total (based on date range or all-time if no range specified)
        // Default to start of current year if no start date provided
        $periodStart = $startDate ?? now()->startOfYear()->format('Y-m-d');
        $periodEnd = $endDate ?? $today;

        $periodTotal = CashNote::whereDate('record_date', '>=', $periodStart)
            ->whereDate('record_date', '<=', $periodEnd)
            ->sum('total');

        // Monthly total (current month)
        $monthStart = now()->startOfMonth()->format('Y-m-d');
        $monthEnd = now()->endOfMonth()->format('Y-m-d');
        $monthlyTotal = CashNote::whereDate('record_date', '>=', $monthStart)
            ->whereDate('record_date', '<=', $monthEnd)
            ->sum('total');

        // Highest sale day (within date range)
        $highestDay = CashNote::whereDate('record_date', '>=', $periodStart)
            ->whereDate('record_date', '<=', $periodEnd)
            ->orderByDesc('total')
            ->first();

        // Lowest sale day (within date range, excluding zero totals)
        $lowestDay = CashNote::whereDate('record_date', '>=', $periodStart)
            ->whereDate('record_date', '<=', $periodEnd)
            ->where('total', '>', 0)
            ->orderBy('total')
            ->first();

        $analytics = [
            'period_total' => $periodTotal,
            'monthly_total' => $monthlyTotal,
            'highest_day' => $highestDay ? [
                'total' => $highestDay->total,
                'date' => $highestDay->record_date->format('D, M j, Y'),
                'raw_date' => $highestDay->record_date->format('Y-m-d'),
            ] : null,
            'lowest_day' => $lowestDay ? [
                'total' => $lowestDay->total,
                'date' => $lowestDay->record_date->format('D, M j, Y'),
                'raw_date' => $lowestDay->record_date->format('Y-m-d'),
            ] : null,
        ];

        // Format today's record for display
        $todayData = null;
        if ($todayRecord) {
            $todayData = [
                'id' => $todayRecord->id,
                'record_date' => $todayRecord->record_date->format('Y-m-d'),
                'formatted_date' => $todayRecord->record_date->format('l, F j, Y'),
                'note_200' => $todayRecord->note_200,
                'note_100' => $todayRecord->note_100,
                'note_50' => $todayRecord->note_50,
                'note_20' => $todayRecord->note_20,
                'note_10' => $todayRecord->note_10,
                'note_5' => $todayRecord->note_5,
                'total' => $todayRecord->total,
                'notes' => $todayRecord->notes,
            ];
        }

        // Format records for display
        $formattedRecords = $records->through(function ($record) {
            return [
                'id' => $record->id,
                'record_date' => $record->record_date->format('Y-m-d'),
                'formatted_date' => $record->record_date->format('D, M j, Y'),
                'full_date' => $record->record_date->format('l, F j, Y'),
                'note_200' => $record->note_200,
                'note_100' => $record->note_100,
                'note_50' => $record->note_50,
                'note_20' => $record->note_20,
                'note_10' => $record->note_10,
                'note_5' => $record->note_5,
                'total' => $record->total,
                'notes' => $record->notes,
            ];
        });

        return Inertia::render('cash-notes', [
            'today' => $todayData,
            'today_formatted' => now()->format('l, F j, Y'),
            'records' => $formattedRecords,
            'analytics' => $analytics,
            'filters' => [
                'filter_date' => $filterDate,
                'start_date' => $startDate ?? $periodStart,
                'end_date' => $endDate ?? $periodEnd,
            ],
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'record_date' => 'required|date',
            'note_200' => 'required|integer|min:0',
            'note_100' => 'required|integer|min:0',
            'note_50' => 'required|integer|min:0',
            'note_20' => 'required|integer|min:0',
            'note_10' => 'required|integer|min:0',
            'note_5' => 'required|integer|min:0',
            'notes' => 'nullable|string|max:1000',
        ]);

        // Use updateOrCreate to handle one record per day
        CashNote::updateOrCreate(
            ['record_date' => $validated['record_date']],
            $validated
        );

        return back()->with('success', 'Cash notes recorded successfully.');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, CashNote $cash_note)
    {
        $validated = $request->validate([
            'record_date' => 'required|date',
            'note_200' => 'required|integer|min:0',
            'note_100' => 'required|integer|min:0',
            'note_50' => 'required|integer|min:0',
            'note_20' => 'required|integer|min:0',
            'note_10' => 'required|integer|min:0',
            'note_5' => 'required|integer|min:0',
            'notes' => 'nullable|string|max:1000',
        ]);

        $cash_note->update($validated);

        return back()->with('success', 'Cash notes updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(CashNote $cash_note)
    {
        $cash_note->delete();

        return back()->with('success', 'Cash notes deleted successfully.');
    }
}
