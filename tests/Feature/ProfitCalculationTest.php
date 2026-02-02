<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfitCalculationTest extends TestCase
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
            'cost_price_per_carton' => 100.00,
            'category' => 'Test',
            'supplier_id' => null,
            'is_active' => true,
        ], $overrides));
    }

    private function makeCustomer(): Customer
    {
        return Customer::query()->create([
            'name' => 'Test Customer',
            'phone' => '0241234567',
            'email' => 'test@example.com',
            'address' => 'Test Address',
            'is_active' => true,
        ]);
    }

    public function test_profit_is_calculated_on_sale_creation(): void
    {
        $user = $this->makeUser();
        $this->actingAs($user);

        // Product: 10 lines per carton, cost 100/carton = 10/line
        $product = $this->makeProduct([
            'lines_per_carton' => 10,
            'cost_price_per_carton' => 100.00,
        ]);

        $customer = $this->makeCustomer();

        // Sell 1 carton (10 lines) at 150/carton = 15/line
        $response = $this->post(route('sales-transactions.store'), [
            'customer_id' => $customer->id,
            'transaction_date' => now()->toDateString(),
            'items' => [
                [
                    'product_id' => $product->id,
                    'qty' => 10, // 1 carton = 10 lines
                    'unit_selling_price' => 150.00, // per carton
                    'total' => 150.00,
                ],
            ],
            'amount_paid' => 150.00,
            'payment_type' => 'cash',
        ]);

        $response->assertRedirect(route('sales-transactions.index'));

        $saleItem = SaleItem::query()->firstOrFail();

        // unit_selling_price should be converted to per-line: 150 / 10 = 15
        $this->assertEquals(15.00, (float) $saleItem->unit_selling_price);

        // unit_cost_price should be per-line: 100 / 10 = 10
        $this->assertEquals(10.00, (float) $saleItem->unit_cost_price);

        // profit = (15 - 10) * 10 = 50
        $this->assertEquals(50.00, (float) $saleItem->profit);
    }

    public function test_profit_is_zero_when_product_has_no_cost_price(): void
    {
        $user = $this->makeUser();
        $this->actingAs($user);

        // Product with no cost price
        $product = $this->makeProduct([
            'lines_per_carton' => 10,
            'cost_price_per_carton' => null,
        ]);

        $customer = $this->makeCustomer();

        $response = $this->post(route('sales-transactions.store'), [
            'customer_id' => $customer->id,
            'transaction_date' => now()->toDateString(),
            'items' => [
                [
                    'product_id' => $product->id,
                    'qty' => 10,
                    'unit_selling_price' => 150.00,
                    'total' => 150.00,
                ],
            ],
            'amount_paid' => 150.00,
            'payment_type' => 'cash',
        ]);

        $response->assertRedirect(route('sales-transactions.index'));

        $saleItem = SaleItem::query()->firstOrFail();

        // unit_cost_price should be 0 (no cost data)
        $this->assertEquals(0.00, (float) $saleItem->unit_cost_price);

        // profit = (15 - 0) * 10 = 150 (all revenue is profit when no cost)
        $this->assertEquals(150.00, (float) $saleItem->profit);
    }

    public function test_profit_calculation_with_mixed_cartons_and_lines(): void
    {
        $user = $this->makeUser();
        $this->actingAs($user);

        // Product: 4 lines per carton, cost 80/carton = 20/line
        $product = $this->makeProduct([
            'lines_per_carton' => 4,
            'cost_price_per_carton' => 80.00,
        ]);

        $customer = $this->makeCustomer();

        // Sell 2 cartons + 2 lines = 10 lines total at 100/carton = 25/line
        $response = $this->post(route('sales-transactions.store'), [
            'customer_id' => $customer->id,
            'transaction_date' => now()->toDateString(),
            'items' => [
                [
                    'product_id' => $product->id,
                    'qty' => 10, // 2 cartons + 2 lines = 10 lines
                    'unit_selling_price' => 100.00, // per carton
                    'total' => 250.00, // will be recalculated
                ],
            ],
            'amount_paid' => 250.00,
            'payment_type' => 'cash',
        ]);

        $response->assertRedirect(route('sales-transactions.index'));

        $saleItem = SaleItem::query()->firstOrFail();

        // unit_selling_price per line: 100 / 4 = 25
        $this->assertEquals(25.00, (float) $saleItem->unit_selling_price);

        // unit_cost_price per line: 80 / 4 = 20
        $this->assertEquals(20.00, (float) $saleItem->unit_cost_price);

        // profit = (25 - 20) * 10 = 50
        $this->assertEquals(50.00, (float) $saleItem->profit);
    }

    public function test_recalculate_historical_profits(): void
    {
        $user = $this->makeUser();
        $this->actingAs($user);

        // Create a product with cost price
        $product = $this->makeProduct([
            'lines_per_carton' => 10,
            'cost_price_per_carton' => 100.00,
        ]);

        // Create a sale with existing sale item that has 0 profit (simulating historical data)
        $sale = Sale::query()->create([
            'transaction_id' => 'TXN-TEST-001',
            'customer_id' => null,
            'customer_name' => 'Test Customer',
            'subtotal' => 150.00,
            'tax' => 0,
            'total' => 150.00,
            'payment_type' => 'cash',
            'status' => 'completed',
            'amount_paid' => 150.00,
            'user_id' => $user->id,
        ]);

        $saleItem = SaleItem::query()->create([
            'sale_id' => $sale->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'quantity' => 10,
            'unit_selling_price' => 15.00, // per line
            'unit_cost_price' => 0, // simulating no cost data
            'total' => 150.00,
            'profit' => 0, // simulating no profit calculated
        ]);

        // Trigger recalculate
        $response = $this->post(route('profit-analysis.recalculate'));

        $response->assertRedirect();
        $response->assertSessionHas('success');

        // Refresh the sale item
        $saleItem->refresh();

        // unit_cost_price should now be set: 100 / 10 = 10
        $this->assertEquals(10.00, (float) $saleItem->unit_cost_price);

        // profit should now be calculated: (15 - 10) * 10 = 50
        $this->assertEquals(50.00, (float) $saleItem->profit);
    }

    public function test_profit_analysis_excludes_items_without_cost_data(): void
    {
        $user = $this->makeUser();
        $this->actingAs($user);

        $product = $this->makeProduct([
            'lines_per_carton' => 10,
            'cost_price_per_carton' => 100.00,
        ]);

        // Create a sale with cost data
        $sale1 = Sale::query()->create([
            'transaction_id' => 'TXN-TEST-002',
            'customer_name' => 'Customer 1',
            'subtotal' => 150.00,
            'tax' => 0,
            'total' => 150.00,
            'payment_type' => 'cash',
            'status' => 'completed',
            'amount_paid' => 150.00,
            'user_id' => $user->id,
        ]);

        SaleItem::query()->create([
            'sale_id' => $sale1->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'quantity' => 10,
            'unit_selling_price' => 15.00,
            'unit_cost_price' => 10.00, // has cost data
            'total' => 150.00,
            'profit' => 50.00,
        ]);

        // Create a sale without cost data
        $sale2 = Sale::query()->create([
            'transaction_id' => 'TXN-TEST-003',
            'customer_name' => 'Customer 2',
            'subtotal' => 200.00,
            'tax' => 0,
            'total' => 200.00,
            'payment_type' => 'cash',
            'status' => 'completed',
            'amount_paid' => 200.00,
            'user_id' => $user->id,
        ]);

        SaleItem::query()->create([
            'sale_id' => $sale2->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'quantity' => 10,
            'unit_selling_price' => 20.00,
            'unit_cost_price' => 0, // no cost data
            'total' => 200.00,
            'profit' => 0,
        ]);

        $response = $this->get(route('profit-analysis.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('profit-analysis')
            ->has('total_product_sales', 1) // Only 1 product should be included
            ->where('excluded_count', 1) // 1 item excluded
        );
    }
}
