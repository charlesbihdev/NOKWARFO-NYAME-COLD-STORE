# Cold Store POS - Database Migration Plan

## Overview

This document outlines the complete database schema and models for the Cold Store POS system, based on analysis of the frontend components.

## Database Schema

### Core Tables

#### 1. **suppliers** - Product Vendors

- `id` (Primary Key)
- `name` (String) - Supplier company name
- `contact_person` (String) - Primary contact
- `phone` (String, nullable) - Contact phone
- `email` (String, nullable) - Contact email
- `address` (Text, nullable) - Physical address
- `additional_info` (Text, nullable) - Additional notes
- `is_active` (Boolean) - Active status
- `created_at`, `updated_at` (Timestamps)

#### 2. **products** - Inventory Items

- `id` (Primary Key)
- `name` (String) - Product name (e.g., "16 KILOS", "KOREA 16+")
- `lines_per_carton` (Integer) - Units per carton
- `cost_price` (Decimal) - Purchase cost
- `selling_price` (Decimal, nullable) - Retail price
- `description` (Text, nullable) - Product description
- `is_active` (Boolean) - Active status
- `created_at`, `updated_at` (Timestamps)

#### 3. **customers** - Buyers

- `id` (Primary Key)
- `name` (String) - Customer name
- `phone` (String, nullable) - Contact phone
- `email` (String, nullable) - Contact email
- `address` (Text, nullable) - Physical address
- `credit_limit` (Decimal) - Maximum credit allowed
- `current_balance` (Decimal) - Current outstanding balance
- `is_active` (Boolean) - Active status
- `created_at`, `updated_at` (Timestamps)

#### 4. **sales** - Sales Transactions (Consolidated)

- `id` (Primary Key)
- `transaction_id` (String, unique) - Transaction reference (e.g., "TXN001")
- `customer_id` (Foreign Key, nullable) - Customer reference
- `customer_name` (String, nullable) - Quick customer name for non-registered customers
- `subtotal` (Decimal) - Subtotal before tax
- `tax` (Decimal) - Tax amount
- `total` (Decimal) - Final total
- `payment_type` (Enum) - cash, credit, bank_transfer, check
- `status` (Enum) - completed, pending, cancelled
- `due_date` (Date, nullable) - Payment due date (for credit sales)
- `amount_paid` (Decimal) - Amount paid so far (for credit sales)
- `paid_date` (Date, nullable) - Date of payment (for credit sales)
- `notes` (Text, nullable) - Additional notes
- `user_id` (Foreign Key) - Cashier/User who made the sale
- `created_at`, `updated_at` (Timestamps)

#### 5. **sale_items** - Individual Items in Sales

- `id` (Primary Key)
- `sale_id` (Foreign Key) - Parent sale
- `product_id` (Foreign Key) - Product reference
- `product_name` (String) - Product name at time of sale
- `quantity` (Integer) - Quantity sold
- `unit_price` (Decimal) - Price per unit
- `total` (Decimal) - Total for this item
- `created_at`, `updated_at` (Timestamps)

#### 6. **stock_movements** - Inventory Tracking

- `id` (Primary Key)
- `product_id` (Foreign Key) - Product reference
- `supplier_id` (Foreign Key, nullable) - Supplier reference
- `type` (Enum) - received, sold, adjusted, damaged, expired
- `quantity` (Integer) - Quantity moved
- `unit_selling_price` (Decimal, nullable) - Cost per unit
- `total_cost` (Decimal, nullable) - Total cost
- `notes` (Text, nullable) - Movement notes
- `user_id` (Foreign Key) - User who recorded movement
- `created_at`, `updated_at` (Timestamps)

#### 7. **bank_transfers** - Financial Transactions

- `id` (Primary Key)
- `date` (Date) - Transaction date
- `previous_balance` (Decimal) - Balance before transaction
- `credit` (Decimal) - Money received
- `total_balance` (Decimal) - Balance after credit
- `debit` (Decimal) - Money sent out
- `debit_tag` (String, nullable) - Debit description/tag
- `current_balance` (Decimal) - Final balance
- `custom_tag` (Text, nullable) - Custom description
- `notes` (Text, nullable) - Additional notes
- `user_id` (Foreign Key) - User who recorded transfer
- `created_at`, `updated_at` (Timestamps)

## Eloquent Models

### Model Relationships

#### Supplier Model

- `stockMovements()` - Has many stock movements
- `products()` - Has many products

#### Product Model

- `supplier()` - Belongs to supplier
- `saleItems()` - Has many sale items
- `stockMovements()` - Has many stock movements
- `currentStock` (Accessor) - Calculates current stock level

#### Customer Model

- `sales()` - Has many sales
- `creditSales()` - Has many credit sales (filtered by payment_type = 'credit')
- `totalCredit` (Accessor) - Calculates total outstanding credit
- `overdueAmount` (Accessor) - Calculates overdue amount
- `pendingCredit` (Accessor) - Calculates pending credit amount

#### Sale Model (Consolidated)

- `customer()` - Belongs to customer
- `user()` - Belongs to user (cashier)
- `saleItems()` - Has many sale items
- `isCreditSale()` (Method) - Checks if sale is credit
- `remainingAmount` (Accessor) - Calculates remaining amount for credit sales
- `daysOverdue` (Accessor) - Calculates days overdue for credit sales
- `creditStatus` (Accessor) - Returns credit status (not_credit, paid, pending, overdue)

#### SaleItem Model

- `sale()` - Belongs to sale
- `product()` - Belongs to product

#### StockMovement Model

- `product()` - Belongs to product
- `supplier()` - Belongs to supplier
- `user()` - Belongs to user

#### BankTransfer Model

- `user()` - Belongs to user

## Sample Data

The system includes a comprehensive seeder (`ColdStoreSeeder`) that populates:

### Suppliers

- Fresh Farms Ltd
- Ocean Fresh Co
- Asia Import Ltd
- Local Suppliers

### Products

- 16 KILOS, KOREA 16+, 25+ CHINA, VIRA 16 KILO
- AAA, CHOFI, YELLOW TAI, ABIDJAN
- EBA, SAFUL, ADOR, 4IX FISH

### Customers

- KOFI, AMA, KWAME, AKOSUA
- John Doe, Jane Smith, Mike Johnson

### Bank Transfers

- 3 sample bank transfer entries with running balances

## Key Features

### Stock Management

- Track stock received from suppliers
- Monitor sales and stock depletion
- Calculate current stock levels automatically
- Support for stock adjustments and damage/expiry

### Sales Processing (Consolidated)

- Support for cash and credit sales in single table
- Itemized sales with individual product tracking
- Tax calculation support
- Transaction status tracking
- Credit-specific fields (due_date, amount_paid, paid_date)

### Credit Management

- Customer credit limits
- Due date tracking
- Overdue calculation
- Payment tracking
- Credit status determination

### Financial Tracking

- Bank transfer ledger
- Running balance calculations
- Payment method tracking

### User Management

- All transactions linked to users
- Audit trail for all operations
- User-based access control

## Migration Commands

To set up the database:

```bash
# Run migrations
php artisan migrate

# Seed with sample data
php artisan db:seed

# Or run specific seeder
php artisan db:seed --class=ColdStoreSeeder
```

## Next Steps

1. **Controllers**: Create RESTful controllers for each model
2. **API Routes**: Define API endpoints for frontend integration
3. **Validation**: Add request validation rules
4. **Policies**: Implement authorization policies
5. **Testing**: Create feature and unit tests
6. **Frontend Integration**: Connect React components to Laravel API
