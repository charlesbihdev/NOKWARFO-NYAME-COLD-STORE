<?php

namespace App\Services;

use App\Models\Supplier;
use App\Models\SupplierCreditTransaction;
use App\Models\SupplierPayment;
use Exception;
use Illuminate\Support\Facades\DB;

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
     * Make a payment to reduce supplier debt (can be tied to specific transactions)
     */
    public function makePayment(array $data): SupplierPayment
    {
        return DB::transaction(function () use ($data) {
            // Validate payment amount doesn't exceed total outstanding debt
            $supplier = Supplier::findOrFail($data['supplier_id']);
            $totalOutstanding = $supplier->total_outstanding;

            if ($data['payment_amount'] > $totalOutstanding) {
                throw new Exception("Payment amount (GHC {$data['payment_amount']}) cannot exceed total outstanding debt (GHC {$totalOutstanding})");
            }

            $payment = SupplierPayment::create([
                'supplier_id' => $data['supplier_id'],
                'transaction_id' => $data['transaction_id'] ?? null,
                'payment_date' => $data['payment_date'],
                'payment_amount' => $data['payment_amount'],
                'payment_method' => $data['payment_method'] ?? null,
                'notes' => $data['notes'] ?? null,
            ]);

            return $payment->load(['supplier']);
        });
    }

    /**
     * Get transaction summary with calculated fields
     */
    public function getTransactionSummary(SupplierCreditTransaction $transaction, ?string $startDate = null, ?string $endDate = null): array
    {
        // Calculate debt progression for this transaction
        $previousDebt = $this->calculatePreviousDebt($transaction, $startDate, $endDate);
        $currentDebt = $transaction->amount_owed;
        $totalDebt = $previousDebt + $currentDebt;

        // Calculate payments made on the transaction date
        $todaysPayments = $this->calculateTodaysPayments($transaction);

        // Calculate outstanding balance (total debt minus all payments up to this date)
        $outstandingBalance = $this->calculateOutstandingBalance($transaction, $startDate, $endDate);

        return [
            'id' => $transaction->id,
            'supplier_name' => $transaction->supplier->name,
            'transaction_date' => $transaction->transaction_date->format('d M Y'),
            'created_at' => $transaction->created_at,
            'description' => $transaction->description,
            'amount_owed' => $transaction->amount_owed,
            'notes' => $transaction->notes,
            'items' => $transaction->items->map(function ($item) {
                return [
                    'id' => $item->id,
                    'product_name' => $item->product_name,
                    'quantity' => $item->quantity,
                    'unit_price' => $item->unit_price,
                    'total_amount' => $item->total_amount,
                ];
            }),
            // Financial calculations
            'previous_debt' => $previousDebt,
            'current_debt' => $currentDebt,
            'total_debt' => $totalDebt,
            'todays_payments' => $todaysPayments,
            'outstanding_balance' => $outstandingBalance,
            // Note: Payments are now handled at supplier level, not transaction level
            'can_make_payment' => true, // Always true since payments reduce overall debt
        ];
    }

    /**
     * Calculate debt before this specific transaction
     */
    private function calculatePreviousDebt(SupplierCreditTransaction $transaction, ?string $startDate = null, ?string $endDate = null): float
    {
        // Get total debt from transactions created before this one
        $debtQuery = $transaction->supplier->creditTransactions()
            ->where('created_at', '<', $transaction->created_at);

        // Apply date filter if provided
        if ($startDate && $endDate) {
            $debtQuery->whereBetween('transaction_date', [$startDate, $endDate]);
        }

        $totalPreviousDebt = $debtQuery->sum('amount_owed');

        // Get total payments made before this transaction
        $paymentsQuery = $transaction->supplier->payments()
            ->where('created_at', '<', $transaction->created_at);

        // Apply date filter if provided
        if ($startDate && $endDate) {
            $paymentsQuery->whereBetween('payment_date', [$startDate, $endDate]);
        }

        $totalPreviousPayments = $paymentsQuery->sum('payment_amount');

        // Previous debt = Total debt from transactions - Total payments made
        return max(0, $totalPreviousDebt - $totalPreviousPayments);
    }

    /**
     * Calculate payments specifically linked to this transaction
     */
    private function calculateTodaysPayments(SupplierCreditTransaction $transaction): float
    {
        // Only return payments that are specifically linked to this transaction
        // via the transaction_id field, not just payments on the same date
        return $transaction->supplier->payments()
            ->where('transaction_id', $transaction->id)
            ->sum('payment_amount');
    }

    /**
     * Calculate outstanding balance up to this transaction date
     */
    private function calculateOutstandingBalance(SupplierCreditTransaction $transaction, ?string $startDate = null, ?string $endDate = null): float
    {
        // Get total debt up to this transaction timestamp
        $debtQuery = $transaction->supplier->creditTransactions()
            ->where('created_at', '<=', $transaction->created_at);

        // Get total payments up to this transaction timestamp
        $paymentsQuery = $transaction->supplier->payments()
            ->where('created_at', '<=', $transaction->created_at);

        // Apply date filter if provided
        if ($startDate && $endDate) {
            $debtQuery->whereBetween('transaction_date', [$startDate, $endDate]);
            $paymentsQuery->whereBetween('payment_date', [$startDate, $endDate]);
        }

        $totalDebtUpToDate = $debtQuery->sum('amount_owed');
        $totalPaymentsUpToDate = $paymentsQuery->sum('payment_amount');

        return max(0, $totalDebtUpToDate - $totalPaymentsUpToDate);
    }

    /**
     * Get supplier summary with calculated totals
     */
    public function getSupplierSummary(Supplier $supplier, ?string $startDate = null, ?string $endDate = null): array
    {
        $transactionsQuery = $supplier->creditTransactions();
        $paymentsQuery = $supplier->payments();

        // Apply date filters if provided
        if ($startDate && $endDate) {
            $transactionsQuery->whereBetween('transaction_date', [$startDate, $endDate]);
            $paymentsQuery->whereBetween('payment_date', [$startDate, $endDate]);
        }

        $transactions = $transactionsQuery->orderByDesc('transaction_date')->get();
        $totalOwed = $transactionsQuery->sum('amount_owed');
        $totalPayments = $paymentsQuery->sum('payment_amount');
        $totalOutstanding = max(0, $totalOwed - $totalPayments);

        return [
            'id' => $supplier->id,
            'name' => $supplier->name,
            'contact_person' => $supplier->contact_person,
            'phone' => $supplier->phone,
            'email' => $supplier->email,
            'address' => $supplier->address,
            'is_active' => $supplier->is_active,
            'total_owed' => $totalOwed,
            'total_paid' => $totalPayments,
            'total_outstanding' => $totalOutstanding,
            'transactions_count' => $transactions->count(),
            'pending_transactions' => $transactions->count(), // All transactions are pending since payments reduce overall debt
            'has_outstanding_debt' => $totalOutstanding > 0,
            'last_transaction_date' => $transactions->first()?->transaction_date?->format('d M Y'),
        ];
    }

    /**
     * Update credit transaction details
     */
    public function updateCreditTransaction(SupplierCreditTransaction $transaction, array $data): SupplierCreditTransaction
    {
        // Payments are now handled at supplier level, not transaction level

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

        // Allow amount changes freely since payments are at supplier level
        if (isset($data['amount_owed'])) {
            $updateData['amount_owed'] = $data['amount_owed'];
        }

        $transaction->update($updateData);

        // Update transaction items
        if (isset($data['items']) && is_array($data['items'])) {
            // Calculate new total from items
            $newTotal = collect($data['items'])->sum(function ($item) {
                return $item['quantity'] * $item['unit_price'];
            });

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

            // Update amount_owed with the new total
            $transaction->update([
                'amount_owed' => $newTotal,
            ]);
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
     * This method is no longer needed since payments are now at supplier level
     * and is_fully_paid field has been removed
     */
    public function recalculateAllTransactionStatuses(): int
    {
        // Payments are now handled at supplier level, not transaction level
        return 0;
    }

    /**
     * Get payment summary with calculated debt progression
     */
    public function getPaymentSummary(SupplierPayment $payment, ?string $startDate = null, ?string $endDate = null): array
    {
        // Calculate debt before this payment
        $previousDebt = $this->calculateDebtBeforePayment($payment, $startDate, $endDate);

        // Calculate outstanding balance after this payment
        $outstandingBalance = max(0, $previousDebt - $payment->payment_amount);

        return [
            'id' => $payment->id,
            'supplier_id' => $payment->supplier_id,
            'payment_date' => $payment->payment_date->format('Y-m-d'),
            'created_at' => $payment->created_at,
            'payment_amount' => $payment->payment_amount,
            'payment_method' => $payment->payment_method,
            'notes' => $payment->notes,
            // Financial flow calculations
            'previous_debt' => $previousDebt,
            'outstanding_balance' => $outstandingBalance,
        ];
    }

    /**
     * Calculate debt before a specific payment
     */
    private function calculateDebtBeforePayment(SupplierPayment $payment, ?string $startDate = null, ?string $endDate = null): float
    {
        // Get total debt up to this payment date
        $debtQuery = $payment->supplier->creditTransactions()
            ->where('transaction_date', '<=', $payment->payment_date);

        // Apply date filter if provided
        if ($startDate && $endDate) {
            $debtQuery->whereBetween('transaction_date', [$startDate, $endDate]);
        }

        $totalDebt = $debtQuery->sum('amount_owed');

        // Get payments made BEFORE this payment using created_at timestamp for proper chronological order
        $previousPaymentsQuery = $payment->supplier->payments()
            ->where('created_at', '<', $payment->created_at);

        if ($startDate && $endDate) {
            $previousPaymentsQuery->whereBetween('payment_date', [$startDate, $endDate]);
        }

        $previousPayments = $previousPaymentsQuery->sum('payment_amount');

        // Debt before this payment = Total debt - Previous payments
        return max(0, $totalDebt - $previousPayments);
    }
}
