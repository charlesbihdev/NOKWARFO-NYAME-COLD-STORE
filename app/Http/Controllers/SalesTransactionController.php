<?php

namespace App\Http\Controllers;

use App\Helpers\StockHelper;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\StockMovement;
use App\Services\StockCalculationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;

class SalesTransactionController extends Controller
{
    public function __construct(private readonly StockCalculationService $stockService) {}

    public function index(Request $request)
    {
        $search = $request->input('search');
        $startDate = $request->input('start_date') ?? now()->toDateString();
        $endDate = $request->input('end_date') ?? now()->toDateString();

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
        $transactionDate = $validated['transaction_date'];

        foreach ($validated['items'] as &$item) {
            $product = $products[$item['product_id']];
            $linesPerCarton = $product->lines_per_carton ?? 1;

            // Use StockCalculationService for correct snapshot-aware carry-forward logic.
            // remaining_stock_raw = total_available - sales_already_recorded_today
            // If remaining_stock_raw >= qty requested, the sale can proceed.
            $summary = $this->stockService->computeSummaryForDate($product, $transactionDate);
            $remainingBeforeSale = $summary['remaining_stock_raw'];

            if ($remainingBeforeSale < $item['qty']) {
                $availableFormatted = StockHelper::formatCartonLine($remainingBeforeSale, $linesPerCarton);
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

        // Calculate unit_cost_price from product's cost_price_per_carton and profit
        $itemsWithCosts = collect($validated['items'])->map(function ($item) use ($products) {
            $product = $products[$item['product_id']];
            $linesPerCarton = $product->lines_per_carton ?? 1;

            // Get cost price per carton from product, convert to per line
            $costPricePerCarton = $product->cost_price_per_carton ?? 0;
            $costPricePerLine = $linesPerCarton > 0 ? $costPricePerCarton / $linesPerCarton : 0;

            $item['unit_cost_price'] = $costPricePerLine;

            // Calculate profit: (selling - cost) × qty (all per-line values)
            $item['profit'] = ($item['unit_selling_price'] - $costPricePerLine) * $item['qty'];

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

        $saleItems = [];
        foreach ($itemsWithCosts as $item) {
            $product = $products[$item['product_id']];
            $linesPerCarton = $product->lines_per_carton ?? 1;

            SaleItem::create([
                'sale_id' => $sale->id,
                'product_id' => $item['product_id'],
                'product_name' => $product->name,
                'quantity' => $item['qty'], // lines
                'unit_selling_price' => $item['unit_selling_price'], // per line
                'unit_cost_price' => $item['unit_cost_price'], // per line
                'total' => $item['total'],
                'profit' => $item['profit'],
            ]);

            // Build sale items for receipt
            $saleItems[] = [
                'product' => $product->name,
                'quantity' => StockHelper::formatCartonLine($item['qty'], $linesPerCarton),
                'unit_selling_price' => StockHelper::pricePerCarton($item['unit_selling_price'], $linesPerCarton),
                'total' => $item['total'],
            ];
        }

        // Get customer name for receipt
        $customerName = null;
        if (! empty($validated['customer_id'])) {
            $customer = Customer::find($validated['customer_id']);
            $customerName = $customer ? $customer->name : null;
        } else {
            $customerName = $validated['customer_name'] ?? null;
        }

        // Build created sale data for receipt modal
        $createdSale = [
            'id' => $sale->transaction_id,
            'date' => $sale->created_at->format('Y-m-d'),
            'customer' => $customerName,
            'total' => $total,
            'payment_type' => ucfirst($validated['payment_type']),
            'status' => $validated['payment_type'] === 'cash' ? 'Completed' : ucfirst($validated['payment_type']),
            'amount_paid' => $amount_paid,
            'amount_owed' => $total - $amount_paid,
            'sale_items' => $saleItems,
        ];

        return redirect()->route('sales-transactions.index')
            ->with('success', 'Sales transaction created successfully.')
            ->with('createdSale', $createdSale);
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

            // Get cost price per carton from product, convert to per line
            $costPricePerCarton = $product->cost_price_per_carton ?? 0;
            $costPricePerLine = $linesPerCarton > 0 ? $costPricePerCarton / $linesPerCarton : 0;

            // Recalculate total
            $total = $unitPricePerLine * $item['qty'];

            // Calculate profit
            $profit = ($unitPricePerLine - $costPricePerLine) * $item['qty'];

            return [
                'product_id' => $item['product_id'],
                'product_name' => $product->name,
                'quantity' => $item['qty'],
                'unit_selling_price' => $unitPricePerLine,
                'unit_cost_price' => $costPricePerLine,
                'total' => $total,
                'profit' => $profit,
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
                'profit' => $item['profit'],
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
