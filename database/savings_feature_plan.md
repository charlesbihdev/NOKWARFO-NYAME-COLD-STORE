Design a detailed implementation plan for a "Savings" feature in a Laravel 12 + Inertia React v2 cold store management application.

## Background Context

This is a cold store management system (NOKWARFO NYAME COLD STORE) with customers, suppliers, products, sales, debt tracking, expenses, bank transfers, trip estimations, etc.

The user wants a "Savings" feature that is separate from existing customer debt management. This is essentially a simple savings account system where:

1. User can create a savings account with a name (identifier) and date
2. User can credit (deposit) an amount with date into a savings account
3. User can debit (withdraw) with date, amount, and reason from a savings account
4. User can open a savings account and see total credits/debits with date range filtering (default range = today's date, learn from existing ProfitAnalysisController pattern)
5. User can create multiple savings accounts, paginated
6. When navigating to a specific savings account, paginate first 30 transactions

## Existing Patterns to Reuse

### Database/Migration Patterns:
- Foreign keys: `$table->foreignId('x_id')->constrained()->onDelete('cascade')`
- Money fields: `$table->decimal('amount', 10, 2)`
- Date fields: `$table->date('date_field')`
- Indexes: `$table->index(['field1', 'field2'])`
- Timestamps always included

### Model Patterns:
- Casts method (Laravel 12 style): `protected function casts(): array { return ['amount' => 'decimal:2', 'date' => 'date'] }`
- Fillable arrays
- Relationships with return types: `public function transactions(): HasMany`
- Computed attributes for totals

### Controller Patterns:
- Inline validation (string-based rules)
- Inertia::render() to return pages
- Date range filtering via query params (start_date, end_date)
- Default dates to today: `$startDate = $request->query('start_date') ?? now()->toDateString()`
- Eager loading with `->with()`
- Custom pagination when needed (manual Paginator)
- Standard paginate(30) for simple cases

### Route Patterns:
- Resource routes: `Route::resource('savings', SavingsController::class)`
- Nested custom routes: `Route::post('/savings/{saving}/credits', ...)`
- Route model binding

### Frontend Patterns:
- Pages in `resources/js/pages/` (kebab-case filenames like `savings.jsx`)
- useForm() hook for forms
- router.get() with preserveState/preserveScroll for filtering
- Debounced search (lodash debounce, 400ms)
- Dialog component for modals (create/edit)
- Card components for summary stats
- Table component for listing
- Badge component for status
- DateRangePicker component at `resources/js/components/DateRangePicker.jsx` (simple date inputs)
- Icons from lucide-react
- Currency format: `GH₵{amount.toFixed(2)}`
- 2-4 column stat card grids
- Pagination with Inertia Link (prev_page_url, next_page_url)

### Customer Transaction Page Pattern (to learn from):
- Back button navigation
- Header with action buttons
- 4 summary cards (Total Debt, Outstanding Balance, Total Payments, Status)
- Transaction history table with columns: Date, Type (badge), Reference, Description, Amount, Balance
- Running balance calculation
- Manual pagination (30 per page)
- Modals for add/edit operations

## Design Requirements

### Database Design:
1. `savings` table - the savings account itself
   - id, name (string, identifier), description (nullable), created_date (date when savings was opened), is_active (boolean), timestamps

2. `savings_transactions` table - all credits and debits
   - id, savings_id (FK), type (enum: 'credit', 'debit'), amount (decimal 10,2), transaction_date (date), description/reason (nullable text for debits especially), notes (nullable text), timestamps
   - Index on [savings_id, transaction_date]

### Backend:
- Saving model with HasMany transactions relationship
- SavingsTransaction model with BelongsTo saving relationship
- Computed: total_credits, total_debits, balance (credits - debits)
- SavingsController with:
  - index(): List all savings accounts paginated, with summary (balance, total credits, total debits)
  - store(): Create new savings account
  - update(): Edit savings account name/description
  - destroy(): Delete savings account (only if balance is 0 or confirm?)
  - show(): Show single savings with transactions, date range filtering, pagination (30 per page)
  - storeTransaction(): Add credit or debit
  - updateTransaction(): Edit a transaction
  - destroyTransaction(): Delete a transaction

### Frontend:
1. **Savings List Page** (`savings.jsx`):
   - Header with "Create Savings" button
   - Search input (filter by name)
   - Paginated grid/list of savings cards or table
   - Each savings shows: name, balance, total credits, total debits, created date, status
   - Click to navigate to detail page

2. **Savings Detail Page** (`SavingsDetail.jsx` or `savings-detail.jsx`):
   - Back button to savings list
   - Header with savings name
   - Action buttons: "Credit" (green), "Debit" (red)
   - Summary cards: Total Credits, Total Debits, Balance, Status
   - Date range picker for filtering transactions
   - Transaction history table (paginated, 30 per page)
   - Columns: Date, Type (Credit/Debit badge), Amount, Reason/Description, Running Balance, Actions
   - Running balance calculation (similar to customer transactions)
   - Edit/Delete buttons per transaction

Please provide a detailed step-by-step implementation plan covering:
1. Migration files (exact schema)
2. Model files (relationships, casts, computed attributes)
3. Controller methods (each method's logic)
4. Routes
5. Frontend pages and components
6. What to reuse vs what to create new
7. Testing approach