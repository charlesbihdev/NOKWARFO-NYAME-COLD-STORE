<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupplierCreditTransactionItem extends Model
{
    use HasFactory;

    protected $table = 'supplier_credit_transaction_items';

    protected $fillable = [
        'supplier_credit_transaction_id',
        'product_name',
        'quantity',
        'unit_price',
        'total_amount',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'unit_price' => 'decimal:2',
        'total_amount' => 'decimal:2',
    ];

    // Relationships
    public function creditTransaction(): BelongsTo
    {
        return $this->belongsTo(SupplierCreditTransaction::class, 'supplier_credit_transaction_id');
    }

    // Helper methods
    public function getFormattedUnitPriceAttribute(): string
    {
        return 'GHC '.number_format($this->unit_price, 2);
    }

    public function getFormattedTotalAmountAttribute(): string
    {
        return 'GHC '.number_format($this->total_amount, 2);
    }

    // Auto-calculate total amount when unit price or quantity changes
    protected static function boot()
    {
        parent::boot();

        static::saving(function ($item) {
            $item->total_amount = $item->quantity * $item->unit_price;
        });
    }
}
