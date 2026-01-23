<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Supplier extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'contact_person',
        'phone',
        'email',
        'address',
        'additional_info',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    // Relationships
    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function creditTransactions(): HasMany
    {
        return $this->hasMany(SupplierCreditTransaction::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(SupplierPayment::class);
    }

    public function debts(): HasMany
    {
        return $this->hasMany(SupplierDebt::class);
    }

    // Computed Properties (Calculated from related tables)
    public function getTotalOwedAttribute(): float
    {
        // Get historical debts
        $historicalDebt = $this->debts()->sum('amount');

        // Get credit transaction debts
        $transactionDebt = $this->creditTransactions()->sum('amount_owed');

        return $historicalDebt + $transactionDebt;
    }

    public function getTotalOutstandingAttribute(): float
    {
        // Get historical debts
        $historicalDebt = $this->debts()->sum('amount');

        // Get credit transaction debts
        $transactionDebt = $this->creditTransactions()->sum('amount_owed');

        // Total amount owed to supplier
        $totalOwed = $historicalDebt + $transactionDebt;

        // Total payments made to supplier
        $totalPayments = $this->payments()->sum('payment_amount');

        return max(0, $totalOwed - $totalPayments);
    }

    public function getTotalCreditTransactionsAttribute(): int
    {
        return $this->creditTransactions()->count();
    }

    public function getTotalPaymentsMadeAttribute(): float
    {
        return $this->payments()->sum('payment_amount');
    }

    public function getPendingTransactionsAttribute(): int
    {
        // All transactions are considered pending since payments reduce overall debt
        return $this->creditTransactions()->count();
    }

    public function getLastTransactionDateAttribute(): ?string
    {
        $lastTransaction = $this->creditTransactions()
            ->orderByDesc('transaction_date')
            ->first();

        return $lastTransaction ? $lastTransaction->transaction_date : null;
    }

    public function getHasOutstandingDebtAttribute(): bool
    {
        return $this->total_outstanding > 0;
    }

    // Helper methods
    public function getFormattedTotalOutstandingAttribute(): string
    {
        return 'GHC '.number_format($this->total_outstanding, 2);
    }
}
