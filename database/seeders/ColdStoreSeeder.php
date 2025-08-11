<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Supplier;
use App\Models\Product;
use App\Models\Customer;
use App\Models\BankTransfer;
use App\Models\User;

class ColdStoreSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create a default user if none exists
        $user = User::firstOrCreate(
            ['email' => 'admin@coldstore.com'],
            [
                'name' => 'Admin User',
                'password' => bcrypt('password'),
            ]
        );

        // Seed Suppliers
        $suppliers = [
            [
                'name' => 'Fresh Farms Ltd',
                'contact_person' => 'John Smith',
                'phone' => '+233 24 123 4567',
                'email' => 'orders@freshfarms.com',
                'address' => 'Tema Industrial Area, Accra',
                'additional_info' => 'Main supplier for frozen chicken and meat products',
            ],
            [
                'name' => 'Ocean Fresh Co',
                'contact_person' => 'Sarah Wilson',
                'phone' => '+233 20 987 6543',
                'email' => 'supply@oceanfresh.com',
                'address' => 'Takoradi Port, Western Region',
                'additional_info' => 'Specializes in frozen fish and seafood',
            ],
            [
                'name' => 'Asia Import Ltd',
                'contact_person' => 'Mike Johnson',
                'phone' => '+233 26 555 0123',
                'email' => 'sales@asiaimport.com',
                'address' => 'Kumasi Central Market',
                'additional_info' => 'Imports frozen products from Asia',
            ],
            [
                'name' => 'Local Suppliers',
                'contact_person' => 'Various',
                'phone' => 'N/A',
                'email' => 'N/A',
                'address' => 'Local Markets',
                'additional_info' => 'Local market suppliers for various products',
            ],
        ];

        foreach ($suppliers as $supplierData) {
            Supplier::firstOrCreate(
                ['name' => $supplierData['name']],
                $supplierData
            );
        }

        // Get suppliers for assignment
        $supplierMap = Supplier::pluck('id', 'name');

        // Seed Products
        $products = [
            ['name' => '16 KILOS', 'lines_per_carton' => 1, 'cost_price' => 525, 'selling_price' => 600, 'description' => 'Frozen fish', 'category' => 'Fish', 'supplier_id' => $supplierMap['Fresh Farms Ltd'] ?? null, 'is_active' => true],
            ['name' => 'KOREA 16+', 'lines_per_carton' => 1, 'cost_price' => 525, 'selling_price' => 610, 'description' => 'Frozen fish', 'category' => 'Fish', 'supplier_id' => $supplierMap['Ocean Fresh Co'] ?? null, 'is_active' => true],
            ['name' => '25+ CHINA', 'lines_per_carton' => 1, 'cost_price' => 524, 'selling_price' => 590, 'description' => 'Frozen fish', 'category' => 'Fish', 'supplier_id' => $supplierMap['Asia Import Ltd'] ?? null, 'is_active' => true],
            ['name' => 'VIRA 16 KILO', 'lines_per_carton' => 1, 'cost_price' => 527, 'selling_price' => 620, 'description' => 'Frozen fish', 'category' => 'Fish', 'supplier_id' => $supplierMap['Local Suppliers'] ?? null, 'is_active' => true],
            ['name' => 'AAA', 'lines_per_carton' => 1, 'cost_price' => 530, 'selling_price' => 650, 'description' => 'Frozen chicken', 'category' => 'Chicken', 'supplier_id' => $supplierMap['Fresh Farms Ltd'] ?? null, 'is_active' => true],
            ['name' => 'CHOFI', 'lines_per_carton' => 1, 'cost_price' => 520, 'selling_price' => 600, 'description' => 'Frozen chicken', 'category' => 'Chicken', 'supplier_id' => $supplierMap['Local Suppliers'] ?? null, 'is_active' => true],
            ['name' => 'YELLOW TAI', 'lines_per_carton' => 1, 'cost_price' => 0, 'selling_price' => null, 'description' => null, 'category' => null, 'supplier_id' => null, 'is_active' => true],
            ['name' => 'ABIDJAN', 'lines_per_carton' => 1, 'cost_price' => 0, 'selling_price' => null, 'description' => null, 'category' => null, 'supplier_id' => null, 'is_active' => true],
            ['name' => 'EBA', 'lines_per_carton' => 1, 'cost_price' => 0, 'selling_price' => null, 'description' => null, 'category' => null, 'supplier_id' => null, 'is_active' => true],
            ['name' => 'SAFUL', 'lines_per_carton' => 1, 'cost_price' => 0, 'selling_price' => null, 'description' => null, 'category' => null, 'supplier_id' => null, 'is_active' => true],
            ['name' => 'ADOR', 'lines_per_carton' => 1, 'cost_price' => 0, 'selling_price' => null, 'description' => null, 'category' => null, 'supplier_id' => null, 'is_active' => true],
            ['name' => '4IX FISH', 'lines_per_carton' => 1, 'cost_price' => 0, 'selling_price' => null, 'description' => null, 'category' => null, 'supplier_id' => null, 'is_active' => true],
        ];

        foreach ($products as $productData) {
            Product::firstOrCreate(
                ['name' => $productData['name']],
                $productData
            );
        }

        // Seed Customers
        $customers = [
            ['name' => 'KOFI', 'phone' => '+233 24 111 1111'],
            ['name' => 'AMA', 'phone' => '+233 24 222 2222'],
            ['name' => 'KWAME', 'phone' => '+233 24 333 3333'],
            ['name' => 'AKOSUA', 'phone' => '+233 24 444 4444'],
            ['name' => 'John Doe', 'phone' => '+233 24 555 5555'],
            ['name' => 'Jane Smith', 'phone' => '+233 24 666 6666'],
            ['name' => 'Mike Johnson', 'phone' => '+233 24 777 7777'],
        ];

        foreach ($customers as $customerData) {
            Customer::firstOrCreate(
                ['name' => $customerData['name']],
                $customerData
            );
        }

        // Seed Bank Transfers
        $bankTransfers = [
            [
                'date' => '2025-02-01',
                'previous_balance' => 26940.0,
                'credit' => 233080.0,
                'total_balance' => 260020.0,
                'debit' => 120000.0,
                'debit_tag' => 'OAKPEMA - GCB CHEQUE',
                'current_balance' => 140020.0,
            ],
            [
                'date' => '2025-02-04',
                'previous_balance' => 140020.0,
                'credit' => 56290.0,
                'total_balance' => 196310.0,
                'debit' => 0.0,
                'debit_tag' => null,
                'current_balance' => 196310.0,
            ],
            [
                'date' => '2025-02-05',
                'previous_balance' => 196310.0,
                'credit' => 30920.0,
                'total_balance' => 227230.0,
                'debit' => 220000.0,
                'debit_tag' => 'TO AUNTY FORIWAA- GCB TRANSFER',
                'current_balance' => 7230.0,
            ],
        ];

        foreach ($bankTransfers as $transferData) {
            BankTransfer::firstOrCreate(
                [
                    'date' => $transferData['date'],
                    'debit_tag' => $transferData['debit_tag'],
                ],
                array_merge($transferData, ['user_id' => $user->id])
            );
        }
    }
} 