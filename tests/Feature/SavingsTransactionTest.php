<?php

namespace Tests\Feature;

use App\Models\Saving;
use App\Models\SavingsTransaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SavingsTransactionTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_add_credit_transaction(): void
    {
        $user = User::factory()->create();
        $saving = Saving::factory()->create();

        $this->actingAs($user)
            ->post("/savings/{$saving->id}/transactions", [
                'type' => 'credit',
                'amount' => 100.50,
                'transaction_date' => '2026-02-06',
                'notes' => 'Test credit',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('savings_transactions', [
            'savings_id' => $saving->id,
            'type' => 'credit',
            'amount' => 100.50,
        ]);
    }

    public function test_can_add_debit_transaction_with_reason(): void
    {
        $user = User::factory()->create();
        $saving = Saving::factory()->create();

        $this->actingAs($user)
            ->post("/savings/{$saving->id}/transactions", [
                'type' => 'debit',
                'amount' => 50.25,
                'transaction_date' => '2026-02-06',
                'reason' => 'Emergency withdrawal',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('savings_transactions', [
            'savings_id' => $saving->id,
            'type' => 'debit',
            'amount' => 50.25,
            'reason' => 'Emergency withdrawal',
        ]);
    }

    public function test_debit_without_reason_fails(): void
    {
        $user = User::factory()->create();
        $saving = Saving::factory()->create();

        $this->actingAs($user)
            ->post("/savings/{$saving->id}/transactions", [
                'type' => 'debit',
                'amount' => 50.00,
                'transaction_date' => '2026-02-06',
            ])
            ->assertSessionHasErrors('reason');
    }

    public function test_can_update_transaction(): void
    {
        $user = User::factory()->create();
        $saving = Saving::factory()->create();
        $transaction = SavingsTransaction::factory()->credit()->create([
            'savings_id' => $saving->id,
            'amount' => 100.00,
        ]);

        $this->actingAs($user)
            ->put("/savings/transactions/{$transaction->id}", [
                'type' => 'credit',
                'amount' => 200.00,
                'transaction_date' => '2026-02-06',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('savings_transactions', [
            'id' => $transaction->id,
            'amount' => 200.00,
        ]);
    }

    public function test_can_delete_transaction(): void
    {
        $user = User::factory()->create();
        $saving = Saving::factory()->create();
        $transaction = SavingsTransaction::factory()->create([
            'savings_id' => $saving->id,
        ]);

        $this->actingAs($user)
            ->delete("/savings/transactions/{$transaction->id}")
            ->assertRedirect();

        $this->assertDatabaseMissing('savings_transactions', [
            'id' => $transaction->id,
        ]);
    }

    public function test_balance_calculation(): void
    {
        $saving = Saving::factory()->create();

        SavingsTransaction::factory()->credit()->create([
            'savings_id' => $saving->id,
            'amount' => 500.00,
        ]);

        SavingsTransaction::factory()->debit()->create([
            'savings_id' => $saving->id,
            'amount' => 150.00,
        ]);

        $this->assertEquals(500.00, $saving->getTotalCredits());
        $this->assertEquals(150.00, $saving->getTotalDebits());
        $this->assertEquals(350.00, $saving->getBalance());
    }

    public function test_balance_status(): void
    {
        $positiveBalance = Saving::factory()->create();
        SavingsTransaction::factory()->credit()->create([
            'savings_id' => $positiveBalance->id,
            'amount' => 100.00,
        ]);

        $this->assertEquals('positive', $positiveBalance->getBalanceStatus());

        $negativeBalance = Saving::factory()->create();
        SavingsTransaction::factory()->debit()->create([
            'savings_id' => $negativeBalance->id,
            'amount' => 100.00,
        ]);

        $this->assertEquals('negative', $negativeBalance->getBalanceStatus());

        $zeroBalance = Saving::factory()->create();
        $this->assertEquals('zero', $zeroBalance->getBalanceStatus());
    }

    public function test_date_range_filtering(): void
    {
        $saving = Saving::factory()->create();

        SavingsTransaction::factory()->credit()->create([
            'savings_id' => $saving->id,
            'amount' => 100.00,
            'transaction_date' => '2026-01-01',
        ]);

        SavingsTransaction::factory()->credit()->create([
            'savings_id' => $saving->id,
            'amount' => 200.00,
            'transaction_date' => '2026-02-15',
        ]);

        $this->assertEquals(100.00, $saving->getTotalCredits('2026-01-01', '2026-01-31'));
        $this->assertEquals(200.00, $saving->getTotalCredits('2026-02-01', '2026-02-28'));
        $this->assertEquals(300.00, $saving->getTotalCredits());
    }
}
