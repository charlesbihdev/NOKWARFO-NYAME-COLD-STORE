<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Saving extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'date',
        'is_active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'date' => 'date',
            'is_active' => 'boolean',
        ];
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(SavingsTransaction::class, 'savings_id');
    }

    /**
     * Get total credits, optionally filtered by date range.
     */
    public function getTotalCredits(?string $startDate = null, ?string $endDate = null): float
    {
        $query = $this->transactions()->where('type', 'credit');

        if ($startDate) {
            $query->where('transaction_date', '>=', $startDate);
        }

        if ($endDate) {
            $query->where('transaction_date', '<=', $endDate);
        }

        return (float) $query->sum('amount');
    }

    /**
     * Get total debits, optionally filtered by date range.
     */
    public function getTotalDebits(?string $startDate = null, ?string $endDate = null): float
    {
        $query = $this->transactions()->where('type', 'debit');

        if ($startDate) {
            $query->where('transaction_date', '>=', $startDate);
        }

        if ($endDate) {
            $query->where('transaction_date', '<=', $endDate);
        }

        return (float) $query->sum('amount');
    }

    /**
     * Get balance (credits - debits), optionally filtered by date range.
     */
    public function getBalance(?string $startDate = null, ?string $endDate = null): float
    {
        return $this->getTotalCredits($startDate, $endDate) - $this->getTotalDebits($startDate, $endDate);
    }

    /**
     * Get balance status based on current balance.
     */
    public function getBalanceStatus(): string
    {
        $balance = $this->getBalance();

        if ($balance > 0) {
            return 'positive';
        }

        if ($balance < 0) {
            return 'negative';
        }

        return 'zero';
    }
}
