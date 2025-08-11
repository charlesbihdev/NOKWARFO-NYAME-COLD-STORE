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
        // Validate and parse dates
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');

        $today = now()->toDateString();

        // Default to today if no dates provided
        if (!$startDate && !$endDate) {
            $startDate = $today;
            $endDate = $today;
        } elseif ($startDate && !$endDate) {
            $endDate = $startDate;
        } elseif (!$startDate && $endDate) {
            $startDate = $endDate;
        }

        // Ensure startDate <= endDate
        if ($startDate > $endDate) {
            [$startDate, $endDate] = [$endDate, $startDate];
        }

        // Load data
        // $stock_movements = StockMovement::with(['product', 'supplier'])
        //     ->whereBetween('created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59'])
        //     ->orderByDesc('created_at')
        //     ->get();

        $stock_movements = StockMovement::with(['product', 'supplier'])
            ->whereBetween('created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59'])
            ->orderByDesc('created_at')
            ->get()
            ->map(function ($movement) {
                $movement->quantity_display = StockHelper::formatCartonLine(
                    $movement->quantity,
                    $movement->product->lines_per_carton
                );

                $movement->price_per_carton = StockHelper::pricePerCarton(
                    $movement->unit_cost,
                    $movement->product->lines_per_carton
                );

                return $movement;
            });


        // dd($stock_movements);


        $products = Product::with(['supplier', 'stockMovements'])->orderBy('name')->get();
        $suppliers = Supplier::where('is_active', true)->get();

        $stock_activity_summary = [];

        foreach ($products as $product) {
            // Stock Received in date range
            $stockReceivedInRange = $product->stockMovements()
                ->whereBetween('created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59'])
                ->where('type', 'received')
                ->sum('quantity');

            // Adjusted in date range
            $adjustedInRange = $product->stockMovements()
                ->whereBetween('created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59'])
                ->where('type', 'adjusted')
                ->sum('quantity');

            // Previous Stock
            $receivedBefore = $product->stockMovements()
                ->where('created_at', '<', $startDate)
                ->where('type', 'received')
                ->sum('quantity');

            $adjustedBefore = $product->stockMovements()
                ->where('created_at', '<', $startDate)
                ->where('type', 'adjusted')
                ->sum('quantity');

            $soldBefore = $product->stockMovements()
                ->where('created_at', '<', $startDate)
                ->where('type', 'sold')
                ->sum('quantity');

            $previousStock = $receivedBefore + $adjustedBefore - $soldBefore;

            // Total Available
            $totalAvailable = $previousStock + $stockReceivedInRange + $adjustedInRange;

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

            $totalSales = $cashSales + $creditSales + $partialSales;

            // Remaining Stock
            $remainingStock = $totalAvailable - $totalSales;

            // === Calculate full current stock in lines ===
            $currentStockLines = $product->stockMovements->reduce(function ($carry, $movement) {
                if (in_array($movement->type, ['in', 'received'])) {
                    return $carry + $movement->quantity;
                } elseif (in_array($movement->type, ['out', 'sold'])) {
                    return $carry - $movement->quantity;
                } elseif ($movement->type === 'adjusted') {
                    return $carry + $movement->quantity;
                }
                return $carry;
            }, 0);

            // Add formatted carton+line stock to product
            $product->current_stock_display = StockHelper::formatCartonLine($currentStockLines, $product->lines_per_carton);

            // Activity summary
            $stock_activity_summary[] = [
                'product' => $product->name,
                'stock_received_today' => StockHelper::formatCartonLine($stockReceivedInRange + $adjustedInRange, $product->lines_per_carton),
                'previous_stock' => StockHelper::formatCartonLine($previousStock, $product->lines_per_carton),
                'total_available' => StockHelper::formatCartonLine($totalAvailable, $product->lines_per_carton),
                'stock_available' => StockHelper::formatCartonLine($totalAvailable, $product->lines_per_carton),
                'cash_sales' => StockHelper::formatCartonLine($cashSales, $product->lines_per_carton),
                'credit_sales' => StockHelper::formatCartonLine($creditSales, $product->lines_per_carton),
                'partial_sales' => StockHelper::formatCartonLine($partialSales, $product->lines_per_carton),
                'total_sales' => StockHelper::formatCartonLine($totalSales, $product->lines_per_carton),
                'remaining_stock' => StockHelper::formatCartonLine($remainingStock, $product->lines_per_carton),
            ];
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
        $type = $request->input('type');

        $rules = [
            'product_id' => 'required|exists:products,id',
            'supplier_id' => 'nullable|exists:suppliers,id',
            'type' => 'required|in:received,sold,adjusted',
            'unit_cost' => 'nullable|numeric|min:0', // price per carton from user
            'total_cost' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:1000',
            'cartons' => 'nullable|integer|min:0', // cartons from user
            'lines' => 'nullable|integer|min:0',   // loose lines from user
        ];

        if ($type === 'adjusted') {
            $rules['quantity'] = 'nullable|integer|not_in:0';
        } else {
            $rules['quantity'] = 'nullable|integer|min:1';
        }

        $validated = $request->validate($rules);

        // Get product info
        $product = Product::findOrFail($validated['product_id']);

        // 1. Convert cartons + loose lines to total lines
        $totalLines = StockHelper::toLines(
            $validated['quantity'] ?? 0,
            $product->lines_per_carton
        );

        // 2. Store quantity in LINES
        $validated['quantity'] = $totalLines;

        // 3. Convert price per carton → price per line
        if (isset($validated['unit_cost']) && $validated['unit_cost'] !== null) {
            $unitCostCarton = $validated['unit_cost'];
            $unitCostLine = $unitCostCarton / max(1, $product->lines_per_carton); // avoid divide by zero
            $validated['unit_cost'] = $unitCostLine;
        }

        // 4. Calculate total cost if not provided
        if (!isset($validated['total_cost']) || $validated['total_cost'] === null) {
            $validated['total_cost'] = ($validated['unit_cost'] ?? 0) * abs($totalLines);
        }

        // Save
        StockMovement::create($validated);

        return redirect()->route('stock-control.index')
            ->with('success', 'Stock added Successfully.');
    }



    public function destroy($id)
    {
        $stockMovement = StockMovement::findOrFail($id);
        $stockMovement->delete();

        return redirect()->route('stock-control.index')
            ->with('success', 'Stock movement deleted successfully.');
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
                ->where('type', 'in')
                ->sum('quantity');
            // Previous stock (before today)
            $previousStock = $product->stockMovements()
                ->where('created_at', '<', $date . ' 00:00:00')
                ->whereIn('type', ['in', 'adjusted'])
                ->sum('quantity')
                - $product->stockMovements()
                ->where('created_at', '<', $date . ' 00:00:00')
                ->whereIn('type', ['out'])
                ->sum('quantity');
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
