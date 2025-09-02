<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SupplierCreditTransaction extends Model
{
    use HasFactory;

    protected $table = 'supplier_credit_transactions';

    protected $fillable = [
        'supplier_id',
        'transaction_date',
        'description',
        'amount_owed',
        'notes',
    ];

    protected $casts = [
        'transaction_date' => 'date',
        'amount_owed' => 'decimal:2',
    ];

    // Relationships
    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(SupplierCreditTransactionItem::class, 'supplier_credit_transaction_id');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(SupplierPayment::class, 'transaction_id');
    }

    // Computed Attributes (Not stored in database)
    // Note: Payments are now handled at supplier level, not transaction level
    public function getAmountPaidAttribute(): float
    {
        // This will be calculated at supplier level
        return 0;
    }

    public function getRemainingBalanceAttribute(): float
    {
        // This will be calculated at supplier level
        return $this->amount_owed;
    }

    public function getStatusAttribute(): string
    {
        // Status is now determined at supplier level based on total outstanding
        return 'pending';
    }
}
