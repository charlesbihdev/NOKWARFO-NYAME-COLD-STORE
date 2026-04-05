<?php

namespace Tests\Feature;

use App\Models\DailyStockSnapshot;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\StockMovement;
use App\Models\User;
use App\Services\StockCalculationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StockControlTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(): User
    {
        return User::factory()->create();
    }

    private function makeProduct(array $overrides = []): Product
    {
        return Product::query()->create(array_merge([
            'name' => 'Test Product',
            'description' => null,
            'lines_per_carton' => 10,
            'category' => null,
            'supplier_id' => null,
            'is_active' => true,
        ], $overrides));
    }

    private function addReceived(Product $product, string $datetime, int $quantity): StockMovement
    {
        $m = StockMovement::create(['product_id' => $product->id, 'type' => 'received', 'quantity' => $quantity]);
        $m->created_at = $datetime;
        $m->save();

        return $m;
    }

    private function addSale(Product $product, string $date, int $quantity, string $paymentType = 'cash'): SaleItem
    {
        $sale = Sale::create([
            'transaction_id' => uniqid('txn_', true),
            'payment_type' => $paymentType,
            'subtotal' => $quantity * 10,
            'total' => $quantity * 10,
            'user_id' => User::factory()->create()->id,
        ]);
        // created_at is not in $fillable — set it directly like addReceived() does
        $sale->created_at = $date.' 14:00:00';
        $sale->save();

        return SaleItem::create([
            'sale_id' => $sale->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'quantity' => $quantity,
            'unit_selling_price' => 10,
            'unit_cost_price' => 8,
            'total' => $quantity * 10,
            'profit' => $quantity * 2,
        ]);
    }

    // -------------------------------------------------------------------------
    // store() — Add Stock
    // -------------------------------------------------------------------------

    public function test_stores_received_stock_on_selected_date_with_parsed_quantity(): void
    {
        $user = $this->makeUser();
        $product = $this->makeProduct(['lines_per_carton' => 12]);
        $date = '2025-09-02';

        $response = $this->actingAs($user)->post(route('stock-control.store'), [
            'product_id' => $product->id,
            'quantity' => '1C5L', // 1*12 + 5 = 17
            'notes' => 'Initial receive',
            'date' => $date,
        ]);

        $response->assertRedirect(route('stock-control.index'));

        $movement = StockMovement::query()->firstOrFail();
        $this->assertSame('received', $movement->type);
        $this->assertSame(17, (int) $movement->quantity);
        $this->assertSame($date, $movement->created_at->toDateString());
    }

    // -------------------------------------------------------------------------
    // adjust() — Snapshot-based override
    // -------------------------------------------------------------------------

    public function test_adjust_creates_snapshot_with_available_stock_target(): void
    {
        $user = $this->makeUser();
        $product = $this->makeProduct(['lines_per_carton' => 10]);
        $date = '2025-09-03';

        $response = $this->actingAs($user)->post(route('stock-control.adjust'), [
            'product_id' => $product->id,
            'date' => $date,
            'available_stock_target' => '2C5L', // 25
            'received_today_target' => null,
            'notes' => 'Baseline set',
        ]);

        $response->assertRedirect();

        $snap = DailyStockSnapshot::where('product_id', $product->id)->where('date', $date)->first();
        $this->assertNotNull($snap);
        $this->assertSame(25, $snap->available_stock);
        $this->assertNull($snap->received_today);
    }

    public function test_adjust_creates_snapshot_with_received_today_target(): void
    {
        $user = $this->makeUser();
        $product = $this->makeProduct(['lines_per_carton' => 10]);
        $date = '2025-09-04';

        // A real received movement already exists
        $this->addReceived($product, $date.' 09:00:00', 3);

        $response = $this->actingAs($user)->post(route('stock-control.adjust'), [
            'product_id' => $product->id,
            'date' => $date,
            'available_stock_target' => null,
            'received_today_target' => '8',
            'notes' => 'Received corrected',
        ]);

        $response->assertRedirect();

        $snap = DailyStockSnapshot::where('product_id', $product->id)->where('date', $date)->first();
        $this->assertNotNull($snap);
        $this->assertNull($snap->available_stock);
        $this->assertSame(80, $snap->received_today); // 8 cartons * 10 lines_per_carton
    }

    public function test_adjust_updates_only_changed_field_when_snapshot_already_exists(): void
    {
        $user = $this->makeUser();
        $product = $this->makeProduct(['lines_per_carton' => 10]);
        $date = '2025-09-05';

        // Pre-existing snapshot with both fields
        DailyStockSnapshot::create([
            'product_id' => $product->id,
            'date' => $date,
            'available_stock' => 50,
            'received_today' => 20,
        ]);

        // Update only available_stock; received_today must not be wiped
        $this->actingAs($user)->post(route('stock-control.adjust'), [
            'product_id' => $product->id,
            'date' => $date,
            'available_stock_target' => '3C', // 30
            'received_today_target' => null,
        ]);

        $snap = DailyStockSnapshot::where('product_id', $product->id)->where('date', $date)->first();
        $this->assertSame(30, $snap->available_stock);
        $this->assertSame(20, $snap->received_today); // unchanged
    }

    public function test_adjust_rejects_when_total_available_would_be_less_than_sales(): void
    {
        $user = $this->makeUser();
        $product = $this->makeProduct(['lines_per_carton' => 1]); // bare number = lines, not cartons
        $date = '2025-09-06';

        // 15 units sold today
        $this->addSale($product, $date, 15);

        // Try to set available=5 lines, received=0 → total=5 < 15 sales → should reject
        $response = $this->actingAs($user)->post(route('stock-control.adjust'), [
            'product_id' => $product->id,
            'date' => $date,
            'available_stock_target' => '5',
            'received_today_target' => null,
        ]);

        $response->assertSessionHasErrors('adjustment');
        $this->assertDatabaseMissing('daily_stock_snapshots', ['product_id' => $product->id]);
    }

    // -------------------------------------------------------------------------
    // StockCalculationService — carry-forward logic
    // -------------------------------------------------------------------------

    public function test_available_stock_is_zero_when_no_history_exists(): void
    {
        $product = $this->makeProduct();
        $service = new StockCalculationService;

        $this->assertSame(0, $service->getAvailableStock($product, '2025-10-01'));
    }

    public function test_available_stock_uses_snapshot_when_set(): void
    {
        $product = $this->makeProduct();
        $date = '2025-10-01';

        DailyStockSnapshot::create(['product_id' => $product->id, 'date' => $date, 'available_stock' => 50]);

        $service = new StockCalculationService;
        $this->assertSame(50, $service->getAvailableStock($product, $date));
    }

    public function test_carry_forward_single_day(): void
    {
        // Day 1: available=0, received=100, sales=30 → remaining=70
        // Day 2: available=70 (carry-forward from Day 1)
        $product = $this->makeProduct(['lines_per_carton' => 1]);
        $service = new StockCalculationService;

        $this->addReceived($product, '2025-10-01 12:00:00', 100);
        $this->addSale($product, '2025-10-01', 30);

        $this->assertSame(70, $service->getAvailableStock($product, '2025-10-02'));
    }

    public function test_carry_forward_multiple_days(): void
    {
        // Day 1: available=0, received=100, sales=30 → remaining=70
        // Day 2: available=70, received=50, sales=20 → remaining=100
        // Day 3: available=100 (carry-forward)
        $product = $this->makeProduct(['lines_per_carton' => 1]);
        $service = new StockCalculationService;

        $this->addReceived($product, '2025-10-01 12:00:00', 100);
        $this->addSale($product, '2025-10-01', 30);

        $this->addReceived($product, '2025-10-02 12:00:00', 50);
        $this->addSale($product, '2025-10-02', 20);

        $this->assertSame(100, $service->getAvailableStock($product, '2025-10-03'));
    }

    public function test_snapshot_resets_carry_forward_chain(): void
    {
        // Day 1: available=0, received=100, sales=30 → remaining=70
        // Day 2 snapshot: available_stock=40 (operator override — ignores Day 1's remaining)
        // Day 3: available=remaining(Day 2) = 40 + 0 - 0 = 40
        $product = $this->makeProduct(['lines_per_carton' => 1]);
        $service = new StockCalculationService;

        $this->addReceived($product, '2025-10-01 12:00:00', 100);
        $this->addSale($product, '2025-10-01', 30);

        DailyStockSnapshot::create(['product_id' => $product->id, 'date' => '2025-10-02', 'available_stock' => 40]);

        $this->assertSame(40, $service->getAvailableStock($product, '2025-10-03'));
    }

    public function test_carry_forward_skips_days_with_no_activity(): void
    {
        // Day 1: received=50, sales=10 → remaining=40
        // Days 2–4: no activity
        // Day 5: available=40
        $product = $this->makeProduct(['lines_per_carton' => 1]);
        $service = new StockCalculationService;

        $this->addReceived($product, '2025-10-01 12:00:00', 50);
        $this->addSale($product, '2025-10-01', 10);

        $this->assertSame(40, $service->getAvailableStock($product, '2025-10-05'));
    }

    public function test_received_today_uses_snapshot_when_set(): void
    {
        $product = $this->makeProduct(['lines_per_carton' => 1]);
        $date = '2025-10-01';
        $service = new StockCalculationService;

        // Actual movement: 30
        $this->addReceived($product, $date.' 12:00:00', 30);
        // Snapshot override: 50
        DailyStockSnapshot::create(['product_id' => $product->id, 'date' => $date, 'received_today' => 50]);

        $this->assertSame(50, $service->getReceivedToday($product, $date));
    }

    public function test_received_today_falls_back_to_movements_when_no_snapshot(): void
    {
        $product = $this->makeProduct(['lines_per_carton' => 1]);
        $date = '2025-10-01';
        $service = new StockCalculationService;

        $this->addReceived($product, $date.' 12:00:00', 30);

        $this->assertSame(30, $service->getReceivedToday($product, $date));
    }

    public function test_summary_remaining_becomes_next_day_available(): void
    {
        // Day 1: available=0, received=100, adj_in=0, adj_out=0, sales=25 → remaining=75
        // Day 2: available=75 (the carry-forward)
        // Day 2 received=20, sales=10 → remaining=85
        // Day 3: available=85
        $product = $this->makeProduct(['lines_per_carton' => 1]);
        $service = new StockCalculationService;

        $this->addReceived($product, '2025-10-01 12:00:00', 100);
        $this->addSale($product, '2025-10-01', 25);

        $this->addReceived($product, '2025-10-02 12:00:00', 20);
        $this->addSale($product, '2025-10-02', 10);

        $day2Summary = $service->computeSummaryForDate($product, '2025-10-02');
        $this->assertSame(75, $day2Summary['available_stock_raw']);
        $this->assertSame(85, $day2Summary['remaining_stock_raw']);

        $this->assertSame(85, $service->getAvailableStock($product, '2025-10-03'));
    }
}
