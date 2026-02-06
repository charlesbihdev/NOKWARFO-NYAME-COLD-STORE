<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Supplier;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ProductController extends Controller
{
    public function index()
    {
        $products = Product::where('is_active', true)
            ->with(['supplier'])
            ->get()
            ->map(function ($product) {
                $product->sale_items_count = $product->saleItems()->count();
                $product->stock_movements_count = $product->stockMovements()->count();

                return $product;
            });
        $suppliers = Supplier::where('is_active', true)->get();

        return Inertia::render('products', [
            'products' => $products,
            'suppliers' => $suppliers,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'lines_per_carton' => 'required|integer|min:1|max:8',
            'cost_price_per_carton' => 'required|numeric|min:0',
            'description' => 'nullable|string|max:1000',
            'category' => 'required|string|max:255',
            // 'supplier_id' => 'required|exists:suppliers,id',
        ]);

        $validated['is_active'] = true;
        Product::create($validated);

        return back()->with([
            'success' => 'Product created successfully',
        ]);
    }

    public function update(Request $request, Product $product)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'lines_per_carton' => 'required|integer|min:1|max:8',
            'cost_price_per_carton' => 'required|numeric|min:0',
            'description' => 'nullable|string|max:1000',
            'category' => 'required|string|max:255',
            // 'supplier_id' => 'required|exists:suppliers,id',
        ]);

        $product->update($validated);

        return back()->with([
            'success' => 'Product updated successfully',
        ]);
    }

    public function destroy(Product $product)
    {
        $hasRelatedData = $product->saleItems()->exists() || $product->stockMovements()->exists();

        if ($hasRelatedData) {
            $product->update(['is_active' => false]);

            return back()->with('success', 'Product archived successfully');
        }

        $product->delete();

        return back()->with('success', 'Product deleted successfully');
    }

    public function toggleStatus(Product $product)
    {
        $product->update([
            'is_active' => ! $product->is_active,
        ]);

        $status = $product->is_active ? 'restored' : 'archived';

        return back()->with('success', "Product {$status} successfully");
    }
}
