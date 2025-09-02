<?php

namespace Tests\Feature;

use App\Models\Supplier;
use App\Models\SupplierCreditTransaction;
use App\Models\SupplierPayment;
use App\Services\SupplierCreditService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SupplierCalculationTest extends TestCase
{
    use RefreshDatabase;

    public function test_supplier_payment_calculations_work_correctly()
    {
        // Create a supplier
        $supplier = Supplier::create([
            'name' => 'Test Supplier',
            'contact_person' => 'John Doe',
            'phone' => '1234567890',
            'email' => 'test@example.com',
            'is_active' => true,
        ]);

        // Create a credit transaction (debt of 100)
        $transaction = SupplierCreditTransaction::create([
            'supplier_id' => $supplier->id,
            'transaction_date' => '2025-08-31',
            'description' => 'Test credit transaction',
            'amount_owed' => 100.00,
            'notes' => 'Test notes',
        ]);

        // Create first payment (90 GHC) - earlier timestamp
        $payment1 = SupplierPayment::create([
            'supplier_id' => $supplier->id,
            'payment_date' => '2025-08-31',
            'payment_amount' => 90.00,
            'payment_method' => 'cash',
            'notes' => 'First payment',
        ]);

        // Add a small delay to ensure different timestamps
        sleep(1);

        // Create second payment (10 GHC) - later timestamp
        $payment2 = SupplierPayment::create([
            'supplier_id' => $supplier->id,
            'payment_date' => '2025-08-31',
            'payment_amount' => 10.00,
            'payment_method' => 'cash',
            'notes' => 'Second payment',
        ]);

        // Test the calculation service
        $creditService = new SupplierCreditService;

        // Test first payment (90 GHC) - should show previous debt of 100
        $summary1 = $creditService->getPaymentSummary($payment1);
        $this->assertEquals(100.0, $summary1['previous_debt']);
        $this->assertEquals(90.0, $summary1['payment_amount']);
        $this->assertEquals(10.0, $summary1['outstanding_balance']);

        // Test second payment (10 GHC) - should show previous debt of 10 (after first payment)
        $summary2 = $creditService->getPaymentSummary($payment2);
        $this->assertEquals(10.0, $summary2['previous_debt']);
        $this->assertEquals(10.0, $summary2['payment_amount']);
        $this->assertEquals(0.0, $summary2['outstanding_balance']);

        // Verify the flow is correct
        $this->assertEquals(
            $summary1['previous_debt'] - $summary1['payment_amount'],
            $summary1['outstanding_balance']
        );
        $this->assertEquals(
            $summary2['previous_debt'] - $summary2['payment_amount'],
            $summary2['outstanding_balance']
        );

        // Additional verification: total outstanding should be 0 after all payments
        $this->assertEquals(0.0, $summary2['outstanding_balance']);
    }

    public function test_transaction_after_payment_shows_correct_previous_debt()
    {
        // Create a supplier
        $supplier = Supplier::create([
            'name' => 'Test Supplier 2',
            'contact_person' => 'Jane Doe',
            'phone' => '0987654321',
            'email' => 'test2@example.com',
            'is_active' => true,
        ]);

        // Create first transaction (debt of 100)
        $transaction1 = SupplierCreditTransaction::create([
            'supplier_id' => $supplier->id,
            'transaction_date' => '2025-08-31',
            'description' => 'First transaction',
            'amount_owed' => 100.00,
            'notes' => 'Test notes',
        ]);

        // Add delay to ensure different timestamps
        sleep(1);

        // Create payment that clears the debt (100 GHC)
        $payment = SupplierPayment::create([
            'supplier_id' => $supplier->id,
            'payment_date' => '2025-08-31',
            'payment_amount' => 100.00,
            'payment_method' => 'cash',
            'notes' => 'Full payment',
        ]);

        // Add delay to ensure different timestamps
        sleep(1);

        // Create second transaction (debt of 5200)
        $transaction2 = SupplierCreditTransaction::create([
            'supplier_id' => $supplier->id,
            'transaction_date' => '2025-09-01',
            'description' => 'Second transaction',
            'amount_owed' => 5200.00,
            'notes' => 'Test notes',
        ]);

        // Test the calculation service
        $creditService = new SupplierCreditService;

        // Test first transaction - should show previous debt of 0
        $summary1 = $creditService->getTransactionSummary($transaction1);
        $this->assertEquals(0.0, $summary1['previous_debt']);
        $this->assertEquals(100.0, $summary1['current_debt']);
        $this->assertEquals(100.0, $summary1['total_debt']);

        // Test payment - should show previous debt of 100, outstanding of 0
        $paymentSummary = $creditService->getPaymentSummary($payment);
        $this->assertEquals(100.0, $paymentSummary['previous_debt']);
        $this->assertEquals(100.0, $paymentSummary['payment_amount']);
        $this->assertEquals(0.0, $paymentSummary['outstanding_balance']);

        // Test second transaction - should show previous debt of 0 (after payment cleared it)
        $summary2 = $creditService->getTransactionSummary($transaction2);
        $this->assertEquals(0.0, $summary2['previous_debt']);
        $this->assertEquals(5200.0, $summary2['current_debt']);
        $this->assertEquals(5200.0, $summary2['total_debt']);

        // Verify the flow makes sense
        $this->assertEquals(0.0, $summary2['previous_debt'], 'Transaction after payment should show 0 previous debt');
    }
}
