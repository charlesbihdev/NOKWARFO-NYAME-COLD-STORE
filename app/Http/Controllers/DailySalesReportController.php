<?php

namespace App\Http\Controllers;

use App\Helpers\StockHelper;
use App\Models\Sale;
use App\Models\SaleItem;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DailySalesReportController extends Controller
{
    public function index(Request $request)
    {
        $startDate = $request->input('start_date', now()->format('Y-m-d'));
        $endDate = $request->input('end_date', now()->format('Y-m-d'));

        $dateFilter = function ($q) use ($startDate, $endDate) {
            $q->whereDate('sales.created_at', '>=', $startDate)
                ->whereDate('sales.created_at', '<=', $endDate);
        };

        /** ---------------------------
         *  SALES LISTS (Paginated)
         * -------------------------- */
        $cash_sales = Sale::with(['customer', 'saleItems.product'])
            ->where($dateFilter)
            ->whereIn('payment_type', ['cash', 'partial'])
            ->orderBy('created_at', 'desc')
            ->simplePaginate(25, ['*'], 'cash_page')
            ->through(fn ($sale) => [
                'time' => $sale->created_at->format('H:i A'),
                'customer' => $sale->customer?->name ?? $sale->customer_name,
                'products' => $sale->saleItems->pluck('product_name')->join(', '),
                'amount' => $sale->amount_paid,
            ]);

        $credit_sales = Sale::with(['customer', 'saleItems.product'])
            ->where($dateFilter)
            ->where('payment_type', 'credit')
            ->orderBy('created_at', 'desc')
            ->simplePaginate(25, ['*'], 'credit_page')
            ->through(fn ($sale) => [
                'time' => $sale->created_at->format('H:i A'),
                'customer' => $sale->customer?->name ?? $sale->customer_name,
                'products' => $sale->saleItems->pluck('product_name')->join(', '),
                'amount' => $sale->total,
            ]);

        /** ---------------------------
         *  PRODUCT SUMMARIES (Paginated for display)
         * -------------------------- */
        $products_bought = $this->productSummary('cash', $dateFilter, 25, 'bought_page');
        $credited_products = $this->productSummary('credit', $dateFilter, 25, 'credited_page');
        $partial_products = $this->partialProductSummary($dateFilter, 25, 'partial_page');

        /** ---------------------------
         *  TOTALS (Backend only — no pagination impact)
         * -------------------------- */
        $cashTotal = Sale::where($dateFilter)->whereIn('payment_type', ['cash', 'partial'])->sum('amount_paid');
        $creditTotal = Sale::where($dateFilter)->where('payment_type', 'credit')->sum('total');
        $grandTotal = $cashTotal + $creditTotal;

        // For totals, sum quantities grouped by product and format nicely
        $totalProductsBoughtQty = $this->formatTotalQuantityByPaymentType('cash', $dateFilter);
        $totalCreditedProductsQty = $this->formatTotalQuantityByPaymentType('credit', $dateFilter);
        $totalPartialProductsQty = $this->formatTotalPartialQuantity($dateFilter);

        $totalProductsBoughtAmount = $this->productTotalAmount('cash', $dateFilter);
        $totalCreditedProductsAmount = $this->productTotalAmount('credit', $dateFilter);
        $totalPartialProductsAmount = $this->partialProductAmount($dateFilter);

        $totalPartialProductsAmountPaid = Sale::where($dateFilter)
            ->where('payment_type', 'partial')
            ->sum('amount_paid');

        $cashTransactions = Sale::where($dateFilter)->whereIn('payment_type', ['cash', 'partial'])->count();
        $creditTransactions = Sale::where($dateFilter)->where('payment_type', 'credit')->count();

        /** ---------------------------
         *  FINAL SUMMARY
         * -------------------------- */
        $summary = [
            'cashTotal' => $cashTotal,
            'creditTotal' => $creditTotal,
            'grandTotal' => $grandTotal,
            'totalProductsBought' => $totalProductsBoughtQty,
            'totalCreditedProducts' => $totalCreditedProductsQty,
            'totalPartialProducts' => $totalPartialProductsQty,
            'totalProductsSold' => $this->sumFormattedQuantities([
                $totalProductsBoughtQty,
                $totalCreditedProductsQty,
                $totalPartialProductsQty,
            ]),
            'totalProductsBoughtAmount' => $totalProductsBoughtAmount,
            'totalCreditedProductsAmount' => $totalCreditedProductsAmount,
            'totalPartialProductsAmount' => $totalPartialProductsAmount,
            'totalPartialProductsAmountPaid' => $totalPartialProductsAmountPaid,
            'cashTransactions' => $cashTransactions,
            'creditTransactions' => $creditTransactions,
        ];

        return Inertia::render('daily-sales-report', [
            'cash_sales' => $cash_sales,
            'credit_sales' => $credit_sales,
            'products_bought' => $products_bought,
            'credited_products' => $credited_products,
            'partial_products' => $partial_products,
            'summary' => $summary,
            'start_date' => $startDate,
            'end_date' => $endDate,
        ]);
    }

    /**
     * Helper to get product summaries by payment type with formatted qty
     */
    private function productSummary($paymentType, $dateFilter, $perPage, $pageName)
    {
        return SaleItem::select('product_id')
            ->selectRaw('SUM(quantity) as qty, SUM(total) as total_amount')
            ->whereHas('sale', fn ($q) => $q->where($dateFilter)
                ->where('payment_type', $paymentType)
                ->where('status', 'completed'))
            ->groupBy('product_id')
            ->with('product')
            ->simplePaginate($perPage, ['*'], $pageName)
            ->through(fn ($item) => [
                'product' => $item->product->name,
                'qty' => StockHelper::formatCartonLine($item->qty, $item->product->lines_per_carton),
                'total_amount' => $item->total_amount,
            ]);
    }

    /**
     * Partial product summary with formatted qty
     */
    private function partialProductSummary($dateFilter, $perPage, $pageName)
    {
        return SaleItem::select('sale_items.product_id')
            ->selectRaw('SUM(sale_items.quantity) as qty')
            ->selectRaw('SUM(sale_items.total) as total_amount')
            ->selectRaw('ROUND(SUM(sales.amount_paid * (sale_items.total / sales.total)), 2) as amount_paid')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->where($dateFilter)
            ->where('sales.payment_type', 'partial')
            ->where('sales.status', 'completed')
            ->groupBy('sale_items.product_id')
            ->with('product')
            ->simplePaginate($perPage, ['*'], $pageName)
            ->through(fn ($item) => [
                'product' => $item->product->name,
                'qty' => StockHelper::formatCartonLine($item->qty, $item->product->lines_per_carton),
                'total_amount' => $item->total_amount,
                'amount_paid' => $item->amount_paid,
            ]);
    }

    /**
     * Product total amount by type
     */
    private function productTotalAmount($paymentType, $dateFilter)
    {
        return SaleItem::whereHas('sale', fn ($q) => $q->where($dateFilter)
            ->where('payment_type', $paymentType)
            ->where('status', 'completed'))
            ->sum('total');
    }

    /**
     * Partial totals helpers
     */
    private function partialProductQty($dateFilter)
    {
        return SaleItem::join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->where($dateFilter)
            ->where('sales.payment_type', 'partial')
            ->where('sales.status', 'completed')
            ->sum('sale_items.quantity');
    }

    private function partialProductAmount($dateFilter)
    {
        return SaleItem::join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->where($dateFilter)
            ->where('sales.payment_type', 'partial')
            ->where('sales.status', 'completed')
            ->sum('sale_items.total');
    }

    /**
     * Format total quantity by payment type
     */
    private function formatTotalQuantityByPaymentType($paymentType, $dateFilter)
    {
        $quantities = SaleItem::select('product_id')
            ->selectRaw('SUM(quantity) as total_qty')
            ->whereHas('sale', fn ($q) => $q->where($dateFilter)
                ->where('payment_type', $paymentType)
                ->where('status', 'completed'))
            ->groupBy('product_id')
            ->with('product')
            ->get();

        // Format and sum all product quantities into string like "2C1L + 1C" etc
        $formattedList = $quantities->map(function ($item) {
            return StockHelper::formatCartonLine($item->total_qty, $item->product->lines_per_carton);
        });

        // dd($formattedList->all());

        return $this->combineFormattedQuantities($formattedList->all());
    }

    /**
     * Format total partial quantity
     */
    private function formatTotalPartialQuantity($dateFilter)
    {
        $quantities = SaleItem::select('sale_items.product_id')
            ->selectRaw('SUM(sale_items.quantity) as total_qty')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->where($dateFilter)
            ->where('sales.payment_type', 'partial')
            ->where('sales.status', 'completed')
            ->groupBy('sale_items.product_id')
            ->with('product')
            ->get();

        $formattedList = $quantities->map(function ($item) {
            return StockHelper::formatCartonLine($item->total_qty, $item->product->lines_per_carton);
        });

        return $this->combineFormattedQuantities($formattedList->all());
    }

    /**
     * Combine formatted quantities (e.g. ["2C1L", "1C"]) into one string separated by plus
     * If empty, returns "0"
     */
    private function combineFormattedQuantities(array $quantities): string
    {
        $filtered = array_filter($quantities, fn ($q) => $q !== '0');
        if (empty($filtered)) {
            return '0';
        }

        return implode(' + ', $filtered);
    }

    /**
     * Sum formatted quantities by converting back to lines and reformatting
     * Used for totalProductsSold summary
     */
    private function sumFormattedQuantities(array $formattedQuantities): string
    {
        $totalCartons = 0;
        $totalLines = 0;

        foreach ($formattedQuantities as $formatted) {
            // Remove spaces and split by "+"
            $parts = explode('+', str_replace(' ', '', $formatted));

            foreach ($parts as $part) {
                // Match patterns for cartons and lines
                preg_match_all('/(\d+)(C|L)/', $part, $matches, PREG_SET_ORDER);
                foreach ($matches as $match) {
                    if ($match[2] === 'C') {
                        $totalCartons += (int) $match[1];
                    } elseif ($match[2] === 'L') {
                        $totalLines += (int) $match[1];
                    }
                }

                // Handle standalone numbers (like "10" or "15")
                if (preg_match('/^\d+$/', $part)) {
                    $totalCartons += (int) $part; // Treat standalone numbers as cartons
                }
            }
        }

        // Format the result
        $result = '';
        if ($totalCartons > 0) {
            $result .= $totalCartons.'C';
        }
        if ($totalLines > 0) {
            if ($result) {
                $result .= ' '; // Add space if there are both cartons and lines
            }
            $result .= $totalLines.'L';
        }

        return $result ?: '0'; // Return '0' if no quantities found
    }

    /**
     * Parse formatted quantity string like "2C1L" back to total lines (assuming 1 carton = lines_per_carton)
     */
    // private function parseFormattedQuantityToLines(string $formatted): int
    // {
    //     preg_match_all('/(\d+)C/', $formatted, $cartonMatches);
    //     preg_match_all('/(\d+)L/', $formatted, $lineMatches);

    //     $cartons = !empty($cartonMatches[1]) ? array_sum(array_map('intval', $cartonMatches[1])) : 0;
    //     $lines = !empty($lineMatches[1]) ? array_sum(array_map('intval', $lineMatches[1])) : 0;

    //     // Assume 1 line per carton for sum (simplify)
    //     return $cartons * 1 + $lines;
    // }
}
