<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\StockMovement;
use App\Models\User;
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

    public function test_stores_received_stock_on_selected_date_with_parsed_quantity(): void
    {
        $user = $this->makeUser();
        $this->actingAs($user);

        $product = $this->makeProduct(['lines_per_carton' => 12]);
        $date = '2025-09-02';

        $response = $this->post(route('stock-control.store'), [
            'product_id' => $product->id,
            'quantity' => '1C5L', // 17 lines
            'notes' => 'Initial receive',
            'date' => $date,
        ]);

        $response->assertRedirect(route('stock-control.index'));

        $movement = StockMovement::query()->firstOrFail();
        $this->assertSame('received', $movement->type);
        $this->assertSame(17, (int) $movement->quantity);
        $this->assertSame($date, $movement->created_at->toDateString());
    }

    public function test_adjusts_available_stock_baseline_at_start_of_day(): void
    {
        $user = $this->makeUser();
        $this->actingAs($user);

        $product = $this->makeProduct(['lines_per_carton' => 10]);
        $date = '2025-09-03';

        $prev = StockMovement::query()->create([
            'product_id' => $product->id,
            'type' => 'received',
            'quantity' => 20,
            'notes' => null,
        ]);
        $prev->created_at = '2025-09-02 12:00:00';
        $prev->save();

        $response = $this->post(route('stock-control.adjust'), [
            'product_id' => $product->id,
            'date' => $date,
            'available_stock_target' => '2C5L', // 25
            'received_today_target' => null,
            'notes' => 'Baseline set',
        ]);

        $response->assertRedirect();

        $adj = StockMovement::query()
            ->where('product_id', $product->id)
            ->whereIn('type', ['adjustment_in','adjustment_out'])
            ->latest('id')
            ->first();

        $this->assertNotNull($adj);
        $this->assertSame('adjustment_in', $adj->type);
        $this->assertSame(5, (int) $adj->quantity);
        $this->assertSame($date, $adj->created_at->toDateString());
        $this->assertSame('00:00:00', $adj->created_at->format('H:i:s'));
    }

    public function test_adjusts_received_today_at_midday_for_selected_date(): void
    {
        $user = $this->makeUser();
        $this->actingAs($user);

        $product = $this->makeProduct(['lines_per_carton' => 10]);
        $date = '2025-09-04';

        $rec = StockMovement::query()->create([
            'product_id' => $product->id,
            'type' => 'received',
            'quantity' => 3,
            'notes' => null,
        ]);
        $rec->created_at = $date . ' 09:00:00';
        $rec->save();

        $response = $this->post(route('stock-control.adjust'), [
            'product_id' => $product->id,
            'date' => $date,
            'available_stock_target' => null,
            'received_today_target' => '8',
            'notes' => 'Received set',
        ]);

        $response->assertRedirect();

        $adj = StockMovement::query()
            ->where('product_id', $product->id)
            ->whereIn('type', ['adjustment_in','adjustment_out'])
            ->latest('id')
            ->first();

        $this->assertNotNull($adj);
        $this->assertSame('adjustment_in', $adj->type);
        $this->assertSame(5, (int) $adj->quantity);
        $this->assertSame($date, $adj->created_at->toDateString());
        $this->assertSame('12:00:00', $adj->created_at->format('H:i:s'));
    }
}


