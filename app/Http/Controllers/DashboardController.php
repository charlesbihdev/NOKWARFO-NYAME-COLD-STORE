<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
use App\Models\Sale;
use Inertia\Inertia;
use App\Models\Product;
use App\Models\Customer;
use App\Models\SaleItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        // Get selected date from frontend or default to today
        $selectedDate = $request->query('date', now()->toDateString());

        // Parse dates
        $today = Carbon::parse($selectedDate)->format('Y-m-d');
        $lastMonth = Carbon::parse($selectedDate)->subMonth()->format('Y-m-d');

        // Today's sales (actually "selected date sales")
        $todaySales = SaleItem::whereHas('sale', function ($query) use ($today) {
            $query->whereDate('created_at', $today);
        })->sum(DB::raw('(unit_selling_price * quantity)'));

        // Same day last month sales
        $lastMonthTodaySales = SaleItem::whereHas('sale', function ($query) use ($lastMonth) {
            $query->whereDate('created_at', $lastMonth);
        })->sum(DB::raw('(unit_selling_price * quantity)'));

        $salesChange = $lastMonthTodaySales != 0
            ? (($todaySales - $lastMonthTodaySales) / abs($lastMonthTodaySales)) * 100
            : 0;

        // Products sold on selected date
        $productsSoldToday = SaleItem::whereHas('sale', function ($query) use ($today) {
            $query->whereDate('created_at', $today);
        })->sum('quantity');

        $productsSoldLastMonth = SaleItem::whereHas('sale', function ($query) use ($lastMonth) {
            $query->whereDate('created_at', $lastMonth);
        })->sum('quantity');

        $productsChange = $productsSoldLastMonth != 0
            ? (($productsSoldToday - $productsSoldLastMonth) / abs($productsSoldLastMonth)) * 100
            : 0;

        // Low stock items (less than 5 units)
        $lowStockItems = Product::with(['stockMovements', 'saleItems.sale'])
            ->get()
            ->filter(function ($product) {
                $incoming = $product->stockMovements()
                    ->where('type', 'received')
                    ->sum('quantity');

                $sold = $product->stockMovements()
                    ->where('type', 'sold')
                    ->sum('quantity');

                $cashSales = $product->saleItems()
                    ->whereHas('sale', fn($q) => $q->where('payment_type', 'cash'))
                    ->sum('quantity');

                $creditSales = $product->saleItems()
                    ->whereHas('sale', fn($q) => $q->where('payment_type', 'credit'))
                    ->sum('quantity');

                $partialSales = $product->saleItems()
                    ->whereHas('sale', fn($q) => $q->where('payment_type', 'partial'))
                    ->sum('quantity');

                $available = $incoming - ($sold + $cashSales + $creditSales + $partialSales);

                return $available < 5;
            })->count();

        // Credit sales on selected date
        $creditSalesToday = SaleItem::whereHas('sale', function ($query) use ($today) {
            $query->whereDate('created_at', $today)->where('payment_type', 'credit');
        })->sum(DB::raw('(unit_selling_price * quantity)'));

        $creditSalesLastMonth = SaleItem::whereHas('sale', function ($query) use ($lastMonth) {
            $query->whereDate('created_at', $lastMonth)->where('payment_type', 'credit');
        })->sum(DB::raw('(unit_selling_price * quantity)'));

        $creditChange = $creditSalesLastMonth != 0
            ? (($creditSalesToday - $creditSalesLastMonth) / abs($creditSalesLastMonth)) * 100
            : 0;

        // Monthly profit for selected date's month
        $thisMonthSales = SaleItem::whereHas('sale', function ($query) use ($today) {
            $query->whereMonth('created_at', \Carbon\Carbon::parse($today)->month)
                ->whereYear('created_at', \Carbon\Carbon::parse($today)->year);
        })->select(
            DB::raw('SUM(unit_selling_price * quantity) as total_sales'),
            DB::raw('SUM(unit_cost_price * quantity) as total_costs')
        )->first();

        $monthlyProfit = ($thisMonthSales->total_sales ?? 0) - ($thisMonthSales->total_costs ?? 0);

        // Monthly profit last month relative to selected date
        $lastMonthSales = SaleItem::whereHas('sale', function ($query) use ($today) {
            $query->whereMonth('created_at', \Carbon\Carbon::parse($today)->subMonth()->month)
                ->whereYear('created_at', \Carbon\Carbon::parse($today)->subMonth()->year);
        })->select(
            DB::raw('SUM(unit_selling_price * quantity) as total_sales'),
            DB::raw('SUM(unit_cost_price * quantity) as total_costs')
        )->first();

        $lastMonthProfit = ($lastMonthSales->total_sales ?? 0) - ($lastMonthSales->total_costs ?? 0);

        $profitChange = $lastMonthProfit != 0
            ? (($monthlyProfit - $lastMonthProfit) / abs($lastMonthProfit)) * 100
            : 0;

        // Active customers in last 30 days from selected date
        $activeCustomers = Customer::whereHas('sales', function ($query) use ($today) {
            $query->where('created_at', '>=', \Carbon\Carbon::parse($today)->subDays(30));
        })->count();

        $lastMonthActiveCustomers = Customer::whereHas('sales', function ($query) use ($today) {
            $query->where('created_at', '>=', \Carbon\Carbon::parse($today)->subDays(60))
                ->where('created_at', '<', \Carbon\Carbon::parse($today)->subDays(30));
        })->count();

        $customersChange = $lastMonthActiveCustomers != 0
            ? (($activeCustomers - $lastMonthActiveCustomers) / abs($lastMonthActiveCustomers)) * 100
            : 0;

        // Recent sales (last 5)
        $recentSales = Sale::with('customer')
            ->orderByDesc('created_at')
            ->limit(5)
            ->get()
            ->map(function ($sale) {
                return [
                    'id' => $sale->transaction_id,
                    'customer' => $sale->customer ? $sale->customer->name : $sale->customer_name,
                    'amount' => $sale->total,
                    'type' => ucfirst($sale->payment_type),
                    'time' => $sale->created_at->format('h:i A'),
                ];
            });

        return Inertia::render('dashboard', [
            'todaySales' => $todaySales,
            'salesChange' => $salesChange,
            'productsSoldToday' => $productsSoldToday,
            'productsChange' => $productsChange,
            'lowStockItems' => $lowStockItems,
            'creditSalesToday' => $creditSalesToday,
            'creditChange' => $creditChange,
            'monthlyProfit' => $monthlyProfit,
            'profitChange' => $profitChange,
            'activeCustomers' => $activeCustomers,
            'customersChange' => $customersChange,
            'recentSales' => $recentSales,
            'selectedDate' => $today, // Send back to frontend for the date picker
        ]);
    }
}
