<?php

namespace App\Http\Controllers;

use App\Models\CreditCollection;
use App\Models\Customer;
use App\Models\Sale;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CreditCollectionController extends Controller
{
    public function index(Request $request)
    {
        // Get date from request, default to today
        $date = $request->input('date', today()->toDateString());

        // Get credit collections for the selected date with customer details
        $credit_collections = CreditCollection::with('customer')
            ->whereDate('created_at', $date)
            ->get()
            ->map(function ($collection) {
                return [
                    'id' => $collection->id,
                    'customer' => $collection->customer->name,
                    'amount_collected' => $collection->amount_collected,
                    'payment_date' => $collection->created_at->format('d M, Y'),
                ];
            });

        // Get all customers who still owe (credit or partial sales) AS OF the selected date
        $outstanding_debts = Customer::whereHas('sales', function ($query) use ($date) {
            $query->whereIn('payment_type', ['credit', 'partial'])
                ->whereDate('created_at', '<=', $date);
        })->get()->map(function ($customer) use ($date) {
            // Get all sales up to and including the selected date
            $sales = $customer->sales()
                ->whereIn('payment_type', ['credit', 'partial'])
                ->whereDate('created_at', '<=', $date)
                ->get();

            // Total debt = full credit + unpaid part of partials (as of selected date)
            $total_debt = $sales->sum(function ($sale) {
                if ($sale->payment_type === 'credit') {
                    return $sale->total;
                } elseif ($sale->payment_type === 'partial') {
                    return $sale->total - $sale->amount_paid;
                }

                return 0;
            });

            // Total paid up to and including the selected date
            $amount_paid = CreditCollection::where('customer_id', $customer->id)
                ->whereDate('created_at', '<=', $date)
                ->sum('amount_collected');

            $balance = $total_debt - $amount_paid;

            // Get last payment date (up to selected date)
            $last_payment = CreditCollection::where('customer_id', $customer->id)
                ->whereDate('created_at', '<=', $date)
                ->latest()
                ->first();

            // Fallback to last credit/partial sale if no payment (up to selected date)
            if ($last_payment) {
                $last_payment_date = $last_payment->created_at;
            } else {
                $last_credit_sale = $customer->sales()
                    ->whereIn('payment_type', ['credit', 'partial'])
                    ->whereDate('created_at', '<=', $date)
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
                        ? $last_payment->created_at->startOfDay()->diffInDays(now()->parse($date)->startOfDay())
                        : optional($customer->sales()
                            ->where(function ($q) {
                                $q->where('payment_type', 'credit')
                                    ->orWhere('payment_type', 'partial');
                            })
                            ->whereDate('created_at', '<=', $date)
                            ->latest()
                            ->first())
                        ?->created_at
                        ?->startOfDay()
                        ->diffInDays(now()->parse($date)->startOfDay()),

                ];
            }

            return null;
        })->filter()->values();

        // Customers list for dropdown (only active customers)
        $customers = Customer::where('is_active', true)->orderBy('name')->get(['id', 'name']);

        return Inertia::render('credit-collection', [
            'credit_collections' => $credit_collections,
            'outstanding_debts' => $outstanding_debts,
            'customers' => $customers,
            'date' => $date,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'amount_collected' => 'required|numeric|min:0',
            'payment_date' => 'required|date',
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
                'amount_collected' => 'Amount collected cannot be more than the remaining debt.',
            ])->withInput();
        }

        // Calculate debt left after this collection
        $debt_left = $remaining_debt - $validated['amount_collected'];

        // Create the credit collection record with custom created_at
        $creditCollection = CreditCollection::create([
            'customer_id' => $validated['customer_id'],
            'amount_collected' => $validated['amount_collected'],
            'debt_left' => $debt_left,
            'notes' => $validated['notes'],
        ]);

        // Update the created_at to reflect the payment date
        $creditCollection->created_at = $validated['payment_date'];
        $creditCollection->save();

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
