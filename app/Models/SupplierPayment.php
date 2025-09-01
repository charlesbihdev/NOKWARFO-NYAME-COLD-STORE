<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class SupplierPayment extends Model
{
    use HasFactory;

    protected $table = 'supplier_payments';

    protected $fillable = [
        'supplier_id',
        'payment_date',
        'payment_amount',
        'payment_method',
        'notes',
    ];

    protected $casts = [
        'payment_date' => 'date',
        'payment_amount' => 'decimal:2',
    ];

    // Relationships
    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    // Helper methods
    public function getFormattedPaymentAmountAttribute(): string
    {
        return 'GHC ' . number_format($this->payment_amount, 2);
    }

    public function getFormattedPaymentDateAttribute(): string
    {
        return $this->payment_date->format('d M Y');
    }

    // Helper methods
    public function getFormattedPaymentAmountAttribute(): string
    {
        return 'GHC ' . number_format($this->payment_amount, 2);
    }

    public function getFormattedPaymentDateAttribute(): string
    {
        return $this->payment_date->format('d M Y');
    }
}
