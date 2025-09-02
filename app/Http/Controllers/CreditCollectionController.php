<?php

namespace App\Http\Controllers;

use App\Models\CreditCollection;
use App\Models\Customer;

use App\Models\Sale;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CreditCollectionController extends Controller
{
    public function index()
    {
        // Get today's credit collections with customer details
        $credit_collections = CreditCollection::with('customer')
            ->whereDate('created_at', today())
            ->get()
            ->map(function ($collection) {
                return [
                    'id' => $collection->id,
                    'customer' => $collection->customer->name,
                    'amount_collected' => $collection->amount_collected,
                ];
            });

        // Get all customers who still owe (credit or partial sales)
        $outstanding_debts = Customer::whereHas('sales', function ($query) {
            $query->whereIn('payment_type', ['credit', 'partial']);
        })->get()->map(function ($customer) {
            // Get all sales
            $sales = $customer->sales;

            // Total debt = full credit + unpaid part of partials
            $total_debt = $sales->sum(function ($sale) {
                if ($sale->payment_type === 'credit') {
                    return $sale->total;
                } elseif ($sale->payment_type === 'partial') {
                    return $sale->total - $sale->amount_paid;
                }
                return 0;
            });

            // Total paid
            $amount_paid = CreditCollection::where('customer_id', $customer->id)
                ->sum('amount_collected');

            $balance = $total_debt - $amount_paid;

            // Get last payment date
            $last_payment = CreditCollection::where('customer_id', $customer->id)
                ->latest()
                ->first();

            // Fallback to last credit/partial sale if no payment
            if ($last_payment) {
                $last_payment_date = $last_payment->created_at;
            } else {
                $last_credit_sale = $customer->sales()
                    ->whereIn('payment_type', ['credit', 'partial'])
                    ->latest()
                    ->first();

                $last_payment_date = $last_credit_sale ? $last_credit_sale->created_at : null;
            }

            if ($balance > 0) {
                return [
                    'customer_id' => $customer->id,
                    'customer' => $customer->name,
                    'total_debt' => $total_debt,
                    'amount_paid' => $amount_paid,
                    'balance' => $balance,
                    'last_payment' => $last_payment_date ? $last_payment_date->format('Y-m-d') : null,
                    'days_overdue' => $last_payment
                        ? $last_payment->created_at->startOfDay()->diffInDays(now()->startOfDay())
                        : optional($customer->sales()
                            ->where(function ($q) {
                                $q->where('payment_type', 'credit')
                                    ->orWhere('payment_type', 'partial');
                            })
                            ->latest()
                            ->first())
                        ?->created_at
                        ?->startOfDay()
                        ->diffInDays(now()->startOfDay()),

                ];
            }

            return null;
        })->filter()->values();



        // Customers list for dropdown
        $customers = Customer::orderBy('name')->get(['id', 'name']);

        return Inertia::render('credit-collection', [
            'credit_collections' => $credit_collections,
            'outstanding_debts' => $outstanding_debts,
            'customers' => $customers,
        ]);
    }


    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'amount_collected' => 'required|numeric|min:0',
            'notes' => 'nullable|string|max:1000',
        ]);

        // Calculate current debt for this customer
        $customer = Customer::findOrFail($validated['customer_id']);
        $total_debt = $customer->sales()
            ->where(function ($query) {
                $query->where('payment_type', 'credit')
                    ->orWhere('payment_type', 'partial');
            })->sum('total');

        $amount_already_paid = CreditCollection::where('customer_id', $customer->id)
            ->sum('amount_collected');

        $remaining_debt = $total_debt - $amount_already_paid;

        // Validate amount being collected
        if ($validated['amount_collected'] > $remaining_debt) {
            return back()->withErrors([
                'amount_collected' => 'Amount collected cannot be more than the remaining debt.'
            ])->withInput();
        }

        // Calculate debt left after this collection
        $debt_left = $remaining_debt - $validated['amount_collected'];

        // Create the credit collection record
        $creditCollection = CreditCollection::create([
            'customer_id' => $validated['customer_id'],
            'amount_collected' => $validated['amount_collected'],
            'debt_left' => $debt_left,
            'notes' => $validated['notes'],
        ]);

        return redirect()->route('credit-collection.index')
            ->with('success', 'Credit collection recorded successfully.');
    }

    public function destroy(CreditCollection $creditCollection)
    {
        $creditCollection->delete();
        return redirect()->route('credit-collection.index')
            ->with('success', 'Credit collection deleted successfully.');
    }
}
