<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupplierDebt extends Model
{
    protected $fillable = [
        'supplier_id',
        'amount',
        'debt_date',
        'description',
        'notes',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'debt_date' => 'date',
    ];

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }
}
