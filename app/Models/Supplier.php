<?php

namespace App\Models;

use App\Models\Product;
use App\Models\StockMovement;
use App\Models\SupplierCreditTransaction;
use App\Models\SupplierPayment;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Factories\HasFactory;

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

    // Computed Properties (Calculated from related tables)
    public function getTotalOutstandingAttribute(): float
    {
        return $this->creditTransactions()
            ->withOutstandingBalance()
            ->get()
            ->sum('remaining_balance');
    }

    public function getTotalCreditTransactionsAttribute(): int
    {
        return $this->creditTransactions()->count();
    }

    public function getPendingTransactionsAttribute(): int
    {
        return $this->creditTransactions()
            ->withOutstandingBalance()
            ->count();
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
        return 'GHC ' . number_format($this->total_outstanding, 2);
    }
}
