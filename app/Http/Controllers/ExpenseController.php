<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ExpenseController extends Controller
{
    public function index(Request $request)
    {
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');
        $typeFilter = $request->query('type_filter');

        $query = Expense::query();

        // Apply date filters
        if ($startDate) {
            $query->whereDate('date', '>=', $startDate);
        }
        if ($endDate) {
            $query->whereDate('date', '<=', $endDate);
        }

        // Apply type filter
        if ($typeFilter && $typeFilter !== 'all') {
            $query->where('type', $typeFilter);
        }

        // Order by date descending
        $query->orderBy('date', 'desc');

        // Paginate results
        $expenses = $query->paginate(15);

        // Calculate total amount for the filtered results
        $totalAmount = $query->sum('amount');

        return Inertia::render('expenses', [
            'expenses' => $expenses,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'type_filter' => $typeFilter ?: 'all',
            'total_amount' => $totalAmount,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'description' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0',
            'type' => 'required|in:fixed,additional,car_saving,trip_saving,loan_saving,others',
            'notes' => 'nullable|string',
            'date' => 'required|date',
        ]);

        try {
            Expense::create($validated);

            return back()->with('success', 'Expense recorded successfully.');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Failed to record expense. Please try again.'])->withInput();
        }
    }

    public function update(Request $request, Expense $expense)
    {
        $validated = $request->validate([
            'description' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0',
            'type' => 'required|in:fixed,additional,car_saving,trip_saving,loan_saving,others',
            'notes' => 'nullable|string',
            'date' => 'required|date',
        ]);

        try {
            $expense->update($validated);

            return back()->with('success', 'Expense updated successfully.');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Failed to update expense. Please try again.'])->withInput();
        }
    }

    public function destroy(Expense $expense)
    {
        try {
            $expense->delete();

            return back()->with('success', 'Expense deleted successfully.');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Failed to delete expense. Please try again.']);
        }
    }
}
