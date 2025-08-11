<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ExpenseController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'description' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0',
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
}
