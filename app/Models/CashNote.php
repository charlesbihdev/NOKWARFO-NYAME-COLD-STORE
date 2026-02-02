<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CashNote extends Model
{
    protected $fillable = [
        'record_date',
        'note_200',
        'note_100',
        'note_50',
        'note_20',
        'note_10',
        'note_5',
        'total',
        'notes',
    ];

    protected $casts = [
        'record_date' => 'date',
        'note_200' => 'integer',
        'note_100' => 'integer',
        'note_50' => 'integer',
        'note_20' => 'integer',
        'note_10' => 'integer',
        'note_5' => 'integer',
        'total' => 'decimal:2',
    ];

    /**
     * Calculate the total based on note counts.
     */
    public function calculateTotal(): float
    {
        return ($this->note_200 * 200)
            + ($this->note_100 * 100)
            + ($this->note_50 * 50)
            + ($this->note_20 * 20)
            + ($this->note_10 * 10)
            + ($this->note_5 * 5);
    }

    /**
     * Boot method to auto-calculate total before saving.
     */
    protected static function boot(): void
    {
        parent::boot();

        static::saving(function (CashNote $cashNote) {
            $cashNote->total = $cashNote->calculateTotal();
        });
    }
}
