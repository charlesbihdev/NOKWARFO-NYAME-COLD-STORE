<?php

namespace App\Services;

use App\Helpers\StockHelper;
use App\Models\DailyStockSnapshot;
use App\Models\Product;
use Carbon\Carbon;

/**
 * Handles all stock balance calculations for the daily stock activity summary.
 *
 * Core rules:
 *   - Available Stock  = opening balance for the day (yesterday's Remaining, or a manually set snapshot)
 *   - Received Today   = stock received that day (actual movements, or a manually set snapshot)
 *   - Total Available  = Available + Received + adjustment_in - adjustment_out
 *   - Remaining Stock  = Total Available - (cash + credit + partial sales)
 *   - Next day's Available = today's Remaining  ← the critical carry-forward
 *
 * Snapshots (daily_stock_snapshots) let operators override Available and/or Received
 * for any specific date, breaking the carry-forward chain at that point.
 */
class StockCalculationService
{
    /** Per-request remaining-stock cache keyed by "productId:date" */
    private array $remainingCache = [];

    /** Per-request snapshot cache keyed by "productId:date" */
    private array $snapshotCache = [];

    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------

    /**
     * Build the full summary row for a product on a given date.
     *
     * @return array{
     *   product: string,
     *   stock_received_today: string,
     *   previous_stock: string,
     *   total_available: string,
     *   cash_sales: string,
     *   credit_sales: string,
     *   partial_sales: string,
     *   total_sales: string,
     *   remaining_stock: string,
     *   available_stock_raw: int,
     *   received_today_raw: int,
     *   total_available_raw: int,
     *   remaining_stock_raw: int,
     * }
     */
    public function computeSummaryForDate(Product $product, string $date): array
    {
        $lpc = $product->lines_per_carton;

        $available = $this->getAvailableStock($product, $date);
        $received = $this->getReceivedToday($product, $date);
        $adjIn = $this->getAdjustmentsIn($product, $date);
        $adjOut = $this->getAdjustmentsOut($product, $date);

        $cashSales = $this->getSalesByType($product, $date, 'cash');
        $creditSales = $this->getSalesByType($product, $date, 'credit');
        $partialSales = $this->getSalesByType($product, $date, 'partial');
        $totalSales = $cashSales + $creditSales + $partialSales;

        $totalAvailable = $available + $received + $adjIn - $adjOut;
        $remaining = $totalAvailable - $totalSales;

        return [
            'product' => $product->name,
            'stock_received_today' => StockHelper::formatCartonLine($received, $lpc),
            'previous_stock' => StockHelper::formatCartonLine($available, $lpc),
            'total_available' => StockHelper::formatCartonLine($totalAvailable, $lpc),
            'cash_sales' => StockHelper::formatCartonLine($cashSales, $lpc),
            'credit_sales' => StockHelper::formatCartonLine($creditSales, $lpc),
            'partial_sales' => StockHelper::formatCartonLine($partialSales, $lpc),
            'total_sales' => StockHelper::formatCartonLine($totalSales, $lpc),
            'remaining_stock' => StockHelper::formatCartonLine($remaining, $lpc),
            // Raw integers for validation use in adjust()
            'available_stock_raw' => $available,
            'received_today_raw' => $received,
            'total_available_raw' => $totalAvailable,
            'remaining_stock_raw' => $remaining,
        ];
    }

    /**
     * Available Stock for a product on a given date.
     *
     * Priority:
     *   1. Snapshot with available_stock set for this exact date → use it directly.
     *   2. Otherwise → carry forward yesterday's Remaining Stock.
     *
     * The carry-forward iterates forward from the last available_stock snapshot
     * (or from the very first movement date if no snapshot exists), applying
     * each day's received, adjustments, and sales to build the running balance.
     */
    public function getAvailableStock(Product $product, string $date): int
    {
        // 1. Direct snapshot override
        $snap = $this->findSnapshot($product->id, $date);
        if ($snap && $snap->available_stock !== null) {
            return $snap->available_stock;
        }

        // 2. Find the most recent anchor: last snapshot with available_stock set before $date
        $anchor = DailyStockSnapshot::where('product_id', $product->id)
            ->where('date', '<', $date)
            ->whereNotNull('available_stock')
            ->orderByDesc('date')
            ->first();

        if ($anchor) {
            $anchorDateStr = (string) $anchor->date; // Cast as string (date cast is 'string' to stay Y-m-d in SQLite)
            $anchorBalance = $anchor->available_stock;
        } else {
            // No snapshot at all — start from the day before the earliest movement
            $firstMovement = $product->stockMovements()
                ->orderBy('created_at')
                ->value('created_at');

            if (! $firstMovement) {
                return 0; // No history whatsoever
            }

            // The day before the first movement: available=0, received=0, remaining=0
            $anchorDateStr = Carbon::parse($firstMovement)->subDay()->toDateString();
            $anchorBalance = 0;
        }

        // 3. Iterate forward: remaining(anchorDate) → remaining(anchorDate+1) → ... → remaining(date-1)
        //    Each day's remaining becomes the next day's available.
        //    Intermediate snapshots with available_stock override the carry-forward on their date.
        $remaining = $this->computeDayRemaining($product, $anchorDateStr, $anchorBalance);

        $current = Carbon::parse($anchorDateStr)->addDay();
        $targetDate = Carbon::parse($date);

        while ($current->lt($targetDate)) {
            $dayStr = $current->toDateString();
            $midSnap = $this->findSnapshot($product->id, $dayStr);

            $dayAvailable = ($midSnap && $midSnap->available_stock !== null)
                ? $midSnap->available_stock
                : $remaining;

            $remaining = $this->computeDayRemaining($product, $dayStr, $dayAvailable);
            $current->addDay();
        }

        return $remaining;
    }

    /**
     * Stock Received Today for a product on a given date.
     *
     * Priority:
     *   1. Snapshot with received_today set → use as base, then add any received
     *      movements created AFTER the snapshot was last saved (real new arrivals).
     *   2. Otherwise → sum of 'received' type stock_movements on that date.
     */
    public function getReceivedToday(Product $product, string $date): int
    {
        $snap = $this->findSnapshot($product->id, $date);
        if ($snap && $snap->received_today !== null) {
            // Snapshot corrects/replaces whatever was received up to that point.
            // Any received movements added AFTER the snapshot was last saved are
            // real new arrivals that must be counted on top.
            $additionalAfterSnapshot = (int) $product->stockMovements()
                ->whereDate('created_at', $date)
                ->where('type', 'received')
                ->where('created_at', '>', $snap->updated_at)
                ->sum('quantity');

            return $snap->received_today + $additionalAfterSnapshot;
        }

        return (int) $product->stockMovements()
            ->whereDate('created_at', $date)
            ->where('type', 'received')
            ->sum('quantity');
    }

    /**
     * Compute the Remaining Stock for a product at end of a given date,
     * given a known opening available balance for that day.
     * Result is cached per request.
     */
    public function computeDayRemaining(Product $product, string $date, int $available): int
    {
        $cacheKey = $product->id.':'.$date;

        if (isset($this->remainingCache[$cacheKey])) {
            return $this->remainingCache[$cacheKey];
        }

        $received = $this->getReceivedToday($product, $date);
        $adjIn = $this->getAdjustmentsIn($product, $date);
        $adjOut = $this->getAdjustmentsOut($product, $date);
        $sales = $this->getTotalSalesForDate($product, $date);

        $result = $available + $received + $adjIn - $adjOut - $sales;

        $this->remainingCache[$cacheKey] = $result;

        return $result;
    }

    /**
     * Total sales across all payment types for a product on a date.
     */
    public function getTotalSalesForDate(Product $product, string $date): int
    {
        return (int) $product->saleItems()
            ->whereHas('sale', fn ($q) => $q->whereDate('created_at', $date))
            ->sum('quantity');
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private function getAdjustmentsIn(Product $product, string $date): int
    {
        return (int) $product->stockMovements()
            ->whereDate('created_at', $date)
            ->where('type', 'adjustment_in')
            ->sum('quantity');
    }

    private function getAdjustmentsOut(Product $product, string $date): int
    {
        return (int) $product->stockMovements()
            ->whereDate('created_at', $date)
            ->where('type', 'adjustment_out')
            ->sum('quantity');
    }

    private function getSalesByType(Product $product, string $date, string $paymentType): int
    {
        return (int) $product->saleItems()
            ->whereHas('sale', fn ($q) => $q->whereDate('created_at', $date)->where('payment_type', $paymentType))
            ->sum('quantity');
    }

    private function findSnapshot(int $productId, string $date): ?DailyStockSnapshot
    {
        $key = $productId.':'.$date;

        if (! array_key_exists($key, $this->snapshotCache)) {
            $this->snapshotCache[$key] = DailyStockSnapshot::where('product_id', $productId)
                ->where('date', $date)
                ->first();
        }

        return $this->snapshotCache[$key];
    }
}
