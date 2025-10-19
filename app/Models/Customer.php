<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class Customer extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'phone',
        'email',
        'address',
        'credit_limit',
        'current_balance',
        'is_active',
    ];

    protected $casts = [
        'credit_limit' => 'decimal:2',
        'current_balance' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function sales(): HasMany
    {
        return $this->hasMany(Sale::class);
    }

    public function creditSales(): HasMany
    {
        return $this->hasMany(Sale::class)->where('payment_type', 'credit');
    }

    public function getTotalCreditAttribute(): float
    {
        return $this->creditSales()
            ->whereIn('status', ['completed', 'pending'])
            ->get()
            ->sum('remaining_amount');
    }

    public function getOverdueAmountAttribute(): float
    {
        return $this->creditSales()
            ->where('status', 'completed')
            ->where('due_date', '<', now())
            ->get()
            ->sum('remaining_amount');
    }

    public function getPendingCreditAttribute(): float
    {
        return $this->creditSales()
            ->where('status', 'completed')
            ->where('due_date', '>=', now())
            ->get()
            ->sum('remaining_amount');
    }

    public function getDebt(): float
    {
        // Get total for credit sales
        $creditTotal = $this->sales()
            ->where('status', 'completed')
            ->where('payment_type', 'credit')
            ->sum('total');

        // Get remaining for partial payments (total - amount_paid)
        $partialTotal = $this->sales()
            ->where('status', 'completed')
            ->where('payment_type', 'partial')
            ->sum(DB::raw('total - amount_paid'));

        return $creditTotal + $partialTotal;
    }

    public function getOutstandingBalance(): float
    {
        // Get total for credit sales
        $creditTotal = $this->sales()
            ->where('status', 'completed')
            ->where('payment_type', 'credit')
            ->sum('total');

        // Get remaining for partial payments (total - amount_paid)
        $partialTotal = $this->sales()
            ->where('status', 'completed')
            ->where('payment_type', 'partial')
            ->sum(DB::raw('total - amount_paid'));

        // Total amount the customer owes
        $totalDebt = $creditTotal + $partialTotal;

        // Total paid towards debt
        $amountPaid = CreditCollection::where('customer_id', $this->id)
            ->sum('amount_collected');

        // Outstanding balance
        return max($totalDebt - $amountPaid, 0);
    }

    public function creditCollections()
    {
        return $this->hasMany(CreditCollection::class);
    }
}
