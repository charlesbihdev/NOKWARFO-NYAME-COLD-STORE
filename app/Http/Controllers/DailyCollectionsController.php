<?php

namespace App\Http\Controllers;

use App\Models\DailyCollection;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DailyCollectionsController extends Controller
{
    public function index()
    {
        $daily_collections = DailyCollection::orderByDesc('created_at')->get();
        
        return Inertia::render('daily-collections', [
            'daily_collections' => $daily_collections,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_name' => 'required|string|max:255',
            'amount_collected' => 'required|numeric|min:0',
            'payment_method' => 'required|string|max:255',
            'notes' => 'nullable|string|max:1000',
        ]);

        DailyCollection::create($validated);

        return redirect()->route('daily-collections.index')->with('success', 'Daily collection recorded successfully.');
    }

    public function destroy(DailyCollection $dailyCollection)
    {
        $dailyCollection->delete();
        return redirect()->route('daily-collections.index')->with('success', 'Daily collection deleted successfully.');
    }
} 