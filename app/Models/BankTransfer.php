<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\BankTransferTag;

class BankTransfer extends Model
{
    use HasFactory;

    protected $fillable = [
        'date',
        'previous_balance',
        'credit',
        'total_balance',
        'debit',
        'tag_id',
        'current_balance',
        'notes',
        'user_id',
    ];

    public function tag()
    {
        return $this->belongsTo(BankTransferTag::class);
    }

    protected $casts = [
        'date' => 'date',
        'previous_balance' => 'decimal:2',
        'credit' => 'decimal:2',
        'total_balance' => 'decimal:2',
        'debit' => 'decimal:2',
        'current_balance' => 'decimal:2',
    ];
}
