<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Converts legacy [set:available] and [set:received] stock_movements
 * into daily_stock_snapshots records, then removes those tagged movements.
 *
 * Old system stored adjustments as delta movements with special note tags.
 * New system stores the absolute target values directly in daily_stock_snapshots.
 *
 * Recovery formula (old → new):
 *   available_stock = (all received + non-set adj_in - non-set adj_out BEFORE date) + ([set:available] adj_in - adj_out ON date)
 *   received_today  = (sum of 'received' movements ON date) + ([set:received] adj_in - adj_out ON date)
 */
return new class extends Migration
{
    public function up(): void
    {
        // Find all (product_id, date) pairs that have [set:*] movements
        $taggedMovements = DB::table('stock_movements')
            ->where(function ($q) {
                $q->where('notes', 'like', '%[set:available]%')
                    ->orWhere('notes', 'like', '%[set:received]%');
            })
            ->get();

        if ($taggedMovements->isEmpty()) {
            return;
        }

        // Group by product_id + date
        $groups = $taggedMovements->groupBy(function ($m) {
            return $m->product_id.':'.substr($m->created_at, 0, 10);
        });

        foreach ($groups as $key => $movements) {
            [$productId, $date] = explode(':', $key);

            // --- Compute available_stock target ---
            $setAvailIn = $movements
                ->where('type', 'adjustment_in')
                ->filter(fn ($m) => str_contains((string) $m->notes, '[set:available]'))
                ->sum('quantity');

            $setAvailOut = $movements
                ->where('type', 'adjustment_out')
                ->filter(fn ($m) => str_contains((string) $m->notes, '[set:available]'))
                ->sum('quantity');

            $hasSetAvail = ($setAvailIn + $setAvailOut) > 0;

            $availableStock = null;
            if ($hasSetAvail) {
                // Baseline: all received + non-[set:available] adj_in - non-[set:available] adj_out before this date
                $receivedBefore = DB::table('stock_movements')
                    ->where('product_id', $productId)
                    ->where('created_at', '<', $date.' 00:00:00')
                    ->where('type', 'received')
                    ->sum('quantity');

                $adjInBefore = DB::table('stock_movements')
                    ->where('product_id', $productId)
                    ->where('created_at', '<', $date.' 00:00:00')
                    ->where('type', 'adjustment_in')
                    ->where('notes', 'not like', '%[set:available]%')
                    ->sum('quantity');

                $adjOutBefore = DB::table('stock_movements')
                    ->where('product_id', $productId)
                    ->where('created_at', '<', $date.' 00:00:00')
                    ->where('type', 'adjustment_out')
                    ->where('notes', 'not like', '%[set:available]%')
                    ->sum('quantity');

                $baseline = $receivedBefore + $adjInBefore - $adjOutBefore;
                $availableStock = $baseline + ($setAvailIn - $setAvailOut);
            }

            // --- Compute received_today target ---
            $setRecvIn = $movements
                ->where('type', 'adjustment_in')
                ->filter(fn ($m) => str_contains((string) $m->notes, '[set:received]'))
                ->sum('quantity');

            $setRecvOut = $movements
                ->where('type', 'adjustment_out')
                ->filter(fn ($m) => str_contains((string) $m->notes, '[set:received]'))
                ->sum('quantity');

            $hasSetRecv = ($setRecvIn + $setRecvOut) > 0;

            $receivedToday = null;
            if ($hasSetRecv) {
                $receivedRaw = DB::table('stock_movements')
                    ->where('product_id', $productId)
                    ->whereDate('created_at', $date)
                    ->where('type', 'received')
                    ->sum('quantity');

                $receivedToday = $receivedRaw + ($setRecvIn - $setRecvOut);
            }

            if ($availableStock === null && $receivedToday === null) {
                continue;
            }

            // Insert snapshot (ignore if already exists from a previous run)
            DB::table('daily_stock_snapshots')->insertOrIgnore([
                'product_id' => $productId,
                'date' => $date,
                'available_stock' => $availableStock,
                'received_today' => $receivedToday,
                'notes' => 'Migrated from legacy [set:*] adjustments',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // Remove all [set:*] tagged movements — they are now represented in snapshots
        DB::table('stock_movements')
            ->where(function ($q) {
                $q->where('notes', 'like', '%[set:available]%')
                    ->orWhere('notes', 'like', '%[set:received]%');
            })
            ->delete();
    }

    public function down(): void
    {
        // Cannot reliably reverse: just truncate snapshots
        DB::table('daily_stock_snapshots')->truncate();
    }
};
