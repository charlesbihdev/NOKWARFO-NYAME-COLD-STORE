<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TripEstimationItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'trip_estimation_id',
        'product_name',
        'supplier_name',
        'quantity',
        'unit_cost_price',
        'total_cost_price',
        'unit_selling_price',
        'total_selling_price',
        'profit_per_item',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'unit_cost_price' => 'decimal:2',
        'total_cost_price' => 'decimal:2',
        'unit_selling_price' => 'decimal:2',
        'total_selling_price' => 'decimal:2',
        'profit_per_item' => 'decimal:2',
    ];

    public function tripEstimation(): BelongsTo
    {
        return $this->belongsTo(TripEstimation::class);
    }

    // Calculate item totals
    public function calculateTotals()
    {
        $this->total_cost_price = $this->quantity * $this->unit_cost_price;
        $this->total_selling_price = $this->quantity * $this->unit_selling_price;
        $this->profit_per_item = $this->total_selling_price - $this->total_cost_price;

        return $this;
    }
}
