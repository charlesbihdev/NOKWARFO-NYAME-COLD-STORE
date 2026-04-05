<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DailyStockSnapshot extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'date',
        'available_stock',
        'received_today',
        'notes',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            // Keep as plain Y-m-d string; Carbon 'date' cast serializes as Y-m-d H:i:s in SQLite
            'date' => 'string',
            'available_stock' => 'integer',
            'received_today' => 'integer',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
