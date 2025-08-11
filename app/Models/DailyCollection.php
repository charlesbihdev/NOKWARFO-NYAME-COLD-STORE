<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DailyCollection extends Model
{
    use HasFactory;

    protected $fillable = [
        'customer_name',
        'amount_collected',
        'payment_method',
        'notes',
    ];

    protected $casts = [
        'amount_collected' => 'decimal:2',
    ];
} 