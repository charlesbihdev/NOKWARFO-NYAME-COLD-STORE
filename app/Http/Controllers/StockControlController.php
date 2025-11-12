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

                // Check if there's a [set:available] adjustment on this date
                // Find the LAST [set:available] adjustment timestamp (Rule 3: only last adjustment matters)
                $lastSetAvailable = $product->stockMovements()
                    ->whereBetween('created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59'])
                    ->where(function ($q) {
                        $q->where('type', 'adjustment_in')
                            ->orWhere('type', 'adjustment_out');
                    })
                    ->where('notes', 'like', '%[set:available]%')
                    ->orderByDesc('created_at')
                    ->first();

                $lastAdjustmentTimestamp = $lastSetAvailable ? $lastSetAvailable->created_at : null;
                $hasSetAvailable = $lastSetAvailable !== null;

                // Stock Received in date range
                // Rule 3: If adjustment exists, only count received AFTER the last adjustment timestamp
                $stockReceivedQuery = $product->stockMovements()
                    ->whereBetween('created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59'])
                    ->where('type', 'received');

                if ($hasSetAvailable && $lastAdjustmentTimestamp) {
                    $stockReceivedQuery->where('created_at', '>', $lastAdjustmentTimestamp);
                }

                $stockReceivedInRange = $stockReceivedQuery->sum('quantity');

                // Stock Adjustments in date range (exclude set-tagged adjustments to avoid double-counting with baselines)
                // Rule 3: If adjustment exists, only count adjustments AFTER the last adjustment timestamp
                $adjustmentsInQuery = $product->stockMovements()
                    ->whereBetween('created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59'])
                    ->where('type', 'adjustment_in')
                    ->where(function ($q) {
                        $q->whereNull('notes')
                            ->orWhere(function ($q2) {
                                $q2->where('notes', 'not like', '%[set:available]%')
                                    ->where('notes', 'not like', '%[set:received]%');
                            });
                    });

                if ($hasSetAvailable && $lastAdjustmentTimestamp) {
                    $adjustmentsInQuery->where('created_at', '>', $lastAdjustmentTimestamp);
                }

                $adjustmentsIn = $adjustmentsInQuery->sum('quantity');

                $adjustmentsOutQuery = $product->stockMovements()
                    ->whereBetween('created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59'])
                    ->where('type', 'adjustment_out')
                    ->where(function ($q) {
                        $q->whereNull('notes')
                            ->orWhere(function ($q2) {
                                $q2->where('notes', 'not like', '%[set:available]%')
                                    ->where('notes', 'not like', '%[set:received]%');
                            });
                    });

                if ($hasSetAvailable && $lastAdjustmentTimestamp) {
                    $adjustmentsOutQuery->where('created_at', '>', $lastAdjustmentTimestamp);
                }

                $adjustmentsOut = $adjustmentsOutQuery->sum('quantity');

                // Calculate [set:available] adjustments (only the last one matters, but we sum for net value)
                $setAvailableIn = $product->stockMovements()
                    ->whereBetween('created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59'])
                    ->where('type', 'adjustment_in')
                    ->where('notes', 'like', '%[set:available]%')
                    ->sum('quantity');

                $setAvailableOut = $product->stockMovements()
                    ->whereBetween('created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59'])
                    ->where('type', 'adjustment_out')
                    ->where('notes', 'like', '%[set:available]%')
                    ->sum('quantity');

                if ($hasSetAvailable) {
                    // If there's a [set:available] adjustment today, use baseline calculation (excluding previous day's [set:available])
                    $receivedBefore = $product->stockMovements()
                        ->where('created_at', '<', $startDate . ' 00:00:00')
                        ->where('type', 'received')
                        ->sum('quantity');

                    $adjustmentsInBefore = $product->stockMovements()
                        ->where('created_at', '<', $startDate . ' 00:00:00')
                        ->where('type', 'adjustment_in')
                        ->where(function ($q) {
                            $q->whereNull('notes')
                                ->orWhere('notes', 'not like', '%[set:available]%');
                        })
                        ->sum('quantity');

                    $adjustmentsOutBefore = $product->stockMovements()
                        ->where('created_at', '<', $startDate . ' 00:00:00')
                        ->where('type', 'adjustment_out')
                        ->where(function ($q) {
                            $q->whereNull('notes')
                                ->orWhere('notes', 'not like', '%[set:available]%');
                        })
                        ->sum('quantity');

                    $baselineWithoutSet = $receivedBefore + $adjustmentsInBefore - $adjustmentsOutBefore;
                    $availableStock = $baselineWithoutSet + ($setAvailableIn - $setAvailableOut);
                } else {
                    // If there's NO [set:available] adjustment today, use previous day's Remaining Stock
                    $previousDate = now()->parse($startDate)->subDay()->toDateString();

                    // Calculate previous day's baseline (without [set:available])
                    $receivedBeforePrevious = $product->stockMovements()
                        ->where('created_at', '<', $previousDate . ' 00:00:00')
                        ->where('type', 'received')
                        ->sum('quantity');

                    $adjustmentsInBeforePrevious = $product->stockMovements()
                        ->where('created_at', '<', $previousDate . ' 00:00:00')
                        ->where('type', 'adjustment_in')
                        ->where(function ($q) {
                            $q->whereNull('notes')
                                ->orWhere('notes', 'not like', '%[set:available]%');
                        })
                        ->sum('quantity');

                    $adjustmentsOutBeforePrevious = $product->stockMovements()
                        ->where('created_at', '<', $previousDate . ' 00:00:00')
                        ->where('type', 'adjustment_out')
                        ->where(function ($q) {
                            $q->whereNull('notes')
                                ->orWhere('notes', 'not like', '%[set:available]%');
                        })
                        ->sum('quantity');

                    $baselineBeforePrevious = $receivedBeforePrevious + $adjustmentsInBeforePrevious - $adjustmentsOutBeforePrevious;

                    // Previous day's [set:available] adjustments
                    $previousDaySetAvailableIn = $product->stockMovements()
                        ->whereBetween('created_at', [$previousDate . ' 00:00:00', $previousDate . ' 23:59:59'])
                        ->where('type', 'adjustment_in')
                        ->where('notes', 'like', '%[set:available]%')
                        ->sum('quantity');

                    $previousDaySetAvailableOut = $product->stockMovements()
                        ->whereBetween('created_at', [$previousDate . ' 00:00:00', $previousDate . ' 23:59:59'])
                        ->where('type', 'adjustment_out')
                        ->where('notes', 'like', '%[set:available]%')
                        ->sum('quantity');

                    // Previous day's Available Stock
                    $previousDayAvailableStock = $baselineBeforePrevious + ($previousDaySetAvailableIn - $previousDaySetAvailableOut);

                    // Previous day's Stock Received (including [set:received])
                    $previousDayReceived = $product->stockMovements()
                        ->whereBetween('created_at', [$previousDate . ' 00:00:00', $previousDate . ' 23:59:59'])
                        ->where('type', 'received')
                        ->sum('quantity');

                    $previousDaySetReceivedIn = $product->stockMovements()
                        ->whereBetween('created_at', [$previousDate . ' 00:00:00', $previousDate . ' 23:59:59'])
                        ->where('type', 'adjustment_in')
                        ->where('notes', 'like', '%[set:received]%')
                        ->sum('quantity');

                    $previousDaySetReceivedOut = $product->stockMovements()
                        ->whereBetween('created_at', [$previousDate . ' 00:00:00', $previousDate . ' 23:59:59'])
                        ->where('type', 'adjustment_out')
                        ->where('notes', 'like', '%[set:received]%')
                        ->sum('quantity');

                    $previousDayStockReceived = $previousDayReceived + ($previousDaySetReceivedIn - $previousDaySetReceivedOut);

                    // Previous day's regular adjustments (excluding [set:*] tags)
                    $previousDayAdjustmentsIn = $product->stockMovements()
                        ->whereBetween('created_at', [$previousDate . ' 00:00:00', $previousDate . ' 23:59:59'])
                        ->where('type', 'adjustment_in')
                        ->where(function ($q) {
                            $q->whereNull('notes')
                                ->orWhere(function ($q2) {
                                    $q2->where('notes', 'not like', '%[set:available]%')
                                        ->where('notes', 'not like', '%[set:received]%');
                                });
                        })
                        ->sum('quantity');

                    $previousDayAdjustmentsOut = $product->stockMovements()
                        ->whereBetween('created_at', [$previousDate . ' 00:00:00', $previousDate . ' 23:59:59'])
                        ->where('type', 'adjustment_out')
                        ->where(function ($q) {
                            $q->whereNull('notes')
                                ->orWhere(function ($q2) {
                                    $q2->where('notes', 'not like', '%[set:available]%')
                                        ->where('notes', 'not like', '%[set:received]%');
                                });
                        })
                        ->sum('quantity');

                    // Previous day's Total Available Stock
                    $previousDayTotalAvailable = $previousDayAvailableStock + $previousDayStockReceived + $previousDayAdjustmentsIn - $previousDayAdjustmentsOut;

                    // Previous day's sales
                    $previousDaySales = $product->saleItems()
                        ->whereHas('sale', function ($q) use ($previousDate) {
                            $q->whereDate('created_at', $previousDate);
                        })
                        ->sum('quantity');

                    // Available Stock = previous day's Remaining Stock (no adjustment today)
                    $availableStock = $previousDayTotalAvailable - $previousDaySales;
                }

                // Previous Stock (for reference - includes all adjustments before date)
                // Note: Not used in display, but kept for potential future use
                $previousStock = $product->stockMovements()
                    ->where('created_at', '<=', $startDate . ' 00:00:00')
                    ->where('type', 'received')
                    ->sum('quantity') +
                    $product->stockMovements()
                    ->where('created_at', '<=', $startDate . ' 00:00:00')
                    ->where('type', 'adjustment_in')
                    ->sum('quantity') -
                    $product->stockMovements()
                    ->where('created_at', '<=', $startDate . ' 00:00:00')
                    ->where('type', 'adjustment_out')
                    ->sum('quantity');

                // Sales in date range by payment type
                // Rule 3: If adjustment exists, only count sales AFTER the last adjustment timestamp
                $cashSalesQuery = $product->saleItems()
                    ->whereHas('sale', function ($q) use ($startDate, $endDate, $hasSetAvailable, $lastAdjustmentTimestamp) {
                        $q->whereBetween('created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59'])
                            ->where('payment_type', 'cash');
                        if ($hasSetAvailable && $lastAdjustmentTimestamp) {
                            $q->where('created_at', '>', $lastAdjustmentTimestamp);
                        }
                    });
                $cashSales = $cashSalesQuery->sum('quantity');

                $creditSalesQuery = $product->saleItems()
                    ->whereHas('sale', function ($q) use ($startDate, $endDate, $hasSetAvailable, $lastAdjustmentTimestamp) {
                        $q->whereBetween('created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59'])
                            ->where('payment_type', 'credit');
                        if ($hasSetAvailable && $lastAdjustmentTimestamp) {
                            $q->where('created_at', '>', $lastAdjustmentTimestamp);
                        }
                    });
                $creditSales = $creditSalesQuery->sum('quantity');

                $partialSalesQuery = $product->saleItems()
                    ->whereHas('sale', function ($q) use ($startDate, $endDate, $hasSetAvailable, $lastAdjustmentTimestamp) {
                        $q->whereBetween('created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59'])
                            ->where('payment_type', 'partial');
                        if ($hasSetAvailable && $lastAdjustmentTimestamp) {
                            $q->where('created_at', '>', $lastAdjustmentTimestamp);
                        }
                    });
                $partialSales = $partialSalesQuery->sum('quantity');

                // Include any explicit received target adjustments in the displayed "Stock Received today"
                $setReceivedIn = $product->stockMovements()
                    ->whereBetween('created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59'])
                    ->where('type', 'adjustment_in')
                    ->where('notes', 'like', '%[set:received]%')
                    ->sum('quantity');

                $setReceivedOut = $product->stockMovements()
                    ->whereBetween('created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59'])
                    ->where('type', 'adjustment_out')
                    ->where('notes', 'like', '%[set:received]%')
                    ->sum('quantity');

                $stockReceivedDisplay = $stockReceivedInRange + ($setReceivedIn - $setReceivedOut);

                // Total sales in date range
                $totalSalesInRange = $cashSales + $creditSales + $partialSales;

                $stock_activity_summary[] = [
                    'product' => $product->name,
                    'stock_received_today' => StockHelper::formatCartonLine($stockReceivedDisplay, $product->lines_per_carton),
                    'previous_stock' => StockHelper::formatCartonLine($availableStock, $product->lines_per_carton), // Available Stock = what user set via [set:available]
                    // Total Available = Available Stock + Stock Received + Regular Adjustments
                    'total_available' => StockHelper::formatCartonLine($availableStock + $stockReceivedDisplay + $adjustmentsIn - $adjustmentsOut, $product->lines_per_carton),
                    'cash_sales' => StockHelper::formatCartonLine($cashSales, $product->lines_per_carton),
                    'credit_sales' => StockHelper::formatCartonLine($creditSales, $product->lines_per_carton),
                    'partial_sales' => StockHelper::formatCartonLine($partialSales, $product->lines_per_carton),
                    'total_sales' => StockHelper::formatCartonLine($totalSalesInRange, $product->lines_per_carton),
                    'remaining_stock' => StockHelper::formatCartonLine(($availableStock + $stockReceivedDisplay + $adjustmentsIn - $adjustmentsOut) - $totalSalesInRange, $product->lines_per_carton),
                ];
            } else {
                // Single-day summary for today (no date provided): mirror single-date logic
                $today = now()->toDateString();

                // Check if there's a [set:available] adjustment today
                // Find the LAST [set:available] adjustment timestamp (Rule 3: only last adjustment matters)
                $lastSetAvailable = $product->stockMovements()
                    ->whereBetween('created_at', [$today . ' 00:00:00', $today . ' 23:59:59'])
                    ->where(function ($q) {
                        $q->where('type', 'adjustment_in')
                            ->orWhere('type', 'adjustment_out');
                    })
                    ->where('notes', 'like', '%[set:available]%')
                    ->orderByDesc('created_at')
                    ->first();

                $lastAdjustmentTimestamp = $lastSetAvailable ? $lastSetAvailable->created_at : null;
                $hasSetAvailable = $lastSetAvailable !== null;

                // Calculate [set:available] adjustments (only the last one matters, but we sum for net value)
                $setAvailableIn = $product->stockMovements()
                    ->whereBetween('created_at', [$today . ' 00:00:00', $today . ' 23:59:59'])
                    ->where('type', 'adjustment_in')
                    ->where('notes', 'like', '%[set:available]%')
                    ->sum('quantity');

                $setAvailableOut = $product->stockMovements()
                    ->whereBetween('created_at', [$today . ' 00:00:00', $today . ' 23:59:59'])
                    ->where('type', 'adjustment_out')
                    ->where('notes', 'like', '%[set:available]%')
                    ->sum('quantity');

                if ($hasSetAvailable) {
                    // If there's a [set:available] adjustment today, use baseline calculation (excluding previous day's [set:available])
                    $receivedBefore = $product->stockMovements()
                        ->where('created_at', '<', $today . ' 00:00:00')
                        ->where('type', 'received')
                        ->sum('quantity');

                    $adjustmentsInBefore = $product->stockMovements()
                        ->where('created_at', '<', $today . ' 00:00:00')
                        ->where('type', 'adjustment_in')
                        ->where(function ($q) {
                            $q->whereNull('notes')
                                ->orWhere('notes', 'not like', '%[set:available]%');
                        })
                        ->sum('quantity');

                    $adjustmentsOutBefore = $product->stockMovements()
                        ->where('created_at', '<', $today . ' 00:00:00')
                        ->where('type', 'adjustment_out')
                        ->where(function ($q) {
                            $q->whereNull('notes')
                                ->orWhere('notes', 'not like', '%[set:available]%');
                        })
                        ->sum('quantity');

                    $baselineWithoutSet = $receivedBefore + $adjustmentsInBefore - $adjustmentsOutBefore;
                    $availableStock = $baselineWithoutSet + ($setAvailableIn - $setAvailableOut);
                } else {
                    // If there's NO [set:available] adjustment today, use yesterday's Remaining Stock
                    $yesterday = now()->parse($today)->subDay()->toDateString();

                    // Calculate yesterday's baseline (without [set:available])
                    $receivedBeforeYesterday = $product->stockMovements()
                        ->where('created_at', '<', $yesterday . ' 00:00:00')
                        ->where('type', 'received')
                        ->sum('quantity');

                    $adjustmentsInBeforeYesterday = $product->stockMovements()
                        ->where('created_at', '<', $yesterday . ' 00:00:00')
                        ->where('type', 'adjustment_in')
                        ->where(function ($q) {
                            $q->whereNull('notes')
                                ->orWhere('notes', 'not like', '%[set:available]%');
                        })
                        ->sum('quantity');

                    $adjustmentsOutBeforeYesterday = $product->stockMovements()
                        ->where('created_at', '<', $yesterday . ' 00:00:00')
                        ->where('type', 'adjustment_out')
                        ->where(function ($q) {
                            $q->whereNull('notes')
                                ->orWhere('notes', 'not like', '%[set:available]%');
                        })
                        ->sum('quantity');

                    $baselineBeforeYesterday = $receivedBeforeYesterday + $adjustmentsInBeforeYesterday - $adjustmentsOutBeforeYesterday;

                    // Yesterday's [set:available] adjustments
                    $yesterdaySetAvailableIn = $product->stockMovements()
                        ->whereBetween('created_at', [$yesterday . ' 00:00:00', $yesterday . ' 23:59:59'])
                        ->where('type', 'adjustment_in')
                        ->where('notes', 'like', '%[set:available]%')
                        ->sum('quantity');

                    $yesterdaySetAvailableOut = $product->stockMovements()
                        ->whereBetween('created_at', [$yesterday . ' 00:00:00', $yesterday . ' 23:59:59'])
                        ->where('type', 'adjustment_out')
                        ->where('notes', 'like', '%[set:available]%')
                        ->sum('quantity');

                    // Yesterday's Available Stock
                    $yesterdayAvailableStock = $baselineBeforeYesterday + ($yesterdaySetAvailableIn - $yesterdaySetAvailableOut);

                    // Yesterday's Stock Received (including [set:received])
                    $yesterdayReceived = $product->stockMovements()
                        ->whereBetween('created_at', [$yesterday . ' 00:00:00', $yesterday . ' 23:59:59'])
                        ->where('type', 'received')
                        ->sum('quantity');

                    $yesterdaySetReceivedIn = $product->stockMovements()
                        ->whereBetween('created_at', [$yesterday . ' 00:00:00', $yesterday . ' 23:59:59'])
                        ->where('type', 'adjustment_in')
                        ->where('notes', 'like', '%[set:received]%')
                        ->sum('quantity');

                    $yesterdaySetReceivedOut = $product->stockMovements()
                        ->whereBetween('created_at', [$yesterday . ' 00:00:00', $yesterday . ' 23:59:59'])
                        ->where('type', 'adjustment_out')
                        ->where('notes', 'like', '%[set:received]%')
                        ->sum('quantity');

                    $yesterdayStockReceived = $yesterdayReceived + ($yesterdaySetReceivedIn - $yesterdaySetReceivedOut);

                    // Yesterday's regular adjustments (excluding [set:*] tags)
                    $yesterdayAdjustmentsIn = $product->stockMovements()
                        ->whereBetween('created_at', [$yesterday . ' 00:00:00', $yesterday . ' 23:59:59'])
                        ->where('type', 'adjustment_in')
                        ->where(function ($q) {
                            $q->whereNull('notes')
                                ->orWhere(function ($q2) {
                                    $q2->where('notes', 'not like', '%[set:available]%')
                                        ->where('notes', 'not like', '%[set:received]%');
                                });
                        })
                        ->sum('quantity');

                    $yesterdayAdjustmentsOut = $product->stockMovements()
                        ->whereBetween('created_at', [$yesterday . ' 00:00:00', $yesterday . ' 23:59:59'])
                        ->where('type', 'adjustment_out')
                        ->where(function ($q) {
                            $q->whereNull('notes')
                                ->orWhere(function ($q2) {
                                    $q2->where('notes', 'not like', '%[set:available]%')
                                        ->where('notes', 'not like', '%[set:received]%');
                                });
                        })
                        ->sum('quantity');

                    // Yesterday's Total Available Stock
                    $yesterdayTotalAvailable = $yesterdayAvailableStock + $yesterdayStockReceived + $yesterdayAdjustmentsIn - $yesterdayAdjustmentsOut;

                    // Yesterday's sales
                    $yesterdaySales = $product->saleItems()
                        ->whereHas('sale', function ($q) use ($yesterday) {
                            $q->whereDate('created_at', $yesterday);
                        })
                        ->sum('quantity');

                    // Available Stock = yesterday's Remaining Stock (no adjustment today)
                    $availableStock = $yesterdayTotalAvailable - $yesterdaySales;
                }

                // Previous Stock (for reference - includes all adjustments before today)
                $previousStock = $product->stockMovements()
                    ->where('created_at', '<=', $today . ' 00:00:00')
                    ->where('type', 'received')
                    ->sum('quantity') +
                    $product->stockMovements()
                    ->where('created_at', '<=', $today . ' 00:00:00')
                    ->where('type', 'adjustment_in')
                    ->sum('quantity') -
                    $product->stockMovements()
                    ->where('created_at', '<=', $today . ' 00:00:00')
                    ->where('type', 'adjustment_out')
                    ->sum('quantity');

                // Received today including [set:received] deltas
                // Rule 3: If adjustment exists, only count received AFTER the last adjustment timestamp
                $receivedTodayQuery = $product->stockMovements()
                    ->whereBetween('created_at', [$today . ' 00:00:00', $today . ' 23:59:59'])
                    ->where('type', 'received');

                if ($hasSetAvailable && $lastAdjustmentTimestamp) {
                    $receivedTodayQuery->where('created_at', '>', $lastAdjustmentTimestamp);
                }

                $receivedToday = $receivedTodayQuery->sum('quantity');

                $setReceivedIn = $product->stockMovements()
                    ->whereBetween('created_at', [$today . ' 00:00:00', $today . ' 23:59:59'])
                    ->where('type', 'adjustment_in')
                    ->where('notes', 'like', '%[set:received]%')
                    ->sum('quantity');
                $setReceivedOut = $product->stockMovements()
                    ->whereBetween('created_at', [$today . ' 00:00:00', $today . ' 23:59:59'])
                    ->where('type', 'adjustment_out')
                    ->where('notes', 'like', '%[set:received]%')
                    ->sum('quantity');
                $receivedDisplay = $receivedToday + ($setReceivedIn - $setReceivedOut);

                // Adjustments today excluding set tags
                // Rule 3: If adjustment exists, only count adjustments AFTER the last adjustment timestamp
                $adjustmentsInTodayQuery = $product->stockMovements()
                    ->whereBetween('created_at', [$today . ' 00:00:00', $today . ' 23:59:59'])
                    ->where('type', 'adjustment_in')
                    ->where(function ($q) {
                        $q->whereNull('notes')
                            ->orWhere(function ($q2) {
                                $q2->where('notes', 'not like', '%[set:available]%')
                                    ->where('notes', 'not like', '%[set:received]%');
                            });
                    });

                if ($hasSetAvailable && $lastAdjustmentTimestamp) {
                    $adjustmentsInTodayQuery->where('created_at', '>', $lastAdjustmentTimestamp);
                }

                $adjustmentsInToday = $adjustmentsInTodayQuery->sum('quantity');

                $adjustmentsOutTodayQuery = $product->stockMovements()
                    ->whereBetween('created_at', [$today . ' 00:00:00', $today . ' 23:59:59'])
                    ->where('type', 'adjustment_out')
                    ->where(function ($q) {
                        $q->whereNull('notes')
                            ->orWhere(function ($q2) {
                                $q2->where('notes', 'not like', '%[set:available]%')
                                    ->where('notes', 'not like', '%[set:received]%');
                            });
                    });

                if ($hasSetAvailable && $lastAdjustmentTimestamp) {
                    $adjustmentsOutTodayQuery->where('created_at', '>', $lastAdjustmentTimestamp);
                }

                $adjustmentsOutToday = $adjustmentsOutTodayQuery->sum('quantity');

                // Sales today
                // Rule 3: If adjustment exists, only count sales AFTER the last adjustment timestamp
                $cashSalesQuery = $product->saleItems()
                    ->whereHas('sale', function ($q) use ($today, $hasSetAvailable, $lastAdjustmentTimestamp) {
                        $q->whereDate('created_at', $today)->where('payment_type', 'cash');
                        if ($hasSetAvailable && $lastAdjustmentTimestamp) {
                            $q->where('created_at', '>', $lastAdjustmentTimestamp);
                        }
                    });
                $cashSales = $cashSalesQuery->sum('quantity');

                $creditSalesQuery = $product->saleItems()
                    ->whereHas('sale', function ($q) use ($today, $hasSetAvailable, $lastAdjustmentTimestamp) {
                        $q->whereDate('created_at', $today)->where('payment_type', 'credit');
                        if ($hasSetAvailable && $lastAdjustmentTimestamp) {
                            $q->where('created_at', '>', $lastAdjustmentTimestamp);
                        }
                    });
                $creditSales = $creditSalesQuery->sum('quantity');

                $partialSalesQuery = $product->saleItems()
                    ->whereHas('sale', function ($q) use ($today, $hasSetAvailable, $lastAdjustmentTimestamp) {
                        $q->whereDate('created_at', $today)->where('payment_type', 'partial');
                        if ($hasSetAvailable && $lastAdjustmentTimestamp) {
                            $q->where('created_at', '>', $lastAdjustmentTimestamp);
                        }
                    });
                $partialSales = $partialSalesQuery->sum('quantity');
                $totalSalesToday = $cashSales + $creditSales + $partialSales;

                $totalAvailable = $availableStock + $receivedDisplay + $adjustmentsInToday - $adjustmentsOutToday;
                $remaining = $totalAvailable - $totalSalesToday;

                $stock_activity_summary[] = [
                    'product' => $product->name,
                    'stock_received_today' => StockHelper::formatCartonLine($receivedDisplay, $product->lines_per_carton),
                    'previous_stock' => StockHelper::formatCartonLine($availableStock, $product->lines_per_carton), // Available Stock = what user set via [set:available]
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
        $movement->created_at = $validated['date'] . ' 12:00:00';
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

        // 1) Compute current Available display at start of day
        // Use the same logic as index() method: if no adjustment exists yet, use previous day's Remaining Stock
        // Check if there's already a [set:available] adjustment on this date (BEFORE deletion)
        $existingSetAvailable = $product->stockMovements()
            ->whereBetween('created_at', [$date . ' 00:00:00', $date . ' 23:59:59'])
            ->where(function ($q) {
                $q->where('type', 'adjustment_in')
                    ->orWhere('type', 'adjustment_out');
            })
            ->where('notes', 'like', '%[set:available]%')
            ->exists();

        // Delete all existing [set:available] and [set:received] adjustments for this date
        // This allows multiple overrides on the same day - each adjustment replaces previous ones
        $product->stockMovements()
            ->whereBetween('created_at', [$date . ' 00:00:00', $date . ' 23:59:59'])
            ->where(function ($q) {
                $q->where('notes', 'like', '%[set:available]%')
                    ->orWhere('notes', 'like', '%[set:received]%');
            })
            ->delete();

        if ($existingSetAvailable) {
            // If adjustment exists, use baseline calculation (excluding previous day's [set:available])
            $receivedBefore = $product->stockMovements()
                ->where('created_at', '<', $date . ' 00:00:00')
                ->where('type', 'received');
            $adjustInBefore = $product->stockMovements()
                ->where('created_at', '<', $date . ' 00:00:00')
                ->where('type', 'adjustment_in')
                ->where(function ($q) {
                    $q->whereNull('notes')
                        ->orWhere('notes', 'not like', '%[set:available]%');
                });
            $adjustOutBefore = $product->stockMovements()
                ->where('created_at', '<', $date . ' 00:00:00')
                ->where('type', 'adjustment_out')
                ->where(function ($q) {
                    $q->whereNull('notes')
                        ->orWhere('notes', 'not like', '%[set:available]%');
                });
            $baselineWithoutSet = $sumMovements($receivedBefore) + $sumMovements($adjustInBefore) - $sumMovements($adjustOutBefore);

            $setAvailInSoFar = $sumMovements(
                $product->stockMovements()
                    ->whereBetween('created_at', [$date . ' 00:00:00', $date . ' 23:59:59'])
                    ->where('type', 'adjustment_in')
                    ->where('notes', 'like', '%[set:available]%')
            );
            $setAvailOutSoFar = $sumMovements(
                $product->stockMovements()
                    ->whereBetween('created_at', [$date . ' 00:00:00', $date . ' 23:59:59'])
                    ->where('type', 'adjustment_out')
                    ->where('notes', 'like', '%[set:available]%')
            );
            $currentAvailableDisplay = $baselineWithoutSet + ($setAvailInSoFar - $setAvailOutSoFar);
        } else {
            // If NO adjustment exists yet, use previous day's Remaining Stock (same as index() method)
            $previousDate = now()->parse($date)->subDay()->toDateString();

            // Calculate previous day's baseline (without [set:available])
            $receivedBeforePrevious = $product->stockMovements()
                ->where('created_at', '<', $previousDate . ' 00:00:00')
                ->where('type', 'received');
            $adjustInBeforePrevious = $product->stockMovements()
                ->where('created_at', '<', $previousDate . ' 00:00:00')
                ->where('type', 'adjustment_in')
                ->where(function ($q) {
                    $q->whereNull('notes')
                        ->orWhere('notes', 'not like', '%[set:available]%');
                });
            $adjustOutBeforePrevious = $product->stockMovements()
                ->where('created_at', '<', $previousDate . ' 00:00:00')
                ->where('type', 'adjustment_out')
                ->where(function ($q) {
                    $q->whereNull('notes')
                        ->orWhere('notes', 'not like', '%[set:available]%');
                });
            $baselineBeforePrevious = $sumMovements($receivedBeforePrevious) + $sumMovements($adjustInBeforePrevious) - $sumMovements($adjustOutBeforePrevious);

            // Previous day's [set:available] adjustments
            $previousDaySetAvailableIn = $sumMovements(
                $product->stockMovements()
                    ->whereBetween('created_at', [$previousDate . ' 00:00:00', $previousDate . ' 23:59:59'])
                    ->where('type', 'adjustment_in')
                    ->where('notes', 'like', '%[set:available]%')
            );
            $previousDaySetAvailableOut = $sumMovements(
                $product->stockMovements()
                    ->whereBetween('created_at', [$previousDate . ' 00:00:00', $previousDate . ' 23:59:59'])
                    ->where('type', 'adjustment_out')
                    ->where('notes', 'like', '%[set:available]%')
            );
            $previousDayAvailableStock = $baselineBeforePrevious + ($previousDaySetAvailableIn - $previousDaySetAvailableOut);

            // Previous day's Stock Received (including [set:received])
            $previousDayReceived = $sumMovements(
                $product->stockMovements()
                    ->whereBetween('created_at', [$previousDate . ' 00:00:00', $previousDate . ' 23:59:59'])
                    ->where('type', 'received')
            );
            $previousDaySetReceivedIn = $sumMovements(
                $product->stockMovements()
                    ->whereBetween('created_at', [$previousDate . ' 00:00:00', $previousDate . ' 23:59:59'])
                    ->where('type', 'adjustment_in')
                    ->where('notes', 'like', '%[set:received]%')
            );
            $previousDaySetReceivedOut = $sumMovements(
                $product->stockMovements()
                    ->whereBetween('created_at', [$previousDate . ' 00:00:00', $previousDate . ' 23:59:59'])
                    ->where('type', 'adjustment_out')
                    ->where('notes', 'like', '%[set:received]%')
            );
            $previousDayStockReceived = $previousDayReceived + ($previousDaySetReceivedIn - $previousDaySetReceivedOut);

            // Previous day's regular adjustments (excluding [set:*] tags)
            $previousDayAdjustmentsIn = $sumMovements(
                $product->stockMovements()
                    ->whereBetween('created_at', [$previousDate . ' 00:00:00', $previousDate . ' 23:59:59'])
                    ->where('type', 'adjustment_in')
                    ->where(function ($q) {
                        $q->whereNull('notes')
                            ->orWhere(function ($q2) {
                                $q2->where('notes', 'not like', '%[set:available]%')
                                    ->where('notes', 'not like', '%[set:received]%');
                            });
                    })
            );
            $previousDayAdjustmentsOut = $sumMovements(
                $product->stockMovements()
                    ->whereBetween('created_at', [$previousDate . ' 00:00:00', $previousDate . ' 23:59:59'])
                    ->where('type', 'adjustment_out')
                    ->where(function ($q) {
                        $q->whereNull('notes')
                            ->orWhere(function ($q2) {
                                $q2->where('notes', 'not like', '%[set:available]%')
                                    ->where('notes', 'not like', '%[set:received]%');
                            });
                    })
            );

            // Previous day's Total Available Stock
            $previousDayTotalAvailable = $previousDayAvailableStock + $previousDayStockReceived + $previousDayAdjustmentsIn - $previousDayAdjustmentsOut;

            // Previous day's sales
            $previousDaySales = $product->saleItems()
                ->whereHas('sale', function ($q) use ($previousDate) {
                    $q->whereDate('created_at', $previousDate);
                })
                ->sum('quantity');

            // Current Available Display = previous day's Remaining Stock (no adjustment on target date yet)
            $currentAvailableDisplay = $previousDayTotalAvailable - $previousDaySales;
        }

        // 2) Compute current Received display on date (receivedRaw + netSetReceivedSoFar)
        $receivedRaw = $sumMovements(
            $product->stockMovements()->whereBetween('created_at', [$date . ' 00:00:00', $date . ' 23:59:59'])->where('type', 'received')
        );
        $setRecvInSoFar = $sumMovements(
            $product->stockMovements()->whereBetween('created_at', [$date . ' 00:00:00', $date . ' 23:59:59'])
                ->where('type', 'adjustment_in')
                ->where('notes', 'like', '%[set:received]%')
        );
        $setRecvOutSoFar = $sumMovements(
            $product->stockMovements()->whereBetween('created_at', [$date . ' 00:00:00', $date . ' 23:59:59'])
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
                    'notes' => trim('[set:available] ' . ($notes ?? '')),
                ]);
                // Set at start of day to affect baseline
                $movement->created_at = $date . ' 00:00:00';
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
                    'notes' => trim('[set:received] ' . ($notes ?? '')),
                ]);
                // Mid-day so it's clearly on the date
                $movement->created_at = $date . ' 12:00:00';
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
