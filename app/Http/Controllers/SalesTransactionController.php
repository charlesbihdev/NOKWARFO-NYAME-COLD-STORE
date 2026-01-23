<?php

namespace App\Http\Controllers;

use App\Helpers\StockHelper;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;

class SalesTransactionController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->input('search');
        $startDate = $request->input('start_date') ?? now()->subDays(30)->toDateString(); // 31 days ago (today - 2)
        $endDate = $request->input('end_date') ?? now()->toDateString(); // today

        $query = Sale::with(['customer', 'saleItems.product'])
            ->whereDate('created_at', '>=', $startDate)
            ->whereDate('created_at', '<=', $endDate)
            ->orderByDesc('created_at');

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('transaction_id', 'like', "%{$search}%")
                    ->orWhereHas('customer', function ($q2) use ($search) {
                        $q2->where('name', 'like', "%{$search}%");
                    })
                    ->orWhereHas('saleItems.product', function ($q3) use ($search) {
                        $q3->where('name', 'like', "%{$search}%");
                    });
            });
        }

        $sales = $query->paginate(30);

        $products = Product::orderBy('name')->get();
        $customers = Customer::orderBy('name')->get();

        $sales_transactions = $sales->through(function ($sale) {
            $profit = $sale->saleItems->sum(function ($item) {
                return ($item->unit_selling_price - $item->unit_cost_price) * $item->quantity;
            });

            return [
                'id' => $sale->transaction_id,
                'date' => $sale->created_at->format('Y-m-d'),
                'customer' => $sale->customer ? $sale->customer->name : $sale->customer_name,
                'total' => $sale->total,
                'payment_type' => ucfirst($sale->payment_type),
                'status' => ucfirst($sale->status),
                'amount_paid' => $sale->amount_paid,
                'amount_owed' => $sale->total - $sale->amount_paid,
                'profit' => $profit,
                'sale_items' => $sale->saleItems->map(function ($item) {
                    return [
                        'product' => $item->product_name,
                        'quantity' => StockHelper::formatCartonLine($item->quantity, $item->product->lines_per_carton ?? 1),
                        'unit_selling_price' => StockHelper::pricePerCarton($item->unit_selling_price, $item->product->lines_per_carton ?? 1),
                        'unit_cost_price' => StockHelper::pricePerCarton($item->unit_cost_price, $item->product->lines_per_carton ?? 1),
                        'total' => $item->total,
                    ];
                }),
            ];
        });

        return Inertia::render('sales-transactions', [
            'sales_transactions' => $sales_transactions,
            'products' => $products,
            'customers' => $customers,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_id' => 'nullable|exists:customers,id',
            'customer_name' => 'nullable|string|max:255',
            'transaction_date' => 'required|date',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.qty' => 'required|integer|min:1', // qty in lines (smallest unit)
            'items.*.unit_selling_price' => 'required|numeric|min:0', // price per carton from frontend
            'items.*.total' => 'required|numeric|min:0',
            'amount_paid' => 'required|numeric|min:0',
            'payment_type' => 'required|in:cash,credit,partial',
        ]);

        // Validate customer requirements based on payment type
        if (in_array($validated['payment_type'], ['credit', 'partial'])) {
            // Credit and partial sales MUST have a registered customer (for tracking who owes money)
            if (empty($validated['customer_id'])) {
                return redirect()->back()->withErrors([
                    'customer_id' => 'Credit and partial sales require selecting a registered customer. You cannot use a custom name for credit transactions.',
                ])->withInput();
            }
        } else {
            // Cash sales can use either customer_id OR customer_name (walk-in customers allowed)
            if (! isset($validated['customer_id']) && empty($validated['customer_name'])) {
                return redirect()->back()->withErrors([
                    'customer_id' => 'Either select a customer or enter a customer name.',
                ])->withInput();
            }
        }

        // Load all products involved at once to avoid repeated DB queries
        $productIds = collect($validated['items'])->pluck('product_id')->unique();
        $products = Product::whereIn('id', $productIds)->get()->keyBy('id');

        // Validate stock availability and prepare unit_selling_price per line
        // Following the stock adjustment logic from STOCK_ADJUSTMENT_LOGIC.md
        $transactionDate = $validated['transaction_date'];

        foreach ($validated['items'] as &$item) {
            $product = $products[$item['product_id']];
            $linesPerCarton = $product->lines_per_carton ?? 1;

            // Calculate available stock using adjustment-aware logic (same as StockControlController)
            // Step 1: Check if there's a [set:available] adjustment on the transaction date
            $lastSetAvailable = $product->stockMovements()
                ->whereBetween('created_at', [$transactionDate.' 00:00:00', $transactionDate.' 23:59:59'])
                ->where(function ($q) {
                    $q->where('type', 'adjustment_in')
                        ->orWhere('type', 'adjustment_out');
                })
                ->where('notes', 'like', '%[set:available]%')
                ->orderByDesc('created_at')
                ->first();

            $lastAdjustmentTimestamp = $lastSetAvailable ? $lastSetAvailable->created_at : null;
            $hasSetAvailable = $lastSetAvailable !== null;

            if ($hasSetAvailable) {
                // Scenario A: Adjustment exists - use adjustment logic
                // Calculate baseline before date (excluding [set:available] tags)
                $receivedBefore = $product->stockMovements()
                    ->where('created_at', '<', $transactionDate.' 00:00:00')
                    ->where('type', 'received')
                    ->sum('quantity');

                $adjustmentsInBefore = $product->stockMovements()
                    ->where('created_at', '<', $transactionDate.' 00:00:00')
                    ->where('type', 'adjustment_in')
                    ->where(function ($q) {
                        $q->whereNull('notes')
                            ->orWhere('notes', 'not like', '%[set:available]%');
                    })
                    ->sum('quantity');

                $adjustmentsOutBefore = $product->stockMovements()
                    ->where('created_at', '<', $transactionDate.' 00:00:00')
                    ->where('type', 'adjustment_out')
                    ->where(function ($q) {
                        $q->whereNull('notes')
                            ->orWhere('notes', 'not like', '%[set:available]%');
                    })
                    ->sum('quantity');

                $baselineWithoutSet = $receivedBefore + $adjustmentsInBefore - $adjustmentsOutBefore;

                // Get [set:available] adjustment value
                $setAvailableIn = $product->stockMovements()
                    ->whereBetween('created_at', [$transactionDate.' 00:00:00', $transactionDate.' 23:59:59'])
                    ->where('type', 'adjustment_in')
                    ->where('notes', 'like', '%[set:available]%')
                    ->sum('quantity');

                $setAvailableOut = $product->stockMovements()
                    ->whereBetween('created_at', [$transactionDate.' 00:00:00', $transactionDate.' 23:59:59'])
                    ->where('type', 'adjustment_out')
                    ->where('notes', 'like', '%[set:available]%')
                    ->sum('quantity');

                $availableStock = $baselineWithoutSet + ($setAvailableIn - $setAvailableOut);

                // Add stock received on transaction date (only AFTER adjustment)
                $stockReceivedAfter = $product->stockMovements()
                    ->whereBetween('created_at', [$transactionDate.' 00:00:00', $transactionDate.' 23:59:59'])
                    ->where('type', 'received')
                    ->where('created_at', '>', $lastAdjustmentTimestamp)
                    ->sum('quantity');

                // Add [set:received] adjustments
                $setReceivedIn = $product->stockMovements()
                    ->whereBetween('created_at', [$transactionDate.' 00:00:00', $transactionDate.' 23:59:59'])
                    ->where('type', 'adjustment_in')
                    ->where('notes', 'like', '%[set:received]%')
                    ->sum('quantity');

                $setReceivedOut = $product->stockMovements()
                    ->whereBetween('created_at', [$transactionDate.' 00:00:00', $transactionDate.' 23:59:59'])
                    ->where('type', 'adjustment_out')
                    ->where('notes', 'like', '%[set:received]%')
                    ->sum('quantity');

                $stockReceivedDisplay = $stockReceivedAfter + ($setReceivedIn - $setReceivedOut);

                // Add normal adjustments on transaction date (only AFTER adjustment)
                $adjustmentsInToday = $product->stockMovements()
                    ->whereBetween('created_at', [$transactionDate.' 00:00:00', $transactionDate.' 23:59:59'])
                    ->where('type', 'adjustment_in')
                    ->where('created_at', '>', $lastAdjustmentTimestamp)
                    ->where(function ($q) {
                        $q->whereNull('notes')
                            ->orWhere(function ($q2) {
                                $q2->where('notes', 'not like', '%[set:available]%')
                                    ->where('notes', 'not like', '%[set:received]%');
                            });
                    })
                    ->sum('quantity');

                $adjustmentsOutToday = $product->stockMovements()
                    ->whereBetween('created_at', [$transactionDate.' 00:00:00', $transactionDate.' 23:59:59'])
                    ->where('type', 'adjustment_out')
                    ->where('created_at', '>', $lastAdjustmentTimestamp)
                    ->where(function ($q) {
                        $q->whereNull('notes')
                            ->orWhere(function ($q2) {
                                $q2->where('notes', 'not like', '%[set:available]%')
                                    ->where('notes', 'not like', '%[set:received]%');
                            });
                    })
                    ->sum('quantity');

                // Subtract sales on transaction date (only AFTER adjustment)
                $salesAfterAdjustment = $product->saleItems()
                    ->whereHas('sale', function ($q) use ($transactionDate, $lastAdjustmentTimestamp) {
                        $q->whereDate('created_at', $transactionDate)
                            ->where('created_at', '>', $lastAdjustmentTimestamp);
                    })
                    ->sum('quantity');

                $totalAvailable = $availableStock + $stockReceivedDisplay + $adjustmentsInToday - $adjustmentsOutToday - $salesAfterAdjustment;
            } else {
                // Scenario B: No adjustment - use previous day's remaining stock
                $previousDate = now()->parse($transactionDate)->subDay()->toDateString();

                // Calculate previous day's baseline (without [set:available])
                $receivedBeforePrevious = $product->stockMovements()
                    ->where('created_at', '<', $previousDate.' 00:00:00')
                    ->where('type', 'received')
                    ->sum('quantity');

                $adjustmentsInBeforePrevious = $product->stockMovements()
                    ->where('created_at', '<', $previousDate.' 00:00:00')
                    ->where('type', 'adjustment_in')
                    ->where(function ($q) {
                        $q->whereNull('notes')
                            ->orWhere('notes', 'not like', '%[set:available]%');
                    })
                    ->sum('quantity');

                $adjustmentsOutBeforePrevious = $product->stockMovements()
                    ->where('created_at', '<', $previousDate.' 00:00:00')
                    ->where('type', 'adjustment_out')
                    ->where(function ($q) {
                        $q->whereNull('notes')
                            ->orWhere('notes', 'not like', '%[set:available]%');
                    })
                    ->sum('quantity');

                $baselineBeforePrevious = $receivedBeforePrevious + $adjustmentsInBeforePrevious - $adjustmentsOutBeforePrevious;

                // Previous day's [set:available] adjustments
                $previousDaySetAvailableIn = $product->stockMovements()
                    ->whereBetween('created_at', [$previousDate.' 00:00:00', $previousDate.' 23:59:59'])
                    ->where('type', 'adjustment_in')
                    ->where('notes', 'like', '%[set:available]%')
                    ->sum('quantity');

                $previousDaySetAvailableOut = $product->stockMovements()
                    ->whereBetween('created_at', [$previousDate.' 00:00:00', $previousDate.' 23:59:59'])
                    ->where('type', 'adjustment_out')
                    ->where('notes', 'like', '%[set:available]%')
                    ->sum('quantity');

                $previousDayAvailableStock = $baselineBeforePrevious + ($previousDaySetAvailableIn - $previousDaySetAvailableOut);

                // Previous day's Stock Received
                $previousDayReceived = $product->stockMovements()
                    ->whereBetween('created_at', [$previousDate.' 00:00:00', $previousDate.' 23:59:59'])
                    ->where('type', 'received')
                    ->sum('quantity');

                $previousDaySetReceivedIn = $product->stockMovements()
                    ->whereBetween('created_at', [$previousDate.' 00:00:00', $previousDate.' 23:59:59'])
                    ->where('type', 'adjustment_in')
                    ->where('notes', 'like', '%[set:received]%')
                    ->sum('quantity');

                $previousDaySetReceivedOut = $product->stockMovements()
                    ->whereBetween('created_at', [$previousDate.' 00:00:00', $previousDate.' 23:59:59'])
                    ->where('type', 'adjustment_out')
                    ->where('notes', 'like', '%[set:received]%')
                    ->sum('quantity');

                $previousDayStockReceived = $previousDayReceived + ($previousDaySetReceivedIn - $previousDaySetReceivedOut);

                // Previous day's regular adjustments
                $previousDayAdjustmentsIn = $product->stockMovements()
                    ->whereBetween('created_at', [$previousDate.' 00:00:00', $previousDate.' 23:59:59'])
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
                    ->whereBetween('created_at', [$previousDate.' 00:00:00', $previousDate.' 23:59:59'])
                    ->where('type', 'adjustment_out')
                    ->where(function ($q) {
                        $q->whereNull('notes')
                            ->orWhere(function ($q2) {
                                $q2->where('notes', 'not like', '%[set:available]%')
                                    ->where('notes', 'not like', '%[set:received]%');
                            });
                    })
                    ->sum('quantity');

                $previousDayTotalAvailable = $previousDayAvailableStock + $previousDayStockReceived + $previousDayAdjustmentsIn - $previousDayAdjustmentsOut;

                // Previous day's sales
                $previousDaySales = $product->saleItems()
                    ->whereHas('sale', function ($q) use ($previousDate) {
                        $q->whereDate('created_at', $previousDate);
                    })
                    ->sum('quantity');

                $availableStock = $previousDayTotalAvailable - $previousDaySales;

                // Add today's movements
                $stockReceivedToday = $product->stockMovements()
                    ->whereBetween('created_at', [$transactionDate.' 00:00:00', $transactionDate.' 23:59:59'])
                    ->where('type', 'received')
                    ->sum('quantity');

                $setReceivedIn = $product->stockMovements()
                    ->whereBetween('created_at', [$transactionDate.' 00:00:00', $transactionDate.' 23:59:59'])
                    ->where('type', 'adjustment_in')
                    ->where('notes', 'like', '%[set:received]%')
                    ->sum('quantity');

                $setReceivedOut = $product->stockMovements()
                    ->whereBetween('created_at', [$transactionDate.' 00:00:00', $transactionDate.' 23:59:59'])
                    ->where('type', 'adjustment_out')
                    ->where('notes', 'like', '%[set:received]%')
                    ->sum('quantity');

                $stockReceivedDisplay = $stockReceivedToday + ($setReceivedIn - $setReceivedOut);

                $adjustmentsInToday = $product->stockMovements()
                    ->whereBetween('created_at', [$transactionDate.' 00:00:00', $transactionDate.' 23:59:59'])
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
                    ->whereBetween('created_at', [$transactionDate.' 00:00:00', $transactionDate.' 23:59:59'])
                    ->where('type', 'adjustment_out')
                    ->where(function ($q) {
                        $q->whereNull('notes')
                            ->orWhere(function ($q2) {
                                $q2->where('notes', 'not like', '%[set:available]%')
                                    ->where('notes', 'not like', '%[set:received]%');
                            });
                    })
                    ->sum('quantity');

                // Subtract today's sales
                $salesToday = $product->saleItems()
                    ->whereHas('sale', function ($q) use ($transactionDate) {
                        $q->whereDate('created_at', $transactionDate);
                    })
                    ->sum('quantity');

                $totalAvailable = $availableStock + $stockReceivedDisplay + $adjustmentsInToday - $adjustmentsOutToday - $salesToday;
            }

            // Check if sufficient stock is available
            if ($totalAvailable < $item['qty']) {
                $availableFormatted = StockHelper::formatCartonLine($totalAvailable, $linesPerCarton);
                $requestedFormatted = StockHelper::formatCartonLine($item['qty'], $linesPerCarton);

                return redirect()->back()->withErrors([
                    'items' => "Insufficient stock for product '{$product->name}'. Available: {$availableFormatted}, Requested: {$requestedFormatted}",
                ])->withInput();
            }

            // Convert unit_selling_price (per carton) to per line for storage
            $item['unit_selling_price'] = $item['unit_selling_price'] / $linesPerCarton;

            // Recalculate total to avoid tampering
            $item['total'] = $item['unit_selling_price'] * $item['qty'];
        }
        unset($item); // break reference

        // Calculate unit_cost_price using FIFO and quantity needed
        $itemsWithCosts = collect($validated['items'])->map(function ($item) use ($products) {
            $qtyNeeded = $item['qty']; // in lines
            $product = $products[$item['product_id']];

            $stockMovements = StockMovement::where('product_id', $item['product_id'])
                ->where('type', 'received')
                ->where('quantity', '>', 0)
                ->orderBy('created_at')
                ->get();

            $totalCost = 0;
            foreach ($stockMovements as $movement) {
                if ($qtyNeeded <= 0) {
                    break;
                }

                $qtyToUse = min($movement->quantity, $qtyNeeded);
                $totalCost += $qtyToUse * $movement->unit_cost; // unit_cost is per line
                $qtyNeeded -= $qtyToUse;
            }

            if ($qtyNeeded > 0) {
                // Not enough stock, fallback handled by validation but fallback cost is 0
                $item['unit_cost_price'] = 0;
            } else {
                $item['unit_cost_price'] = $totalCost / $item['qty'];
            }

            return $item;
        });

        $subtotal = $itemsWithCosts->sum('total');
        $total = $subtotal; // Extend here with taxes or discounts if needed
        $amount_paid = $validated['amount_paid'];

        // Validate payment logic
        $validator = Validator::make($request->all(), []);
        $validator->after(function ($validator) use ($amount_paid, $total, $validated) {
            $type = $validated['payment_type'];
            if ($type === 'cash' && $amount_paid != $total) {
                $validator->errors()->add('amount_paid', 'For cash payments, the amount paid must equal the total.');
            }
            if ($type === 'credit' && $amount_paid != 0) {
                $validator->errors()->add('amount_paid', 'For credit sales, the amount paid must be 0.');
            }
            if ($type === 'partial' && ($amount_paid <= 0 || $amount_paid >= $total)) {
                $validator->errors()->add('amount_paid', 'For partial payments, the amount paid must be greater than 0 and less than the total.');
            }
        });

        if ($validator->fails()) {
            return redirect()->back()->withErrors($validator)->withInput();
        }

        $saleData = [
            'transaction_id' => 'TXN'.time(),
            'customer_id' => $validated['customer_id'] ?? null,
            'customer_name' => $validated['customer_id'] ? null : $validated['customer_name'],
            'subtotal' => $subtotal,
            'tax' => 0,
            'total' => $total,
            'payment_type' => $validated['payment_type'],
            'status' => 'completed',
            'amount_paid' => $amount_paid,
            'user_id' => Auth::id() ?? 1,
        ];

        $sale = Sale::create($saleData);

        // Update the created_at to reflect the transaction date with current time
        // This ensures sales have unique timestamps and can be filtered correctly
        // when stock adjustments are made (sales after adjustment should count)
        $transactionDateTime = $validated['transaction_date'].' '.now()->format('H:i:s');
        $sale->created_at = $transactionDateTime;
        $sale->save();

        foreach ($itemsWithCosts as $item) {
            SaleItem::create([
                'sale_id' => $sale->id,
                'product_id' => $item['product_id'],
                'product_name' => $products[$item['product_id']]->name,
                'quantity' => $item['qty'], // lines
                'unit_selling_price' => $item['unit_selling_price'], // per line
                'unit_cost_price' => $item['unit_cost_price'], // per line
                'total' => $item['total'],
            ]);
        }

        return redirect()->route('sales-transactions.index')->with('success', 'Sales transaction created successfully.');
    }

    public function update(Request $request, $transaction_id)
    {
        $sale = Sale::where('transaction_id', $transaction_id)->firstOrFail();

        $validated = $request->validate([
            'customer_id' => 'nullable|exists:customers,id',
            'customer_name' => 'nullable|string|max:255',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.qty' => 'required|integer|min:1',
            'items.*.unit_selling_price' => 'required|numeric|min:0',
            'items.*.total' => 'required|numeric|min:0',
            'amount_paid' => 'required|numeric|min:0',
            'payment_type' => 'required|in:cash,credit,partial',
        ]);

        // Validate customer requirements based on payment type
        if (in_array($validated['payment_type'], ['credit', 'partial'])) {
            if (empty($validated['customer_id'])) {
                return redirect()->back()->withErrors([
                    'customer_id' => 'Credit and partial sales require selecting a registered customer.',
                ])->withInput();
            }
        } else {
            if (! isset($validated['customer_id']) && empty($validated['customer_name'])) {
                return redirect()->back()->withErrors([
                    'customer_id' => 'Either select a customer or enter a customer name.',
                ])->withInput();
            }
        }

        // Load all products involved
        $productIds = collect($validated['items'])->pluck('product_id')->unique();
        $products = Product::whereIn('id', $productIds)->get()->keyBy('id');

        // Process items and convert prices
        $processedItems = collect($validated['items'])->map(function ($item) use ($products) {
            $product = $products[$item['product_id']];
            $linesPerCarton = $product->lines_per_carton ?? 1;

            // Convert unit_selling_price (per carton) to per line for storage
            $unitPricePerLine = $item['unit_selling_price'] / $linesPerCarton;

            // Recalculate total
            $total = $unitPricePerLine * $item['qty'];

            return [
                'product_id' => $item['product_id'],
                'product_name' => $product->name,
                'quantity' => $item['qty'],
                'unit_selling_price' => $unitPricePerLine,
                'unit_cost_price' => 0, // We don't recalculate FIFO cost on edit
                'total' => $total,
            ];
        });

        $subtotal = $processedItems->sum('total');
        $total = $subtotal;
        $amount_paid = $validated['amount_paid'];

        // Validate payment logic
        $validator = Validator::make($request->all(), []);
        $validator->after(function ($validator) use ($amount_paid, $total, $validated) {
            $type = $validated['payment_type'];
            if ($type === 'cash' && abs($amount_paid - $total) > 0.01) {
                $validator->errors()->add('amount_paid', 'For cash payments, the amount paid must equal the total.');
            }
            if ($type === 'credit' && $amount_paid != 0) {
                $validator->errors()->add('amount_paid', 'For credit sales, the amount paid must be 0.');
            }
            if ($type === 'partial' && ($amount_paid <= 0 || $amount_paid >= $total)) {
                $validator->errors()->add('amount_paid', 'For partial payments, the amount paid must be greater than 0 and less than the total.');
            }
        });

        if ($validator->fails()) {
            return redirect()->back()->withErrors($validator)->withInput();
        }

        // Determine status based on payment
        // cash = completed (paid in full)
        // credit/partial = pending (has outstanding balance)
        $status = $validated['payment_type'] === 'cash' ? 'completed' : 'completed';

        // Update sale
        $sale->update([
            'customer_id' => $validated['customer_id'] ?? null,
            'customer_name' => $validated['customer_id'] ? null : $validated['customer_name'],
            'subtotal' => $subtotal,
            'total' => $total,
            'payment_type' => $validated['payment_type'],
            'status' => $status,
            'amount_paid' => $amount_paid,
        ]);

        // Delete existing sale items and recreate
        $sale->saleItems()->delete();

        foreach ($processedItems as $item) {
            SaleItem::create([
                'sale_id' => $sale->id,
                'product_id' => $item['product_id'],
                'product_name' => $item['product_name'],
                'quantity' => $item['quantity'],
                'unit_selling_price' => $item['unit_selling_price'],
                'unit_cost_price' => $item['unit_cost_price'],
                'total' => $item['total'],
            ]);
        }

        return redirect()->route('sales-transactions.index')->with('success', 'Sales transaction updated successfully.');
    }

    public function destroy($transaction_id)
    {
        $sale = Sale::where('transaction_id', $transaction_id)->firstOrFail();

        // foreach ($sale->saleItems as $item) {
        //     // Restore stock by creating a received movement
        //     StockMovement::create([
        //         'product_id' => $item->product_id,
        //         'type' => 'received',
        //         'quantity' => $item->quantity,
        //         'unit_cost' => $item->unit_cost_price,
        //         'total_cost' => $item->quantity * $item->unit_cost_price,
        //         'sale_id' => $sale->id,
        //     ]);
        // }

        $sale->delete();

        return redirect()->route('sales-transactions.index')->with('success', 'Sales transaction deleted successfully.');
    }
}
