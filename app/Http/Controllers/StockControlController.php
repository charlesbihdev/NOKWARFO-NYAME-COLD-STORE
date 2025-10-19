<?php

namespace App\Http\Controllers;

use App\Helpers\StockHelper;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\Supplier;
use Illuminate\Http\Request;
use Inertia\Inertia;

class StockControlController extends Controller
{
    public function index(Request $request)
    {
        // Support single-date mode (preferred) and legacy start/end
        $singleDate = $request->query('date');
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');

        if ($singleDate) {
            $startDate = $singleDate;
            $endDate = $singleDate;
        }

        // Load data - only apply date filters if both dates are provided
        if ($startDate && $endDate) {
            // Ensure startDate <= endDate
            if ($startDate > $endDate) {
                [$startDate, $endDate] = [$endDate, $startDate];
            }

            $stock_movements = StockMovement::with(['product'])
                ->whereBetween('created_at', [$startDate.' 00:00:00', $endDate.' 23:59:59'])
                ->orderByDesc('created_at')
                ->get()
                ->map(function ($movement) {
                    $movement->quantity_display = StockHelper::formatCartonLine(
                        $movement->quantity,
                        $movement->product->lines_per_carton
                    );

                    return $movement;
                });
        } else {
            // No date range specified - show all stock movements
            $stock_movements = StockMovement::with(['product'])
                ->orderByDesc('created_at')
                ->get()
                ->map(function ($movement) {
                    $movement->quantity_display = StockHelper::formatCartonLine(
                        $movement->quantity,
                        $movement->product->lines_per_carton
                    );

                    return $movement;
                });
        }

        $products = Product::with(['supplier', 'stockMovements'])->orderBy('name')->get();

        // Calculate current stock display for each product (should match remaining stock logic)
        foreach ($products as $product) {
            // Stock received (all time)
            $totalReceived = $product->stockMovements()
                ->where('type', 'received')
                ->sum('quantity');

            // Stock adjustments (all time)
            $adjustmentsIn = $product->stockMovements()
                ->where('type', 'adjustment_in')
                ->sum('quantity');

            $adjustmentsOut = $product->stockMovements()
                ->where('type', 'adjustment_out')
                ->sum('quantity');

            // Sales from sales table (all time)
            $cashSales = $product->saleItems()
                ->whereHas('sale', function ($q) {
                    $q->where('payment_type', 'cash');
                })
                ->sum('quantity');

            $creditSales = $product->saleItems()
                ->whereHas('sale', function ($q) {
                    $q->where('payment_type', 'credit');
                })
                ->sum('quantity');

            $partialSales = $product->saleItems()
                ->whereHas('sale', function ($q) {
                    $q->where('payment_type', 'partial');
                })
                ->sum('quantity');

            // Total sales (all time)
            $totalSales = $cashSales + $creditSales + $partialSales;

            // Current stock = Total received + Adjustments In - Adjustments Out - Total sales
            $currentStock = $totalReceived + $adjustmentsIn - $adjustmentsOut - $totalSales;

            // Add formatted carton+line stock to product
            $product->current_stock_display = StockHelper::formatCartonLine($currentStock, $product->lines_per_carton);
        }

        $suppliers = Supplier::where('is_active', true)->get();

        $stock_activity_summary = [];

        foreach ($products as $product) {
            if ($startDate && $endDate) {
                // Date range specified - calculate activity for that range
                // Stock Received in date range
                $stockReceivedInRange = $product->stockMovements()
                    ->whereBetween('created_at', [$startDate.' 00:00:00', $endDate.' 23:59:59'])
                    ->where('type', 'received')
                    ->sum('quantity');

                // Stock Adjustments in date range (exclude set-tagged adjustments to avoid double-counting with baselines)
                $adjustmentsIn = $product->stockMovements()
                    ->whereBetween('created_at', [$startDate.' 00:00:00', $endDate.' 23:59:59'])
                    ->where('type', 'adjustment_in')
                    ->where(function ($q) {
                        $q->whereNull('notes')
                            ->orWhere(function ($q2) {
                                $q2->where('notes', 'not like', '%[set:available]%')
                                    ->where('notes', 'not like', '%[set:received]%');
                            });
                    })
                    ->sum('quantity');

                $adjustmentsOut = $product->stockMovements()
                    ->whereBetween('created_at', [$startDate.' 00:00:00', $endDate.' 23:59:59'])
                    ->where('type', 'adjustment_out')
                    ->where(function ($q) {
                        $q->whereNull('notes')
                            ->orWhere(function ($q2) {
                                $q2->where('notes', 'not like', '%[set:available]%')
                                    ->where('notes', 'not like', '%[set:received]%');
                            });
                    })
                    ->sum('quantity');

                // Previous Stock
                $receivedBefore = $product->stockMovements()
                    ->where('created_at', '<=', $startDate.' 00:00:00')
                    ->where('type', 'received')
                    ->sum('quantity');

                $adjustmentsInBefore = $product->stockMovements()
                    ->where('created_at', '<=', $startDate.' 00:00:00')
                    ->where('type', 'adjustment_in')
                    ->sum('quantity');

                $adjustmentsOutBefore = $product->stockMovements()
                    ->where('created_at', '<=', $startDate.' 00:00:00')
                    ->where('type', 'adjustment_out')
                    ->sum('quantity');

                $previousStock = $receivedBefore + $adjustmentsInBefore - $adjustmentsOutBefore;

                // Total Available = Previous + Received + Adjustments In - Adjustments Out
                $totalAvailable = $previousStock + $stockReceivedInRange + $adjustmentsIn - $adjustmentsOut;

                // Sales in date range by payment type
                $cashSales = $product->saleItems()
                    ->whereHas('sale', function ($q) use ($startDate, $endDate) {
                        $q->whereBetween('created_at', [$startDate.' 00:00:00', $endDate.' 23:59:59'])
                            ->where('payment_type', 'cash');
                    })
                    ->sum('quantity');

                $creditSales = $product->saleItems()
                    ->whereHas('sale', function ($q) use ($startDate, $endDate) {
                        $q->whereBetween('created_at', [$startDate.' 00:00:00', $endDate.' 23:59:59'])
                            ->where('payment_type', 'credit');
                    })
                    ->sum('quantity');

                $partialSales = $product->saleItems()
                    ->whereHas('sale', function ($q) use ($startDate, $endDate) {
                        $q->whereBetween('created_at', [$startDate.' 00:00:00', $endDate.' 23:59:59'])
                            ->where('payment_type', 'partial');
                    })
                    ->sum('quantity');

                // Include any explicit received target adjustments in the displayed "Stock Received today"
                $setReceivedIn = $product->stockMovements()
                    ->whereBetween('created_at', [$startDate.' 00:00:00', $endDate.' 23:59:59'])
                    ->where('type', 'adjustment_in')
                    ->where('notes', 'like', '%[set:received]%')
                    ->sum('quantity');

                $setReceivedOut = $product->stockMovements()
                    ->whereBetween('created_at', [$startDate.' 00:00:00', $endDate.' 23:59:59'])
                    ->where('type', 'adjustment_out')
                    ->where('notes', 'like', '%[set:received]%')
                    ->sum('quantity');

                $stockReceivedDisplay = $stockReceivedInRange + ($setReceivedIn - $setReceivedOut);

                // Total sales in date range
                $totalSalesInRange = $cashSales + $creditSales + $partialSales;

                // Remaining stock
                $remainingStock = $totalAvailable - $totalSalesInRange;

                $stock_activity_summary[] = [
                    'product' => $product->name,
                    'stock_received_today' => StockHelper::formatCartonLine($stockReceivedDisplay, $product->lines_per_carton),
                    'previous_stock' => StockHelper::formatCartonLine($previousStock, $product->lines_per_carton),
                    // Use display received and non-tagged adjustments for total available
                    'total_available' => StockHelper::formatCartonLine($previousStock + $stockReceivedDisplay + $adjustmentsIn - $adjustmentsOut, $product->lines_per_carton),
                    'cash_sales' => StockHelper::formatCartonLine($cashSales, $product->lines_per_carton),
                    'credit_sales' => StockHelper::formatCartonLine($creditSales, $product->lines_per_carton),
                    'partial_sales' => StockHelper::formatCartonLine($partialSales, $product->lines_per_carton),
                    'total_sales' => StockHelper::formatCartonLine($totalSalesInRange, $product->lines_per_carton),
                    'remaining_stock' => StockHelper::formatCartonLine(($previousStock + $stockReceivedDisplay + $adjustmentsIn - $adjustmentsOut) - $totalSalesInRange, $product->lines_per_carton),
                ];
            } else {
                // Single-day summary for today (no date provided): mirror single-date logic
                $today = now()->toDateString();

                $receivedBefore = $product->stockMovements()
                    ->where('created_at', '<=', $today.' 00:00:00')
                    ->where('type', 'received')
                    ->sum('quantity');
                $adjustmentsInBefore = $product->stockMovements()
                    ->where('created_at', '<=', $today.' 00:00:00')
                    ->where('type', 'adjustment_in')
                    ->sum('quantity');
                $adjustmentsOutBefore = $product->stockMovements()
                    ->where('created_at', '<=', $today.' 00:00:00')
                    ->where('type', 'adjustment_out')
                    ->sum('quantity');
                $previousStock = $receivedBefore + $adjustmentsInBefore - $adjustmentsOutBefore;

                // Received today including [set:received] deltas
                $receivedToday = $product->stockMovements()
                    ->whereBetween('created_at', [$today.' 00:00:00', $today.' 23:59:59'])
                    ->where('type', 'received')
                    ->sum('quantity');
                $setReceivedIn = $product->stockMovements()
                    ->whereBetween('created_at', [$today.' 00:00:00', $today.' 23:59:59'])
                    ->where('type', 'adjustment_in')
                    ->where('notes', 'like', '%[set:received]%')
                    ->sum('quantity');
                $setReceivedOut = $product->stockMovements()
                    ->whereBetween('created_at', [$today.' 00:00:00', $today.' 23:59:59'])
                    ->where('type', 'adjustment_out')
                    ->where('notes', 'like', '%[set:received]%')
                    ->sum('quantity');
                $receivedDisplay = $receivedToday + ($setReceivedIn - $setReceivedOut);

                // Adjustments today excluding set tags
                $adjustmentsInToday = $product->stockMovements()
                    ->whereBetween('created_at', [$today.' 00:00:00', $today.' 23:59:59'])
                    ->where('type', 'adjustment_in')
                    ->where(function ($q) {
                        $q->whereNull('notes')
                            ->orWhere(function ($q2) {
                                $q2->where('notes', 'not like', '%[set:available]%')
                                    ->where('notes', 'not like', '%[set:received]%');
                            });
                    })
                    ->sum('quantity');
                $adjustmentsOutToday = $product->stockMovements()
                    ->whereBetween('created_at', [$today.' 00:00:00', $today.' 23:59:59'])
                    ->where('type', 'adjustment_out')
                    ->where(function ($q) {
                        $q->whereNull('notes')
                            ->orWhere(function ($q2) {
                                $q2->where('notes', 'not like', '%[set:available]%')
                                    ->where('notes', 'not like', '%[set:received]%');
                            });
                    })
                    ->sum('quantity');

                // Sales today
                $cashSales = $product->saleItems()
                    ->whereHas('sale', function ($q) use ($today) {
                        $q->whereDate('created_at', $today)->where('payment_type', 'cash');
                    })
                    ->sum('quantity');
                $creditSales = $product->saleItems()
                    ->whereHas('sale', function ($q) use ($today) {
                        $q->whereDate('created_at', $today)->where('payment_type', 'credit');
                    })
                    ->sum('quantity');
                $partialSales = $product->saleItems()
                    ->whereHas('sale', function ($q) use ($today) {
                        $q->whereDate('created_at', $today)->where('payment_type', 'partial');
                    })
                    ->sum('quantity');
                $totalSalesToday = $cashSales + $creditSales + $partialSales;

                $totalAvailable = $previousStock + $receivedDisplay + $adjustmentsInToday - $adjustmentsOutToday;
                $remaining = $totalAvailable - $totalSalesToday;

                $stock_activity_summary[] = [
                    'product' => $product->name,
                    'stock_received_today' => StockHelper::formatCartonLine($receivedDisplay, $product->lines_per_carton),
                    'previous_stock' => StockHelper::formatCartonLine($previousStock, $product->lines_per_carton),
                    'total_available' => StockHelper::formatCartonLine($totalAvailable, $product->lines_per_carton),
                    'cash_sales' => StockHelper::formatCartonLine($cashSales, $product->lines_per_carton),
                    'credit_sales' => StockHelper::formatCartonLine($creditSales, $product->lines_per_carton),
                    'partial_sales' => StockHelper::formatCartonLine($partialSales, $product->lines_per_carton),
                    'total_sales' => StockHelper::formatCartonLine($totalSalesToday, $product->lines_per_carton),
                    'remaining_stock' => StockHelper::formatCartonLine($remaining, $product->lines_per_carton),
                ];
            }
        }

        return Inertia::render('stock-control', [
            'stock_movements' => $stock_movements,
            'products' => $products,
            'suppliers' => $suppliers,
            'stock_activity_summary' => $stock_activity_summary,
            'date' => $startDate === $endDate ? $startDate : null,
            'start_date' => $startDate,
            'end_date' => $endDate,
        ]);
    }

    public function store(Request $request)
    {
        $rules = [
            'product_id' => 'required|exists:products,id',
            'notes' => 'nullable|string|max:1000',
            'quantity' => 'required|string|max:50', // Allow carton/line format
            'date' => 'required|date',
        ];

        $validated = $request->validate($rules);

        // Get product info
        $product = Product::findOrFail($validated['product_id']);

        // Convert carton/line format to total lines if needed
        if (isset($validated['quantity'])) {
            $totalLines = StockHelper::parseCartonLineFormat($validated['quantity'], $product->lines_per_carton);
            $validated['quantity'] = $totalLines;
        }

        // Always set type to 'received' for Add Stock
        $validated['type'] = 'received';

        $movement = StockMovement::create([
            'product_id' => $validated['product_id'],
            'type' => $validated['type'],
            'quantity' => $validated['quantity'],
            'notes' => $validated['notes'] ?? null,
        ]);

        // Set created_at to selected date preserving current time (use noon to avoid edge issues)
        $movement->created_at = $validated['date'].' 12:00:00';
        $movement->save();

        return redirect()->route('stock-control.index')
            ->with('success', 'Stock added Successfully.');
    }

    public function update(Request $request, $id)
    {
        $stockMovement = StockMovement::findOrFail($id);

        $rules = [
            'product_id' => 'required|exists:products,id',
            'notes' => 'nullable|string|max:1000',
            'quantity' => 'required|string|max:50', // Allow carton/line format
        ];

        $validated = $request->validate($rules);

        // Get product info
        $product = Product::findOrFail($validated['product_id']);

        // Convert carton/line format to total lines if needed
        if (isset($validated['quantity'])) {
            $totalLines = StockHelper::parseCartonLineFormat($validated['quantity'], $product->lines_per_carton);
            $validated['quantity'] = $totalLines;
        }

        // Always set type to 'received' for existing stock movements
        $validated['type'] = 'received';

        $stockMovement->update($validated);

        return redirect()->route('stock-control.index')
            ->with('success', 'Stock movement updated successfully.');
    }

    public function updateAdjustment(Request $request, $id)
    {
        $stockMovement = StockMovement::findOrFail($id);

        // Only allow editing of adjustment type movements
        if (! in_array($stockMovement->type, ['adjustment_in', 'adjustment_out'])) {
            return back()->with('error', 'Only stock adjustments can be edited with this method.');
        }

        $rules = [
            'product_id' => 'required|exists:products,id',
            'notes' => 'nullable|string|max:1000',
            'quantity' => 'required|string|max:50', // Allow carton/line format
        ];

        $validated = $request->validate($rules);

        // Get product info
        $product = Product::findOrFail($validated['product_id']);

        // Convert carton/line format to total lines if needed
        if (isset($validated['quantity'])) {
            $totalLines = StockHelper::parseCartonLineFormat($validated['quantity'], $product->lines_per_carton);
            $validated['quantity'] = $totalLines;
        }

        // Keep the original adjustment type
        $validated['type'] = $stockMovement->type;

        $stockMovement->update($validated);

        return redirect()->route('stock-control.index')
            ->with('success', 'Stock adjustment updated successfully.');
    }

    public function destroy($id)
    {
        $stockMovement = StockMovement::findOrFail($id);
        $stockMovement->delete();

        return back()->with('success', 'Stock movement deleted successfully.');
    }

    public function adjust(Request $request)
    {
        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
            'date' => 'required|date',
            'available_stock_target' => 'nullable|string',
            'received_today_target' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $product = Product::findOrFail($validated['product_id']);
        $date = $validated['date'];

        // Helpers to sum quantities
        $sumMovements = function ($query) {
            return (int) $query->sum('quantity');
        };

        // 1) Compute current Available display at start of day (baselineWithoutSet + netSetAvailableSoFar)
        $receivedBefore = $product->stockMovements()
            ->where('created_at', '<', $date.' 00:00:00')
            ->where('type', 'received');
        $adjustInBefore = $product->stockMovements()
            ->where('created_at', '<', $date.' 00:00:00')
            ->where('type', 'adjustment_in')
            ->where(function ($q) {
                $q->whereNull('notes')
                    ->orWhere('notes', 'not like', '%[set:available]%');
            });
        $adjustOutBefore = $product->stockMovements()
            ->where('created_at', '<', $date.' 00:00:00')
            ->where('type', 'adjustment_out')
            ->where(function ($q) {
                $q->whereNull('notes')
                    ->orWhere('notes', 'not like', '%[set:available]%');
            });
        $baselineWithoutSet = $sumMovements($receivedBefore) + $sumMovements($adjustInBefore) - $sumMovements($adjustOutBefore);

        $setAvailInSoFar = $sumMovements(
            $product->stockMovements()
                ->whereBetween('created_at', [$date.' 00:00:00', $date.' 23:59:59'])
                ->where('type', 'adjustment_in')
                ->where('notes', 'like', '%[set:available]%')
        );
        $setAvailOutSoFar = $sumMovements(
            $product->stockMovements()
                ->whereBetween('created_at', [$date.' 00:00:00', $date.' 23:59:59'])
                ->where('type', 'adjustment_out')
                ->where('notes', 'like', '%[set:available]%')
        );
        $currentAvailableDisplay = $baselineWithoutSet + ($setAvailInSoFar - $setAvailOutSoFar);

        // 2) Compute current Received display on date (receivedRaw + netSetReceivedSoFar)
        $receivedRaw = $sumMovements(
            $product->stockMovements()->whereBetween('created_at', [$date.' 00:00:00', $date.' 23:59:59'])->where('type', 'received')
        );
        $setRecvInSoFar = $sumMovements(
            $product->stockMovements()->whereBetween('created_at', [$date.' 00:00:00', $date.' 23:59:59'])
                ->where('type', 'adjustment_in')
                ->where('notes', 'like', '%[set:received]%')
        );
        $setRecvOutSoFar = $sumMovements(
            $product->stockMovements()->whereBetween('created_at', [$date.' 00:00:00', $date.' 23:59:59'])
                ->where('type', 'adjustment_out')
                ->where('notes', 'like', '%[set:received]%')
        );
        $currentReceivedDisplay = $receivedRaw + ($setRecvInSoFar - $setRecvOutSoFar);

        // Apply targets as minimal deltas so displays equal targets exactly
        $createdAdjustment = false;
        $notes = $validated['notes'] ?? null;

        if (! empty($validated['available_stock_target'])) {
            $target = StockHelper::parseCartonLineFormat($validated['available_stock_target'], $product->lines_per_carton);
            $delta = $target - $currentAvailableDisplay;
            if ($delta !== 0) {
                $movement = StockMovement::create([
                    'product_id' => $product->id,
                    'type' => $delta > 0 ? 'adjustment_in' : 'adjustment_out',
                    'quantity' => abs($delta),
                    'notes' => trim('[set:available] '.($notes ?? '')),
                ]);
                // Set at start of day to affect baseline
                $movement->created_at = $date.' 00:00:00';
                $movement->save();
                $createdAdjustment = true;
                // Update current display for any subsequent calculations in this request
                $currentAvailableDisplay = $target;
            }
        }

        if (! empty($validated['received_today_target'])) {
            $target = StockHelper::parseCartonLineFormat($validated['received_today_target'], $product->lines_per_carton);
            $delta = $target - $currentReceivedDisplay;
            if ($delta !== 0) {
                $movement = StockMovement::create([
                    'product_id' => $product->id,
                    'type' => $delta > 0 ? 'adjustment_in' : 'adjustment_out',
                    'quantity' => abs($delta),
                    'notes' => trim('[set:received] '.($notes ?? '')),
                ]);
                // Mid-day so it's clearly on the date
                $movement->created_at = $date.' 12:00:00';
                $movement->save();
                $createdAdjustment = true;
                $currentReceivedDisplay = $target;
            }
        }

        if ($createdAdjustment) {
            return back()->with('success', 'Stock adjusted successfully.');
        }

        return back()->with('info', 'No targets provided or no change required.');
    }

    public function dailyMovementReport(Request $request)
    {
        $date = $request->input('date', now()->toDateString());
        $products = Product::with('supplier')->orderBy('name')->get();
        $report = [];
        foreach ($products as $product) {
            // Stock received today
            $stockReceived = $product->stockMovements()
                ->whereDate('created_at', $date)
                ->where('type', 'received')
                ->sum('quantity');
            // Previous stock (before today)
            $receivedBefore = $product->stockMovements()
                ->where('created_at', '<', $date.' 00:00:00')
                ->where('type', 'received')
                ->sum('quantity');

            $adjustmentsInBefore = $product->stockMovements()
                ->where('created_at', '<', $date.' 00:00:00')
                ->where('type', 'adjustment_in')
                ->sum('quantity');

            $adjustmentsOutBefore = $product->stockMovements()
                ->where('created_at', '<', $date.' 00:00:00')
                ->where('type', 'adjustment_out')
                ->sum('quantity');

            $previousStock = $receivedBefore + $adjustmentsInBefore - $adjustmentsOutBefore;

            // Total available
            $totalAvailable = $previousStock + $stockReceived;
            // Cash sales today
            $cashSales = $product->saleItems()
                ->whereHas('sale', function ($q) use ($date) {
                    $q->whereDate('created_at', $date)->where('payment_type', 'cash');
                })
                ->sum('quantity');
            // Credit sales today
            $creditSales = $product->saleItems()
                ->whereHas('sale', function ($q) use ($date) {
                    $q->whereDate('created_at', $date)->where('payment_type', 'credit');
                })
                ->sum('quantity');
            // Total sales
            $totalSales = $cashSales + $creditSales;
            // Remaining stock
            $remainingStock = $totalAvailable - $totalSales;
            $report[] = [
                'product' => $product->name,
                'stock_received' => $stockReceived,
                'previous_stock' => $previousStock,
                'total_available' => $totalAvailable,
                'cash_sales' => $cashSales,
                'credit_sales' => $creditSales,
                'total_sales' => $totalSales,
                'remaining_stock' => $remainingStock,
            ];
        }

        return Inertia::render('stock-movement-report', [
            'date' => $date,
            'report' => $report,
        ]);
    }
}
