<?php

namespace App\Http\Controllers;

use App\Helpers\StockHelper;
use App\Models\DailyStockSnapshot;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Services\StockCalculationService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class StockControlController extends Controller
{
    public function __construct(private readonly StockCalculationService $stockService) {}

    public function index(Request $request)
    {
        $singleDate = $request->query('date');
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');

        if ($singleDate) {
            $startDate = $singleDate;
            $endDate = $singleDate;
        }

        // Normalise date range
        if ($startDate && $endDate && $startDate > $endDate) {
            [$startDate, $endDate] = [$endDate, $startDate];
        }

        // Stock movements list (for the movements table at the bottom of the page)
        $movementsQuery = StockMovement::with(['product'])->orderByDesc('created_at');

        if ($startDate && $endDate) {
            $movementsQuery->whereBetween('created_at', [$startDate.' 00:00:00', $endDate.' 23:59:59']);
        }

        $stock_movements = $movementsQuery->get()->map(function ($movement) {
            $movement->quantity_display = StockHelper::formatCartonLine(
                $movement->quantity,
                $movement->product->lines_per_carton
            );

            return $movement;
        });

        // Products — compute current_stock_display (today's remaining) for each
        $products = Product::with(['supplier', 'stockMovements'])->orderBy('name')->get();
        $today = now()->toDateString();
        $suppliers = Supplier::where('is_active', true)->get();

        foreach ($products as $product) {
            $available = $this->stockService->getAvailableStock($product, $today);
            $received = $this->stockService->getReceivedToday($product, $today);
            $adjIn = (int) $product->stockMovements()->whereDate('created_at', $today)->where('type', 'adjustment_in')->sum('quantity');
            $adjOut = (int) $product->stockMovements()->whereDate('created_at', $today)->where('type', 'adjustment_out')->sum('quantity');
            $sales = $this->stockService->getTotalSalesForDate($product, $today);
            $currentStock = $available + $received + $adjIn - $adjOut - $sales;
            $product->current_stock_display = StockHelper::formatCartonLine($currentStock, $product->lines_per_carton);
        }

        // Stock activity summary for selected date (or today)
        $summaryDate = $startDate ?? $today;
        $stock_activity_summary = [];

        foreach ($products as $product) {
            $stock_activity_summary[] = $this->stockService->computeSummaryForDate($product, $summaryDate);
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

    /**
     * Add a stock received movement (physical stock arriving).
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
            'quantity' => 'required|string|max:50',
            'notes' => 'nullable|string|max:1000',
            'date' => 'required|date',
        ]);

        $product = Product::findOrFail($validated['product_id']);
        $totalLines = StockHelper::parseCartonLineFormat($validated['quantity'], $product->lines_per_carton);

        $movement = StockMovement::create([
            'product_id' => $validated['product_id'],
            'type' => 'received',
            'quantity' => $totalLines,
            'notes' => $validated['notes'] ?? null,
        ]);

        // Backdate to selected date at noon to avoid edge-case ordering
        $movement->created_at = $validated['date'].' 12:00:00';
        $movement->save();

        return redirect()->route('stock-control.index')
            ->with('success', 'Stock received recorded successfully.');
    }

    /**
     * Edit a received stock movement.
     */
    public function update(Request $request, $id)
    {
        $stockMovement = StockMovement::findOrFail($id);

        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
            'quantity' => 'required|string|max:50',
            'notes' => 'nullable|string|max:1000',
        ]);

        $product = Product::findOrFail($validated['product_id']);
        $totalLines = StockHelper::parseCartonLineFormat($validated['quantity'], $product->lines_per_carton);

        $stockMovement->update([
            'product_id' => $validated['product_id'],
            'type' => 'received',
            'quantity' => $totalLines,
            'notes' => $validated['notes'] ?? null,
        ]);

        return redirect()->route('stock-control.index')
            ->with('success', 'Stock movement updated successfully.');
    }

    /**
     * Edit an adjustment_in / adjustment_out movement.
     */
    public function updateAdjustment(Request $request, $id)
    {
        $stockMovement = StockMovement::findOrFail($id);

        if (! in_array($stockMovement->type, ['adjustment_in', 'adjustment_out'])) {
            return back()->with('error', 'Only stock adjustments can be edited with this method.');
        }

        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
            'quantity' => 'required|string|max:50',
            'notes' => 'nullable|string|max:1000',
        ]);

        $product = Product::findOrFail($validated['product_id']);
        $totalLines = StockHelper::parseCartonLineFormat($validated['quantity'], $product->lines_per_carton);

        $stockMovement->update([
            'product_id' => $validated['product_id'],
            'type' => $stockMovement->type,
            'quantity' => $totalLines,
            'notes' => $validated['notes'] ?? null,
        ]);

        return redirect()->route('stock-control.index')
            ->with('success', 'Stock adjustment updated successfully.');
    }

    public function destroy($id)
    {
        StockMovement::findOrFail($id)->delete();

        return back()->with('success', 'Stock movement deleted successfully.');
    }

    /**
     * Set the Available Stock and/or Stock Received Today for a product on a specific date.
     *
     * Instead of creating delta adjustment movements, this stores the absolute target values
     * directly in daily_stock_snapshots so the carry-forward chain is always stable.
     */
    public function adjust(Request $request)
    {
        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
            'date' => 'required|date',
            'available_stock_target' => 'nullable|string|max:50',
            'received_today_target' => 'nullable|string|max:50',
            'notes' => 'nullable|string|max:1000',
        ]);

        $product = Product::findOrFail($validated['product_id']);
        $date = $validated['date'];

        $availableTarget = ($validated['available_stock_target'] ?? '') !== ''
            ? StockHelper::parseCartonLineFormat($validated['available_stock_target'], $product->lines_per_carton)
            : null;

        $receivedTarget = ($validated['received_today_target'] ?? '') !== ''
            ? StockHelper::parseCartonLineFormat($validated['received_today_target'], $product->lines_per_carton)
            : null;

        if ($availableTarget === null && $receivedTarget === null) {
            return back()->with('info', 'No targets provided — nothing changed.');
        }

        // Use provided targets, or fall back to current computed values for unchanged fields
        $available = $availableTarget ?? $this->stockService->getAvailableStock($product, $date);
        $received = $receivedTarget ?? $this->stockService->getReceivedToday($product, $date);

        // Regular (non-snapshot) adjustments still count toward total available
        $adjIn = (int) $product->stockMovements()->whereDate('created_at', $date)->where('type', 'adjustment_in')->sum('quantity');
        $adjOut = (int) $product->stockMovements()->whereDate('created_at', $date)->where('type', 'adjustment_out')->sum('quantity');

        $totalAfterAdjustment = $available + $received + $adjIn - $adjOut;
        $salesToday = $this->stockService->getTotalSalesForDate($product, $date);

        if ($totalAfterAdjustment < $salesToday) {
            return back()->withErrors([
                'adjustment' => sprintf(
                    'Cannot adjust stock. Total available (%s) would be less than sales already made (%s).',
                    StockHelper::formatCartonLine($totalAfterAdjustment, $product->lines_per_carton),
                    StockHelper::formatCartonLine($salesToday, $product->lines_per_carton)
                ),
            ]);
        }

        // Create or update the snapshot — only override the fields that were explicitly set
        $snapshot = DailyStockSnapshot::firstOrNew([
            'product_id' => $product->id,
            'date' => $date,
        ]);

        if ($availableTarget !== null) {
            $snapshot->available_stock = $availableTarget;
        }

        if ($receivedTarget !== null) {
            $snapshot->received_today = $receivedTarget;
        }

        if (! empty($validated['notes'])) {
            $snapshot->notes = $validated['notes'];
        }

        $snapshot->save();

        return back()->with('success', 'Stock adjusted successfully.');
    }
}
