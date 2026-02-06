<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Sale>
 */
class SaleFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'transaction_id' => 'TXN-' . fake()->unique()->numerify('######'),
            'customer_name' => fake()->name(),
            'subtotal' => fake()->randomFloat(2, 50, 500),
            'tax' => 0,
            'total' => fake()->randomFloat(2, 50, 500),
            'payment_type' => fake()->randomElement(['cash', 'credit', 'partial']),
            'status' => 'completed',
            'amount_paid' => fake()->randomFloat(2, 0, 500),
            'user_id' => User::factory(),
        ];
    }
}
