<?php

namespace App\Http\Controllers;

use App\Models\TripEstimation;
use App\Models\TripEstimationItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class TripEstimationController extends Controller
{
    public function index(Request $request)
    {
        // Get filter parameters with current month defaults
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

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

        // Ensure startDate <= endDate
        if ($startDate > $endDate) {
            [$startDate, $endDate] = [$endDate, $startDate];
        }

        // Get trips with items
        $trips = TripEstimation::with(['items', 'user'])
            ->whereDate('trip_date', '>=', $startDate)
            ->whereDate('trip_date', '<=', $endDate)
            ->orderByDesc('trip_date')
            ->orderByDesc('created_at')
            ->simplePaginate(15)
            ->through(function ($trip) {
                return [
                    'id' => $trip->id,
                    'trip_date' => $trip->trip_date->format('d M, Y'),
                    'description' => $trip->description,
                    'location' => $trip->location,
                    'notes' => $trip->notes,
                    'total_cost_price' => $trip->total_cost_price,
                    'total_selling_price' => $trip->total_selling_price,
                    'gross_profit' => $trip->gross_profit,
                    'transportation_cost' => $trip->transportation_cost,
                    'other_expenses' => $trip->other_expenses,
                    'total_expenses' => $trip->total_expenses,
                    'net_profit' => $trip->net_profit,
                    'items_count' => $trip->items->count(),
                    'user_name' => $trip->user->name ?? 'Unknown',
                    'created_at' => $trip->created_at->format('d M, Y h:i A'),
                    'items' => $trip->items->map(function ($item) {
                        return [
                            'product_name' => $item->product_name,
                            'quantity' => $item->quantity,
                            'unit_cost_price' => $item->unit_cost_price,
                            'unit_selling_price' => $item->unit_selling_price,
                        ];
                    }),
                ];
            });

        // Calculate overview totals for the filtered period
        $overviewQuery = TripEstimation::whereDate('trip_date', '>=', $startDate)
            ->whereDate('trip_date', '<=', $endDate);
        
        $overview = [
            'total_selling_price' => $overviewQuery->sum('total_selling_price'),
            'total_cost_price' => $overviewQuery->sum('total_cost_price'),
            'total_gross_profit' => $overviewQuery->sum('gross_profit'),
            'total_expenses' => $overviewQuery->sum('total_expenses'),
            'total_net_profit' => $overviewQuery->sum('net_profit'),
            'total_trips' => $overviewQuery->count(),
        ];

        return Inertia::render('TripEstimations', [
            'trips' => $trips,
            'overview' => $overview,
            'start_date' => $startDate,
            'end_date' => $endDate,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'trip_date' => 'required|date',
            'description' => 'nullable|string|max:255',
            'location' => 'nullable|string|max:255',
            'transportation_cost' => 'nullable|numeric|min:0',
            'other_expenses' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:1000',
            'items' => 'required|array|min:1',
            'items.*.product_name' => 'required|string|max:255',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_cost_price' => 'required|numeric|min:0',
            'items.*.unit_selling_price' => 'required|numeric|min:0',
        ]);

        DB::transaction(function () use ($validated) {
            // Create trip estimation
            $trip = TripEstimation::create([
                'trip_date' => $validated['trip_date'],
                'description' => $validated['description'],
                'location' => $validated['location'],
                'transportation_cost' => $validated['transportation_cost'] ?? 0,
                'other_expenses' => $validated['other_expenses'] ?? 0,
                'notes' => $validated['notes'],
                'user_id' => Auth::id(),
            ]);

            // Create items
            foreach ($validated['items'] as $itemData) {
                $item = new TripEstimationItem([
                    'product_name' => $itemData['product_name'],
                    'quantity' => $itemData['quantity'],
                    'unit_cost_price' => $itemData['unit_cost_price'],
                    'unit_selling_price' => $itemData['unit_selling_price'],
                ]);
                
                // Calculate totals
                $item->calculateTotals();
                $trip->items()->save($item);
            }

            // Calculate trip totals
            $trip->calculateTotals();
        });

        return back()->with('success', 'Trip estimation created successfully');
    }

    public function update(Request $request, TripEstimation $tripEstimation)
    {
        $validated = $request->validate([
            'trip_date' => 'required|date',
            'description' => 'nullable|string|max:255',
            'location' => 'nullable|string|max:255',
            'transportation_cost' => 'nullable|numeric|min:0',
            'other_expenses' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:1000',
            'items' => 'required|array|min:1',
            'items.*.product_name' => 'required|string|max:255',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_cost_price' => 'required|numeric|min:0',
            'items.*.unit_selling_price' => 'required|numeric|min:0',
        ]);

        DB::transaction(function () use ($validated, $tripEstimation) {
            // Update trip estimation
            $tripEstimation->update([
                'trip_date' => $validated['trip_date'],
                'description' => $validated['description'],
                'location' => $validated['location'],
                'transportation_cost' => $validated['transportation_cost'] ?? 0,
                'other_expenses' => $validated['other_expenses'] ?? 0,
                'notes' => $validated['notes'],
            ]);

            // Delete existing items
            $tripEstimation->items()->delete();

            // Create new items
            foreach ($validated['items'] as $itemData) {
                $item = new TripEstimationItem([
                    'product_name' => $itemData['product_name'],
                    'quantity' => $itemData['quantity'],
                    'unit_cost_price' => $itemData['unit_cost_price'],
                    'unit_selling_price' => $itemData['unit_selling_price'],
                ]);
                
                // Calculate totals
                $item->calculateTotals();
                $tripEstimation->items()->save($item);
            }

            // Calculate trip totals
            $tripEstimation->calculateTotals();
        });

        return back()->with('success', 'Trip estimation updated successfully');
    }

    public function destroy(TripEstimation $tripEstimation)
    {
        $tripEstimation->delete();
        return back()->with('success', 'Trip estimation deleted successfully');
    }
}