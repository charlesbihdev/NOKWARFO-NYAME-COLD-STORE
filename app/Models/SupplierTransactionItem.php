<?php

namespace App\Models;

use App\Models\SupplierTransaction;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class SupplierTransactionItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'supplier_transaction_id',
        'product_name',
        'quantity',
        'unit_price',
        'total_amount',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'unit_price' => 'decimal:2',
        'total_amount' => 'decimal:2',
    ];

    // Relationships  
    public function transaction()
    {
        return $this->belongsTo(SupplierTransaction::class, 'supplier_transaction_id');
    }

    // Mutators
    public function setTotalAmountAttribute($value)
    {
        $this->attributes['total_amount'] = $this->quantity * $this->unit_price;
    }

    // Boot method to auto-calculate total
    protected static function boot()
    {
        parent::boot();

        static::saving(function ($item) {
            $item->total_amount = $item->quantity * $item->unit_price;
        });
    }
}
