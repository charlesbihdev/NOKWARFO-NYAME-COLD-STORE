<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use App\Models\Product;
use App\Models\Supplier;
use App\Helpers\StockHelper;
use Illuminate\Http\Request;
use App\Models\StockMovement;

class StockControlController extends Controller
{
    public function index(Request $request)
    {
        // Get dates from request (optional)
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');

        // Load data - only apply date filters if both dates are provided
        if ($startDate && $endDate) {
            // Ensure startDate <= endDate
            if ($startDate > $endDate) {
                [$startDate, $endDate] = [$endDate, $startDate];
            }

            $stock_movements = StockMovement::with(['product'])
                ->whereBetween('created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59'])
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
                    ->whereBetween('created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59'])
                    ->where('type', 'received')
                    ->sum('quantity');

                // Stock Adjustments in date range
                $adjustmentsIn = $product->stockMovements()
                    ->whereBetween('created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59'])
                    ->where('type', 'adjustment_in')
                    ->sum('quantity');

                $adjustmentsOut = $product->stockMovements()
                    ->whereBetween('created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59'])
                    ->where('type', 'adjustment_out')
                    ->sum('quantity');

                // Previous Stock
                $receivedBefore = $product->stockMovements()
                    ->where('created_at', '<', $startDate)
                    ->where('type', 'received')
                    ->sum('quantity');

                $adjustmentsInBefore = $product->stockMovements()
                    ->where('created_at', '<', $startDate)
                    ->where('type', 'adjustment_in')
                    ->sum('quantity');

                $adjustmentsOutBefore = $product->stockMovements()
                    ->where('created_at', '<', $startDate)
                    ->where('type', 'adjustment_out')
                    ->sum('quantity');

                $previousStock = $receivedBefore + $adjustmentsInBefore - $adjustmentsOutBefore;

                // Total Available = Previous + Received + Adjustments In - Adjustments Out
                $totalAvailable = $previousStock + $stockReceivedInRange + $adjustmentsIn - $adjustmentsOut;

                // Sales in date range by payment type
                $cashSales = $product->saleItems()
                    ->whereHas('sale', function ($q) use ($startDate, $endDate) {
                        $q->whereBetween('created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59'])
                            ->where('payment_type', 'cash');
                    })
                    ->sum('quantity');

                $creditSales = $product->saleItems()
                    ->whereHas('sale', function ($q) use ($startDate, $endDate) {
                        $q->whereBetween('created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59'])
                            ->where('payment_type', 'credit');
                    })
                    ->sum('quantity');

                $partialSales = $product->saleItems()
                    ->whereHas('sale', function ($q) use ($startDate, $endDate) {
                        $q->whereBetween('created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59'])
                            ->where('payment_type', 'partial');
                    })
                    ->sum('quantity');

                // Total sales in date range
                $totalSalesInRange = $cashSales + $creditSales + $partialSales;

                // Remaining stock
                $remainingStock = $totalAvailable - $totalSalesInRange;

                // Format corrections display - show summary instead of detailed list
                $correctionsDisplay = '';
                if ($adjustmentsIn > 0 || $adjustmentsOut > 0) {
                    $adjustmentCount = 0;
                    if ($adjustmentsIn > 0) $adjustmentCount++;
                    if ($adjustmentsOut > 0) $adjustmentCount++;
                    
                    if ($adjustmentCount === 2) {
                        $netAmount = $adjustmentsIn - $adjustmentsOut;
                        if ($netAmount > 0) {
                            $correctionsDisplay = "Net: Added " . StockHelper::formatCartonLine($netAmount, $product->lines_per_carton);
                        } elseif ($netAmount < 0) {
                            $correctionsDisplay = "Net: Reduced " . StockHelper::formatCartonLine(abs($netAmount), $product->lines_per_carton);
                        } else {
                            $correctionsDisplay = "Net: No change";
                        }
                    } elseif ($adjustmentsIn > 0) {
                        $correctionsDisplay = "Added " . StockHelper::formatCartonLine($adjustmentsIn, $product->lines_per_carton);
                    } elseif ($adjustmentsOut > 0) {
                        $correctionsDisplay = "Reduced " . StockHelper::formatCartonLine($adjustmentsOut, $product->lines_per_carton);
                    }
                } else {
                    $correctionsDisplay = "—";
                }

                $stock_activity_summary[] = [
                    'product' => $product->name,
                    'stock_received_today' => StockHelper::formatCartonLine($stockReceivedInRange, $product->lines_per_carton),
                    'corrections' => $correctionsDisplay,
                    'previous_stock' => StockHelper::formatCartonLine($previousStock, $product->lines_per_carton),
                    'total_available' => StockHelper::formatCartonLine($totalAvailable, $product->lines_per_carton),
                    'cash_sales' => StockHelper::formatCartonLine($cashSales, $product->lines_per_carton),
                    'credit_sales' => StockHelper::formatCartonLine($creditSales, $product->lines_per_carton),
                    'partial_sales' => StockHelper::formatCartonLine($partialSales, $product->lines_per_carton),
                    'total_sales' => StockHelper::formatCartonLine($totalSalesInRange, $product->lines_per_carton),
                    'remaining_stock' => StockHelper::formatCartonLine($remainingStock, $product->lines_per_carton),
                ];
            } else {
                // No date range - show current stock summary with all-time calculations
                // Calculate all-time values for display
                $totalReceived = $product->stockMovements()
                    ->where('type', 'received')
                    ->sum('quantity');

                $adjustmentsIn = $product->stockMovements()
                    ->where('type', 'adjustment_in')
                    ->sum('quantity');

                $adjustmentsOut = $product->stockMovements()
                    ->where('type', 'adjustment_out')
                    ->sum('quantity');

                // All-time sales
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

                $totalSales = $cashSales + $creditSales + $partialSales;

                // Previous stock calculation (stock at the beginning of today, before today's activities)
                $today = now()->toDateString();
                $receivedBeforeToday = $product->stockMovements()
                    ->where('created_at', '<', $today . ' 00:00:00')
                    ->where('type', 'received')
                    ->sum('quantity');

                $adjustmentsInBeforeToday = $product->stockMovements()
                    ->where('created_at', '<', $today . ' 00:00:00')
                    ->where('type', 'adjustment_in')
                    ->sum('quantity');

                $adjustmentsOutBeforeToday = $product->stockMovements()
                    ->where('created_at', '<', $today . ' 00:00:00')
                    ->where('type', 'adjustment_out')
                    ->sum('quantity');

                $previousStock = $receivedBeforeToday + $adjustmentsInBeforeToday - $adjustmentsOutBeforeToday;

                // Calculate today's stock received and adjustments
                $today = now()->toDateString();
                $stockReceivedToday = $product->stockMovements()
                    ->whereDate('created_at', $today)
                    ->where('type', 'received')
                    ->sum('quantity');

                $adjustmentsInToday = $product->stockMovements()
                    ->whereDate('created_at', $today)
                    ->where('type', 'adjustment_in')
                    ->sum('quantity');

                $adjustmentsOutToday = $product->stockMovements()
                    ->whereDate('created_at', $today)
                    ->where('type', 'adjustment_out')
                    ->sum('quantity');

                // Format corrections display - show summary instead of detailed list
                $correctionsDisplay = '';
                if ($adjustmentsInToday > 0 || $adjustmentsOutToday > 0) {
                    $adjustmentCount = 0;
                    if ($adjustmentsInToday > 0) $adjustmentCount++;
                    if ($adjustmentsOutToday > 0) $adjustmentCount++;
                    
                    if ($adjustmentCount === 2) {
                        $netAmount = $adjustmentsInToday - $adjustmentsOutToday;
                        if ($netAmount > 0) {
                            $correctionsDisplay = "Net: Added " . StockHelper::formatCartonLine($netAmount, $product->lines_per_carton);
                        } elseif ($netAmount < 0) {
                            $correctionsDisplay = "Net: Reduced " . StockHelper::formatCartonLine(abs($netAmount), $product->lines_per_carton);
                        } else {
                            $correctionsDisplay = "Net: No change";
                        }
                    } elseif ($adjustmentsInToday > 0) {
                        $correctionsDisplay = "Added " . StockHelper::formatCartonLine($adjustmentsInToday, $product->lines_per_carton);
                    } elseif ($adjustmentsOutToday > 0) {
                        $correctionsDisplay = "Reduced " . StockHelper::formatCartonLine($adjustmentsOutToday, $product->lines_per_carton);
                    }
                } else {
                    $correctionsDisplay = "—";
                }

                $stock_activity_summary[] = [
                    'product' => $product->name,
                    'stock_received_today' => StockHelper::formatCartonLine($stockReceivedToday, $product->lines_per_carton),
                    'corrections' => $correctionsDisplay,
                    'previous_stock' => StockHelper::formatCartonLine($previousStock, $product->lines_per_carton),
                    'total_available' => $product->current_stock_display,
                    'cash_sales' => StockHelper::formatCartonLine($cashSales, $product->lines_per_carton),
                    'credit_sales' => StockHelper::formatCartonLine($creditSales, $product->lines_per_carton),
                    'partial_sales' => StockHelper::formatCartonLine($partialSales, $product->lines_per_carton),
                    'total_sales' => StockHelper::formatCartonLine($totalSales, $product->lines_per_carton),
                    'remaining_stock' => $product->current_stock_display,
                ];
            }
        }

        return Inertia::render('stock-control', [
            'stock_movements' => $stock_movements,
            'products' => $products,
            'suppliers' => $suppliers,
            'stock_activity_summary' => $stock_activity_summary,
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

        StockMovement::create($validated);

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
        if (!in_array($stockMovement->type, ['adjustment_in', 'adjustment_out'])) {
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
            'physical_count' => 'required|string',
            'notes' => 'nullable|string',
            'current_system_stock' => 'required|string',
        ]);

        $product = Product::findOrFail($validated['product_id']);
        
        // Parse the carton/line format using StockHelper
        $systemStock = StockHelper::parseCartonLineFormat($validated['current_system_stock'], $product->lines_per_carton);
        $physicalCount = StockHelper::parseCartonLineFormat($validated['physical_count'], $product->lines_per_carton);
        
        if ($physicalCount === $systemStock) {
            return back()->with('error', 'Physical count matches system stock. No adjustment needed.');
        }
        
        if ($physicalCount > $systemStock) {
            // Stock increased - create adjustment_in movement
            $increaseAmount = $physicalCount - $systemStock;
            StockMovement::create([
                'product_id' => $validated['product_id'],
                'type' => 'adjustment_in',
                'quantity' => $increaseAmount,
                'notes' => $validated['notes'],
            ]);
            
            $message = 'Stock increased by ' . StockHelper::formatCartonLine($increaseAmount, $product->lines_per_carton);
        } else {
            // Stock decreased - create adjustment_out movement
            $decreaseAmount = $systemStock - $physicalCount;
            StockMovement::create([
                'product_id' => $validated['product_id'],
                'type' => 'adjustment_out',
                'quantity' => $decreaseAmount,
                'notes' => $validated['notes'],
            ]);
            
            $message = 'Stock decreased by ' . StockHelper::formatCartonLine($decreaseAmount, $product->lines_per_carton);
        }

        return back()->with('success', $message);
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
                ->where('created_at', '<', $date . ' 00:00:00')
                ->where('type', 'received')
                ->sum('quantity');
                

                
            $adjustmentsInBefore = $product->stockMovements()
                ->where('created_at', '<', $date . ' 00:00:00')
                ->where('type', 'adjustment_in')
                ->sum('quantity');
                
            $adjustmentsOutBefore = $product->stockMovements()
                ->where('created_at', '<', $date . ' 00:00:00')
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
