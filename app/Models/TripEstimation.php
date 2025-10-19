<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TripEstimation extends Model
{
    use HasFactory;

    protected $fillable = [
        'trip_date',
        'description',
        'location',
        'total_cost_price',
        'total_selling_price',
        'gross_profit',
        'transportation_cost',
        'other_expenses',
        'total_expenses',
        'net_profit',
        'notes',
        'user_id',
    ];

    protected $casts = [
        'trip_date' => 'date',
        'total_cost_price' => 'decimal:2',
        'total_selling_price' => 'decimal:2',
        'gross_profit' => 'decimal:2',
        'transportation_cost' => 'decimal:2',
        'other_expenses' => 'decimal:2',
        'total_expenses' => 'decimal:2',
        'net_profit' => 'decimal:2',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(TripEstimationItem::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // Calculate totals from items
    public function calculateTotals()
    {
        $totalCostPrice = $this->items->sum('total_cost_price');
        $totalSellingPrice = $this->items->sum('total_selling_price');
        $grossProfit = $totalSellingPrice - $totalCostPrice;
        $totalExpenses = $this->transportation_cost + $this->other_expenses;
        $netProfit = $grossProfit - $totalExpenses;

        $this->update([
            'total_cost_price' => $totalCostPrice,
            'total_selling_price' => $totalSellingPrice,
            'gross_profit' => $grossProfit,
            'total_expenses' => $totalExpenses,
            'net_profit' => $netProfit,
        ]);

        return $this;
    }
}
