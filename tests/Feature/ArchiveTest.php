<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Models\SupplierCreditTransaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ArchiveTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_login(): void
    {
        $this->get('/archive')->assertRedirect('/login');
    }

    public function test_authenticated_users_can_view_archive_page(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/archive')
            ->assertOk();
    }

    public function test_product_with_sales_is_archived_not_deleted(): void
    {
        $user = User::factory()->create();
        $product = Product::factory()->create(['is_active' => true]);
        $sale = Sale::factory()->create();
        SaleItem::factory()->create(['product_id' => $product->id, 'sale_id' => $sale->id]);

        $this->actingAs($user)
            ->delete(route('products.destroy', $product->id))
            ->assertRedirect();

        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'is_active' => false,
        ]);
    }

    public function test_product_with_stock_movements_is_archived_not_deleted(): void
    {
        $user = User::factory()->create();
        $product = Product::factory()->create(['is_active' => true]);
        StockMovement::factory()->create(['product_id' => $product->id]);

        $this->actingAs($user)
            ->delete(route('products.destroy', $product->id))
            ->assertRedirect();

        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'is_active' => false,
        ]);
    }

    public function test_product_without_related_data_is_hard_deleted(): void
    {
        $user = User::factory()->create();
        $product = Product::factory()->create(['is_active' => true]);

        $this->actingAs($user)
            ->delete(route('products.destroy', $product->id))
            ->assertRedirect();

        $this->assertDatabaseMissing('products', ['id' => $product->id]);
    }

    public function test_customer_with_sales_is_archived_not_deleted(): void
    {
        $user = User::factory()->create();
        $customer = Customer::factory()->create(['is_active' => true]);
        Sale::factory()->create(['customer_id' => $customer->id]);

        $this->actingAs($user)
            ->delete(route('customers.destroy', $customer->id))
            ->assertRedirect();

        $this->assertDatabaseHas('customers', [
            'id' => $customer->id,
            'is_active' => false,
        ]);
    }

    public function test_customer_without_related_data_is_hard_deleted(): void
    {
        $user = User::factory()->create();
        $customer = Customer::factory()->create(['is_active' => true]);

        $this->actingAs($user)
            ->delete(route('customers.destroy', $customer->id))
            ->assertRedirect();

        $this->assertDatabaseMissing('customers', ['id' => $customer->id]);
    }

    public function test_supplier_with_transactions_is_archived_not_deleted(): void
    {
        $user = User::factory()->create();
        $supplier = Supplier::factory()->create(['is_active' => true]);
        SupplierCreditTransaction::factory()->create(['supplier_id' => $supplier->id]);

        $this->actingAs($user)
            ->delete(route('suppliers.destroy', $supplier->id))
            ->assertRedirect();

        $this->assertDatabaseHas('suppliers', [
            'id' => $supplier->id,
            'is_active' => false,
        ]);
    }

    public function test_supplier_without_related_data_is_hard_deleted(): void
    {
        $user = User::factory()->create();
        $supplier = Supplier::factory()->create(['is_active' => true]);

        $this->actingAs($user)
            ->delete(route('suppliers.destroy', $supplier->id))
            ->assertRedirect();

        $this->assertDatabaseMissing('suppliers', ['id' => $supplier->id]);
    }

    public function test_archived_products_appear_on_archive_page(): void
    {
        $user = User::factory()->create();
        $archivedProduct = Product::factory()->create(['is_active' => false, 'name' => 'Archived Product']);
        $activeProduct = Product::factory()->create(['is_active' => true, 'name' => 'Active Product']);

        $response = $this->actingAs($user)->get('/archive');

        $response->assertOk();
        $response->assertInertia(
            fn($page) => $page
                ->component('archive')
                ->has('products', 1)
                ->where('products.0.name', 'Archived Product')
        );
    }

    public function test_archived_customers_appear_on_archive_page(): void
    {
        $user = User::factory()->create();
        $archivedCustomer = Customer::factory()->create(['is_active' => false, 'name' => 'Archived Customer']);

        $response = $this->actingAs($user)->get('/archive');

        $response->assertOk();
        $response->assertInertia(
            fn($page) => $page
                ->component('archive')
                ->has('customers', 1)
                ->where('customers.0.name', 'Archived Customer')
        );
    }

    public function test_archived_suppliers_appear_on_archive_page(): void
    {
        $user = User::factory()->create();
        $archivedSupplier = Supplier::factory()->create(['is_active' => false, 'name' => 'Archived Supplier']);

        $response = $this->actingAs($user)->get('/archive');

        $response->assertOk();
        $response->assertInertia(
            fn($page) => $page
                ->component('archive')
                ->has('suppliers', 1)
                ->where('suppliers.0.name', 'Archived Supplier')
        );
    }

    public function test_restore_product_sets_is_active_to_true(): void
    {
        $user = User::factory()->create();
        $product = Product::factory()->create(['is_active' => false]);

        $this->actingAs($user)
            ->patch(route('archive.restore-product', $product->id))
            ->assertRedirect();

        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'is_active' => true,
        ]);
    }

    public function test_restore_customer_sets_is_active_to_true(): void
    {
        $user = User::factory()->create();
        $customer = Customer::factory()->create(['is_active' => false]);

        $this->actingAs($user)
            ->patch(route('archive.restore-customer', $customer->id))
            ->assertRedirect();

        $this->assertDatabaseHas('customers', [
            'id' => $customer->id,
            'is_active' => true,
        ]);
    }

    public function test_restore_supplier_sets_is_active_to_true(): void
    {
        $user = User::factory()->create();
        $supplier = Supplier::factory()->create(['is_active' => false]);

        $this->actingAs($user)
            ->patch(route('archive.restore-supplier', $supplier->id))
            ->assertRedirect();

        $this->assertDatabaseHas('suppliers', [
            'id' => $supplier->id,
            'is_active' => true,
        ]);
    }

    public function test_inactive_products_are_filtered_from_products_index(): void
    {
        $user = User::factory()->create();
        $activeProduct = Product::factory()->create(['is_active' => true, 'name' => 'Active']);
        $inactiveProduct = Product::factory()->create(['is_active' => false, 'name' => 'Inactive']);

        $response = $this->actingAs($user)->get('/products');

        $response->assertOk();
        $response->assertInertia(
            fn($page) => $page
                ->component('products')
                ->has('products', 1)
                ->where('products.0.name', 'Active')
        );
    }

    public function test_inactive_customers_are_filtered_from_customers_index(): void
    {
        $user = User::factory()->create();
        $activeCustomer = Customer::factory()->create(['is_active' => true, 'name' => 'Active']);
        $inactiveCustomer = Customer::factory()->create(['is_active' => false, 'name' => 'Inactive']);

        $response = $this->actingAs($user)->get('/customers');

        $response->assertOk();
        $response->assertInertia(
            fn($page) => $page
                ->component('customers')
                ->has('customers', 1)
                ->where('customers.0.name', 'Active')
        );
    }

    public function test_inactive_suppliers_are_filtered_from_suppliers_index(): void
    {
        $user = User::factory()->create();
        Supplier::factory()->create(['is_active' => true, 'name' => 'Active Supplier']);
        Supplier::factory()->create(['is_active' => false, 'name' => 'Inactive Supplier']);

        $response = $this->actingAs($user)->get('/suppliers');

        $response->assertOk();
        $response->assertInertia(
            fn($page) => $page
                ->component('suppliers')
                ->has('suppliers', 1)
                ->where('suppliers.0.name', 'Active Supplier')
        );
    }

    public function test_stock_movement_deletion_blocked_when_would_cause_negative_stock(): void
    {
        $user = User::factory()->create();
        $product = Product::factory()->create();

        $receivedMovement = StockMovement::factory()->create([
            'product_id' => $product->id,
            'type' => 'received',
            'quantity' => 10,
        ]);

        $sale = Sale::factory()->create(['payment_type' => 'cash']);
        SaleItem::factory()->create([
            'product_id' => $product->id,
            'sale_id' => $sale->id,
            'quantity' => 8,
        ]);

        $this->actingAs($user)
            ->delete(route('stock-control.destroy', $receivedMovement->id))
            ->assertRedirect()
            ->assertSessionHas('error');

        $this->assertDatabaseHas('stock_movements', ['id' => $receivedMovement->id]);
    }

    public function test_stock_movement_deletion_allowed_when_stock_available(): void
    {
        $user = User::factory()->create();
        $product = Product::factory()->create();

        StockMovement::factory()->create([
            'product_id' => $product->id,
            'type' => 'received',
            'quantity' => 20,
        ]);

        $extraMovement = StockMovement::factory()->create([
            'product_id' => $product->id,
            'type' => 'received',
            'quantity' => 5,
        ]);

        $this->actingAs($user)
            ->delete(route('stock-control.destroy', $extraMovement->id))
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertDatabaseMissing('stock_movements', ['id' => $extraMovement->id]);
    }
}
