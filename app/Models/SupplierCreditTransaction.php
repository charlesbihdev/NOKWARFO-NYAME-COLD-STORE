<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class SupplierCreditTransaction extends Model
{
    use HasFactory;

    protected $table = 'supplier_credit_transactions';

    protected $fillable = [
        'supplier_id',
        'transaction_date',
        'description',
        'amount_owed',
        'is_fully_paid',
        'notes',
    ];

    protected $casts = [
        'transaction_date' => 'date',
        'amount_owed' => 'decimal:2',
        'is_fully_paid' => 'boolean',
    ];

    // Relationships
    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(SupplierPayment::class, 'supplier_credit_transaction_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(SupplierCreditTransactionItem::class, 'supplier_credit_transaction_id');
    }

    // Computed Attributes (Not stored in database)
    public function getAmountPaidAttribute(): float
    {
        return $this->payments()->sum('payment_amount');
    }

    public function getRemainingBalanceAttribute(): float
    {
        return $this->amount_owed - $this->amount_paid;
    }

    public function getStatusAttribute(): string
    {
        $remaining = $this->remaining_balance;
        
        if ($remaining <= 0) {
            return 'paid';
        } elseif ($remaining < $this->amount_owed) {
            return 'partial';
        } else {
            return 'pending';
        }
    }

    public function getIsFullyPaidAttribute(): bool
    {
        return $this->remaining_balance <= 0;
    }

    public function getIsPartiallyPaidAttribute(): bool
    {
        return $this->status === 'partial';
    }

    public function getIsPendingAttribute(): bool
    {
        return $this->status === 'pending';
    }

    // Scopes
    public function scopePending($query)
    {
        return $query->whereHas('payments', function ($q) {
            $q->havingRaw('SUM(payment_amount) < supplier_credit_transactions.amount_owed');
        })->orWhereDoesntHave('payments');
    }

    public function scopePartial($query)
    {
        return $query->whereHas('payments', function ($q) {
            $q->havingRaw('SUM(payment_amount) > 0 AND SUM(payment_amount) < supplier_credit_transactions.amount_owed');
        });
    }

    public function scopePaid($query)
    {
        return $query->whereHas('payments', function ($q) {
            $q->havingRaw('SUM(payment_amount) >= supplier_credit_transactions.amount_owed');
        });
    }

    public function scopeWithOutstandingBalance($query)
    {
        return $query->whereHas('payments', function ($q) {
            $q->havingRaw('SUM(payment_amount) < supplier_credit_transactions.amount_owed');
        })->orWhereDoesntHave('payments');
    }
}
