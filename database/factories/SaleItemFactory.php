<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\SaleItem>
 */
class SaleItemFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $quantity = fake()->numberBetween(1, 10);
        $unitPrice = fake()->randomFloat(2, 5, 50);

        return [
            'product_name' => fake()->words(2, true),
            'quantity' => $quantity,
            'unit_selling_price' => $unitPrice,
            'unit_cost_price' => $unitPrice * 0.7,
            'total' => $quantity * $unitPrice,
            'profit' => $quantity * ($unitPrice - ($unitPrice * 0.7)),
        ];
    }
}
