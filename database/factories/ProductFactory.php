<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Product>
 */
class ProductFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->words(2, true),
            'description' => fake()->sentence(),
            'lines_per_carton' => fake()->numberBetween(1, 8),
            'cost_price_per_carton' => fake()->randomFloat(2, 10, 100),
            'category' => fake()->randomElement(['Frozen Fish', 'Frozen Meat', 'Dairy', 'Beverages']),
            'is_active' => true,
        ];
    }
}
