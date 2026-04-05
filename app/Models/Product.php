<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'lines_per_carton',
        'cost_price_per_carton',
        'category',
        'default_selling_price',
        'default_cost_price',
        'supplier_id',
        'is_active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'lines_per_carton' => 'integer',
            'cost_price_per_carton' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function saleItems(): HasMany
    {
        return $this->hasMany(SaleItem::class);
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    public function dailyStockSnapshots(): HasMany
    {
        return $this->hasMany(DailyStockSnapshot::class);
    }

    /**
     * All-time stock balance: received + adj_in - adj_out - sales from sale_items.
     * Use StockCalculationService::computeSummaryForDate() for the daily display.
     */
    public function getCurrentStockAttribute(): int
    {
        $received = (int) $this->stockMovements()->where('type', 'received')->sum('quantity');
        $adjIn = (int) $this->stockMovements()->where('type', 'adjustment_in')->sum('quantity');
        $adjOut = (int) $this->stockMovements()->where('type', 'adjustment_out')->sum('quantity');
        $sold = (int) DB::table('sale_items')->where('product_id', $this->id)->sum('quantity');

        return $received + $adjIn - $adjOut - $sold;
    }
}
