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
        'supplier_credit_transaction_id',
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
    public function creditTransaction(): BelongsTo
    {
        return $this->belongsTo(SupplierCreditTransaction::class, 'supplier_credit_transaction_id');
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    // Validation: Ensure payment doesn't exceed remaining balance
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($payment) {
            $transaction = $payment->creditTransaction;
            $remainingBalance = $transaction->remaining_balance;
            
            if ($payment->payment_amount > $remainingBalance) {
                throw new \Exception("Payment amount (GHC {$payment->payment_amount}) cannot exceed remaining balance (GHC {$remainingBalance})");
            }
        });
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
