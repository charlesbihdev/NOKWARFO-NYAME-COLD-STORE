<?php

namespace Database\Factories;

use App\Models\Saving;
use App\Models\SavingsTransaction;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\SavingsTransaction>
 */
class SavingsTransactionFactory extends Factory
{
    protected $model = SavingsTransaction::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $type = fake()->randomElement(['credit', 'debit']);

        return [
            'savings_id' => Saving::factory(),
            'type' => $type,
            'amount' => fake()->randomFloat(2, 10, 5000),
            'transaction_date' => fake()->dateTimeBetween('-6 months', 'now')->format('Y-m-d'),
            'reason' => $type === 'debit' ? fake()->sentence() : null,
            'notes' => fake()->optional()->sentence(),
        ];
    }

    /**
     * Create a credit transaction.
     */
    public function credit(): static
    {
        return $this->state(fn(array $attributes) => [
            'type' => 'credit',
            'reason' => null,
        ]);
    }

    /**
     * Create a debit transaction.
     */
    public function debit(): static
    {
        return $this->state(fn(array $attributes) => [
            'type' => 'debit',
            'reason' => fake()->sentence(),
        ]);
    }
}
