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
        'product_id',
        'product_name',
        'cartons',
        'lines',
        'lines_per_carton',
        'unit_price',
        'total_amount',
    ];

    protected $casts = [
        'cartons' => 'integer',
        'lines' => 'integer',
        'lines_per_carton' => 'integer',
        'unit_price' => 'decimal:2',
        'total_amount' => 'decimal:2',
    ];

    // Relationships
    public function creditTransaction(): BelongsTo
    {
        return $this->belongsTo(SupplierCreditTransaction::class, 'supplier_credit_transaction_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(\App\Models\Product::class);
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

    // Calculate total quantity from cartons and lines
    public function getTotalQuantityAttribute(): int
    {
        return ($this->cartons * $this->lines_per_carton) + $this->lines;
    }

    // Get formatted quantity display (e.g., "5C2L", "10C", "15L")
    public function getQuantityDisplayAttribute(): string
    {
        // If lines_per_carton is 1, just show the number
        if ($this->lines_per_carton <= 1) {
            return (string) $this->total_quantity;
        }

        $result = '';
        if ($this->cartons > 0 && $this->lines > 0) {
            $result = "{$this->cartons}C{$this->lines}L";
        } elseif ($this->cartons > 0) {
            $result = "{$this->cartons}C";
        } elseif ($this->lines > 0) {
            $result = "{$this->lines}L";
        } else {
            $result = '0';
        }

        return $result;
    }

    // Auto-calculate total amount when unit price or quantity changes
    protected static function boot()
    {
        parent::boot();

        static::saving(function ($item) {
            // Calculate total quantity (cartons * lines_per_carton + lines)
            $totalQuantity = ($item->cartons * $item->lines_per_carton) + $item->lines;
            $item->total_amount = $totalQuantity * $item->unit_price;
        });
    }
}
