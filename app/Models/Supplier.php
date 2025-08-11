<?php

namespace App\Models;

use App\Models\Product;
use App\Models\StockMovement;
use App\Models\SupplierTransaction;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Supplier extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'contact_person',
        'phone',
        'email',
        'address',
        'additional_info',
        'is_active',
        'current_balance',
        'total_purchases',
        'total_payments',
        'last_transaction_date',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(SupplierTransaction::class);
    }

    /**
     * Get the latest transaction
     */

    public function latestTransaction(): HasOne
    {
        return $this->hasOne(SupplierTransaction::class, 'supplier_id')->latestOfMany();
    }

    public function hasOutstandingDebt(): bool
    {
        return $this->current_balance > 0;
    }
}
