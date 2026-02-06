<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\SupplierCreditTransaction>
 */
class SupplierCreditTransactionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'transaction_date' => fake()->date(),
            'description' => fake()->sentence(),
            'amount_owed' => fake()->randomFloat(2, 100, 1000),
            'notes' => fake()->sentence(),
        ];
    }
}
