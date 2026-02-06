<?php

namespace App\Http\Controllers;

use App\Helpers\StockHelper;
use App\Models\Product;
use App\Models\SaleItem;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProfitAnalysisController extends Controller
{
    public function index(Request $request): Response
    {
        $startDate = $request->query('start_date') ?? now()->toDateString();
        $endDate = $request->query('end_date') ?? now()->toDateString();

        // Base date filter closure
        $saleDateFilter = function ($query) use ($startDate, $endDate) {
            if ($startDate) {
                $query->whereDate('created_at', '>=', $startDate);
            }
            if ($endDate) {
                $query->whereDate('created_at', '<=', $endDate);
            }
        };

        // Count excluded sales (items with no cost data)
        $excludedCount = SaleItem::whereHas('sale', $saleDateFilter)
            ->where(function ($q) {
                $q->where('unit_cost_price', '<=', 0)
                    ->orWhereNull('unit_cost_price');
            })
            ->count();

        // ALL SALES (cash, credit, partial) - only items with cost data
        $total_product_sales = $this->getProductSalesData($saleDateFilter, null);

        // CASH-ONLY SALES - only items with cost data
        $paid_product_sales = $this->getProductSalesData(function ($query) use ($startDate, $endDate) {
            $query->where('payment_type', 'cash');
            if ($startDate) {
                $query->whereDate('created_at', '>=', $startDate);
            }
            if ($endDate) {
                $query->whereDate('created_at', '<=', $endDate);
            }
        }, 'cash');

        // Count items that can be recalculated (have product with cost_price_per_carton but item has no profit)
        $recalculatableCount = SaleItem::where(function ($q) {
            $q->where('profit', 0)
                ->orWhereNull('profit');
        })
            ->whereHas('product', function ($q) {
                $q->where('cost_price_per_carton', '>', 0);
            })
            ->count();

        return Inertia::render('profit-analysis', [
            'total_product_sales' => $total_product_sales,
            'paid_product_sales' => $paid_product_sales,
            'excluded_count' => $excludedCount,
            'recalculatable_count' => $recalculatableCount,
        ]);
    }

    /**
     * Get product sales data grouped by product.
     */
    private function getProductSalesData(callable $saleFilter, ?string $paymentType): \Illuminate\Support\Collection
    {
        return SaleItem::whereHas('sale', $saleFilter)
            ->where('unit_cost_price', '>', 0)
            ->with('product')
            ->get()
            ->groupBy('product_id')
            ->map(function ($items) {
                $product = $items->first()->product;
                $linesPerCarton = $product->lines_per_carton ?? 1;

                $totalQty = $items->sum('quantity');
                $totalCost = $items->sum(fn($i) => $i->unit_cost_price * $i->quantity);
                $totalAmount = $items->sum('total');
                $totalProfit = $items->sum('profit');

                // Calculate average prices per line, then convert to per carton for display
                $avgCostPerLine = $totalQty > 0 ? $totalCost / $totalQty : 0;
                $avgSellingPerLine = $totalQty > 0 ? $totalAmount / $totalQty : 0;

                return [
                    'product' => $product->name ?? $items->first()->product_name,
                    'units_sold' => StockHelper::formatCartonLine($totalQty, $linesPerCarton),
                    'cost_price' => StockHelper::pricePerCarton($avgCostPerLine, $linesPerCarton),
                    'total_cost' => $totalCost,
                    'selling_price' => StockHelper::pricePerCarton($avgSellingPerLine, $linesPerCarton),
                    'total_amount' => $totalAmount,
                    'profit' => $totalProfit,
                ];
            })->values();
    }

    /**
     * Recalculate profit for historical sale items.
     * Updates items where profit = 0 and product has cost_price_per_carton set.
     */
    public function recalculate(Request $request): \Illuminate\Http\RedirectResponse
    {
        $updatedCount = 0;

        // Get all active products with cost_price_per_carton set
        $products = Product::where('is_active', true)
            ->where('cost_price_per_carton', '>', 0)
            ->get()
            ->keyBy('id');

        if ($products->isEmpty()) {
            return redirect()->back()->with('warning', 'No products have cost prices set. Please update product cost prices first.');
        }

        // Find sale items that need recalculation
        $saleItems = SaleItem::where(function ($q) {
            $q->where('profit', 0)
                ->orWhereNull('profit');
        })
            ->whereIn('product_id', $products->keys())
            ->get();

        foreach ($saleItems as $item) {
            $product = $products[$item->product_id] ?? null;
            if (! $product) {
                continue;
            }

            $linesPerCarton = $product->lines_per_carton ?? 1;
            $costPricePerCarton = $product->cost_price_per_carton ?? 0;
            $costPricePerLine = $linesPerCarton > 0 ? $costPricePerCarton / $linesPerCarton : 0;

            // Update unit_cost_price and calculate profit
            $item->unit_cost_price = $costPricePerLine;
            $item->profit = ($item->unit_selling_price - $costPricePerLine) * $item->quantity;
            $item->save();

            $updatedCount++;
        }

        return redirect()->back()->with('success', "Recalculated profit for {$updatedCount} sale items.");
    }
}
