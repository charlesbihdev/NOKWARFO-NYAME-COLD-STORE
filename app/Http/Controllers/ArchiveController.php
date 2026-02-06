<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Product;
use App\Models\Supplier;
use Inertia\Inertia;

class ArchiveController extends Controller
{
    public function index()
    {
        $products = Product::where('is_active', false)
            ->with('supplier')
            ->orderBy('name')
            ->get()
            ->map(function ($product) {
                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'category' => $product->category,
                    'supplier_name' => $product->supplier?->name,
                    'sale_items_count' => $product->saleItems()->count(),
                    'stock_movements_count' => $product->stockMovements()->count(),
                    'updated_at' => $product->updated_at->format('Y-m-d'),
                ];
            });

        $customers = Customer::where('is_active', false)
            ->orderBy('name')
            ->get()
            ->map(function ($customer) {
                return [
                    'id' => $customer->id,
                    'name' => $customer->name,
                    'phone' => $customer->phone,
                    'email' => $customer->email,
                    'sales_count' => $customer->sales()->count(),
                    'outstanding_balance' => $customer->getOutstandingBalance(),
                    'updated_at' => $customer->updated_at->format('Y-m-d'),
                ];
            });

        $suppliers = Supplier::where('is_active', false)
            ->orderBy('name')
            ->get()
            ->map(function ($supplier) {
                return [
                    'id' => $supplier->id,
                    'name' => $supplier->name,
                    'contact_person' => $supplier->contact_person,
                    'phone' => $supplier->phone,
                    'transactions_count' => $supplier->creditTransactions()->count(),
                    'payments_count' => $supplier->payments()->count(),
                    'total_outstanding' => $supplier->total_outstanding,
                    'updated_at' => $supplier->updated_at->format('Y-m-d'),
                ];
            });

        return Inertia::render('archive', [
            'products' => $products,
            'customers' => $customers,
            'suppliers' => $suppliers,
        ]);
    }

    public function restoreProduct(Product $product)
    {
        $product->update(['is_active' => true]);

        return back()->with('success', 'Product restored successfully');
    }

    public function restoreCustomer(Customer $customer)
    {
        $customer->update(['is_active' => true]);

        return back()->with('success', 'Customer restored successfully');
    }

    public function restoreSupplier(Supplier $supplier)
    {
        $supplier->update(['is_active' => true]);

        return back()->with('success', 'Supplier restored successfully');
    }
}
