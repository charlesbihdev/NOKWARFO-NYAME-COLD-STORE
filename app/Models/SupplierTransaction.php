<?php

namespace App\Models;

use App\Models\Supplier;
use App\Models\SupplierTransactionItem;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class SupplierTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'supplier_id',
        'transaction_date',
        'reference_number',
        'previous_balance',
        'total_amount',
        'payment_amount',
        'current_balance',
        'notes',
        'type',
    ];

    protected $casts = [
        'transaction_date' => 'date',
        'previous_balance' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'payment_amount' => 'decimal:2',
        'current_balance' => 'decimal:2',
    ];

    // Relationships
    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function items()
    {
        return $this->hasMany(SupplierTransactionItem::class);
    }

    // Scopes
    public function scopePurchases($query)
    {
        return $query->where('type', 'purchase');
    }

    public function scopePayments($query)
    {
        return $query->where('type', 'payment');
    }

    public function scopeForDate($query, $date)
    {
        return $query->whereDate('transaction_date', $date);
    }

    // Helper Methods
    public function isPurchase()
    {
        return $this->type === 'purchase';
    }

    public function isPayment()
    {
        return $this->type === 'payment';
    }

    public function getNetAmountAttribute()
    {
        return $this->total_amount - $this->payment_amount;
    }
}
