<?php

namespace App\Services;

use App\Models\Supplier;
use App\Models\SupplierCreditTransaction;
use App\Models\SupplierPayment;
use Illuminate\Support\Facades\DB;
use Exception;

class SupplierCreditService
{
    /**
     * Create a new credit transaction for goods taken from supplier
     */
    public function createCreditTransaction(array $data): SupplierCreditTransaction
    {
        return DB::transaction(function () use ($data) {
            // Calculate if transaction is fully paid initially
            $initialPaymentAmount = $data['payment_amount'] ?? 0;
            $isFullyPaid = $initialPaymentAmount >= $data['amount_owed'];

            $transaction = SupplierCreditTransaction::create([
                'supplier_id' => $data['supplier_id'],
                'transaction_date' => $data['transaction_date'],
                'description' => $data['description'],
                'amount_owed' => $data['amount_owed'],
                'is_fully_paid' => $isFullyPaid,
                'notes' => $data['notes'] ?? null,
            ]);

            // Create transaction items if provided
            if (isset($data['items']) && is_array($data['items'])) {
                foreach ($data['items'] as $item) {
                    $transaction->items()->create([
                        'product_name' => $item['product_name'],
                        'quantity' => $item['quantity'],
                        'unit_price' => $item['unit_price'],
                        'total_amount' => $item['quantity'] * $item['unit_price'],
                    ]);
                }
            }

            return $transaction->load(['supplier', 'items']);
        });
    }

    /**
     * Make a payment against a specific credit transaction
     */
    public function makePayment(array $data): SupplierPayment
    {
        return DB::transaction(function () use ($data) {
            $transaction = SupplierCreditTransaction::findOrFail($data['supplier_credit_transaction_id']);
            
            // Validate payment amount doesn't exceed remaining balance
            $remainingBalance = $transaction->remaining_balance;
            if ($data['payment_amount'] > $remainingBalance) {
                throw new Exception("Payment amount (GHC {$data['payment_amount']}) cannot exceed remaining balance (GHC {$remainingBalance})");
            }

            $payment = SupplierPayment::create([
                'supplier_credit_transaction_id' => $data['supplier_credit_transaction_id'],
                'supplier_id' => $transaction->supplier_id,
                'payment_date' => $data['payment_date'],
                'payment_amount' => $data['payment_amount'],
                'payment_method' => $data['payment_method'] ?? null,
                'notes' => $data['notes'] ?? null,
            ]);

            // Update the is_fully_paid column based on remaining balance after payment
            $newRemainingBalance = $remainingBalance - $data['payment_amount'];
            $transaction->update([
                'is_fully_paid' => $newRemainingBalance <= 0
            ]);

            return $payment->load(['creditTransaction', 'supplier']);
        });
    }

    /**
     * Get transaction summary with calculated fields
     */
    public function getTransactionSummary(SupplierCreditTransaction $transaction): array
    {
        $amountPaid = $transaction->amount_paid;
        $remainingBalance = $transaction->remaining_balance;
        $status = $transaction->status;

        return [
            'id' => $transaction->id,
            'supplier_name' => $transaction->supplier->name,
            'transaction_date' => $transaction->transaction_date->format('d M Y'),
            'description' => $transaction->description,
            'amount_owed' => $transaction->amount_owed,
            'amount_paid' => $amountPaid,
            'remaining_balance' => $remainingBalance,
            'status' => $status,
            'notes' => $transaction->notes,
            'payments' => $transaction->payments->map(function ($payment) {
                return [
                    'id' => $payment->id,
                    'payment_date' => $payment->payment_date->format('d M Y'),
                    'payment_amount' => $payment->payment_amount,
                    'payment_method' => $payment->payment_method,
                    'notes' => $payment->notes,
                ];
            }),
            'items' => $transaction->items->map(function ($item) {
                return [
                    'id' => $item->id,
                    'product_name' => $item->product_name,
                    'quantity' => $item->quantity,
                    'unit_price' => $item->unit_price,
                    'total_amount' => $item->total_amount,
                ];
            }),
            'can_make_payment' => $remainingBalance > 0,
        ];
    }

    /**
     * Get supplier summary with calculated totals
     */
    public function getSupplierSummary(Supplier $supplier): array
    {
        $transactions = $supplier->creditTransactions()
            ->with(['payments'])
            ->orderByDesc('transaction_date')
            ->get();

        $totalOwed = $transactions->sum('amount_owed');
        $totalPaid = $transactions->sum('amount_paid');
        $totalOutstanding = $transactions->sum('remaining_balance');

        return [
            'id' => $supplier->id,
            'name' => $supplier->name,
            'contact_person' => $supplier->contact_person,
            'phone' => $supplier->phone,
            'email' => $supplier->email,
            'address' => $supplier->address,
            'is_active' => $supplier->is_active,
            'total_owed' => $totalOwed,
            'total_paid' => $totalPaid,
            'total_outstanding' => $totalOutstanding,
            'transactions_count' => $transactions->count(),
            'pending_transactions' => $transactions->where('status', '!=', 'paid')->count(),
            'has_outstanding_debt' => $totalOutstanding > 0,
            'last_transaction_date' => $transactions->first()?->transaction_date?->format('d M Y'),
        ];
    }

    /**
     * Update credit transaction details
     */
    public function updateCreditTransaction(SupplierCreditTransaction $transaction, array $data): SupplierCreditTransaction
    {
        $hasPayments = $transaction->payments()->exists();
        
        // Allow flexible updates:
        // - Date and notes can always be updated
        // - Amount and items can only be updated if no payments exist
        $updateData = [];
        
        // Always allow date and notes updates
        if (isset($data['transaction_date'])) {
            $updateData['transaction_date'] = $data['transaction_date'];
        }
        if (isset($data['notes'])) {
            $updateData['notes'] = $data['notes'];
        }
        if (isset($data['description'])) {
            $updateData['description'] = $data['description'];
        }
        
        // Only allow financial changes if no payments exist
        if (!$hasPayments) {
            if (isset($data['amount_owed'])) {
                $updateData['amount_owed'] = $data['amount_owed'];
            }
        } else if (isset($data['amount_owed']) && $data['amount_owed'] != $transaction->amount_owed) {
            throw new Exception('Cannot change amount when payments have been made. You can edit date and notes only.');
        }

        $transaction->update($updateData);

        // Update transaction items only if no payments exist
        if (isset($data['items']) && is_array($data['items'])) {
            if ($hasPayments) {
                throw new Exception('Cannot change items when payments have been made. You can edit date and notes only.');
            }
            
            // Delete existing items
            $transaction->items()->delete();
            
            // Create new items
            foreach ($data['items'] as $item) {
                $transaction->items()->create([
                    'product_name' => $item['product_name'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'total_amount' => $item['quantity'] * $item['unit_price'],
                ]);
            }
        }

        return $transaction->fresh(['items']);
    }

    /**
     * Delete credit transaction (only if no payments made)
     */
    public function deleteCreditTransaction(SupplierCreditTransaction $transaction): bool
    {
        // if ($transaction->payments()->exists()) {
        //     throw new Exception('Cannot delete transaction that has payments');
        // }

        return $transaction->delete();
    }

    /**
     * Recalculate and update is_fully_paid status for all transactions
     * Useful for data consistency after migrations or data fixes
     */
    public function recalculateAllTransactionStatuses(): int
    {
        $updatedCount = 0;
        
        $transactions = SupplierCreditTransaction::with('payments')->get();
        
        foreach ($transactions as $transaction) {
            $amountPaid = $transaction->payments->sum('payment_amount');
            $isFullyPaid = $amountPaid >= $transaction->amount_owed;
            
            if ($transaction->is_fully_paid !== $isFullyPaid) {
                $transaction->update(['is_fully_paid' => $isFullyPaid]);
                $updatedCount++;
            }
        }
        
        return $updatedCount;
    }
}
