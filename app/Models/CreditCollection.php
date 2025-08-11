<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CreditCollection extends Model
{
    use HasFactory;

    protected $fillable = [
        'customer_id',
        'amount_collected',
        'notes',
    ];

    protected $casts = [
        'amount_collected' => 'decimal:2',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }
} 