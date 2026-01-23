<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerDebt extends Model
{
    protected $fillable = [
        'customer_id',
        'amount',
        'debt_date',
        'description',
        'notes',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'debt_date' => 'date',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }
}
