# Stock Adjustment Logic Documentation

## Overview

This document explains how stock adjustments, specifically `[set:available]` and `[set:received]` adjustments, work in the stock control system. This logic applies to both the Stock Control dashboard and Sales Transactions.

## Key Concepts

### Adjustment Types

- **`[set:available]`**: Sets the "Available Stock" for a specific date. This is the dominant/supreme value that overrides all previous calculations for that day.
- **`[set:received]`**: Sets the "Stock Received today" for a specific date. This is also dominant/supreme for that day.

### Normal Stock Movements

- **`received`**: Regular stock received (not tagged with `[set:received]`)
- **`adjustment_in`**: Regular stock adjustments that increase stock (not tagged with `[set:available]` or `[set:received]`)
- **`adjustment_out`**: Regular stock adjustments that decrease stock (not tagged with `[set:available]` or `[set:received]`)

## Core Rules

### Rule 1: Adjustments Are Supreme

When `[set:available]` and/or `[set:received]` adjustments exist for a date, they override all previous stock calculations for that day. They set the baseline stock level.

### Rule 2: Multiple Adjustments on Same Day

- When a new `[set:available]` or `[set:received]` adjustment is created for a date, it **deletes** all previous `[set:available]` and `[set:received]` adjustments for that same date.
- Only the **last** (most recent by `created_at`) adjustment set matters for that day.
- This ensures only one adjustment set exists per day.

### Rule 3: Normal Movements and Sales After Adjustment

- **Normal stock movements** (received, adjustment_in, adjustment_out - NOT tagged with `[set:*]`) that happen **AFTER** the last adjustment **DO COUNT**.
- **Sales** that happen **AFTER** the last adjustment **DO COUNT**.
- Normal movements and sales that happen **BEFORE** the last adjustment **DO NOT COUNT** (they are ignored).

### Rule 4: No Adjustment Scenario

- If there are **NO** `[set:available]` or `[set:received]` adjustments for a date:
    - Use the **previous day's Remaining Stock** as the baseline.
    - **ALL** normal stock movements for that day count.
    - **ALL** sales for that day count.

## Calculation Logic

### Scenario A: Adjustment Exists for the Date

**Step 1: Find the Last Adjustment**

- Find the most recent `[set:available]` adjustment for the date (by `created_at`).
- Find the most recent `[set:received]` adjustment for the date (by `created_at`).
- Note the timestamp of the last adjustment.

**Step 2: Calculate Baseline Before Adjustment**

- Calculate baseline stock before the adjustment date (excluding previous day's `[set:available]` tags):
    ```
    baseline = received_before_date + adjustments_in_before_date - adjustments_out_before_date
    ```
    (Exclude `[set:available]` tags from adjustments_before_date)

**Step 3: Calculate Available Stock from Adjustment**

- Available Stock = baseline + `[set:available]` adjustment value
- Stock Received = `[set:received]` adjustment value (if exists)

**Step 4: Add Normal Movements After Adjustment**

- Find all normal stock movements (received, adjustment_in, adjustment_out - NOT `[set:*]`) that happened **AFTER** the last adjustment timestamp.
- Add adjustment_in, subtract adjustment_out, add received.

**Step 5: Subtract Sales After Adjustment**

- Find all sales that happened **AFTER** the last adjustment timestamp.
- Subtract total sales (cash + credit + partial).

**Step 6: Calculate Total Available**

```
Total Available = Available Stock + Stock Received + (normal movements after adjustment) - (sales after adjustment)
```

### Scenario B: No Adjustment Exists for the Date

**Step 1: Use Previous Day's Remaining Stock**

- Calculate previous day's Total Available:
    - Previous day's baseline (without `[set:available]`)
    -   - Previous day's `[set:available]` adjustment (if exists)
    -   - Previous day's Stock Received (including `[set:received]`)
    -   - Previous day's regular adjustments
- Subtract previous day's sales.
- This gives us the previous day's Remaining Stock.

**Step 2: Add Normal Movements for Current Day**

- Add all normal stock movements (received, adjustment_in, adjustment_out) for the current day.

**Step 3: Subtract Sales for Current Day**

- Subtract all sales (cash + credit + partial) for the current day.

**Step 4: Calculate Total Available**

```
Total Available = Previous Day's Remaining Stock + (normal movements for day) - (sales for day)
```

## Implementation Requirements

### For Stock Control Dashboard (StockControlController)

- Display Available Stock based on the adjustment logic above.
- Show Total Available = Available Stock + Stock Received + Regular Adjustments - Sales.
- Handle date range queries correctly.

### For Sales Transactions (SalesTransactionController)

- When validating stock availability for a sale on `transaction_date`:
    1. Check if adjustments exist for `transaction_date`.
    2. If YES: Use Scenario A logic (adjustment exists).
    3. If NO: Use Scenario B logic (no adjustment).
    4. Exclude the current sale being made from the sales count.
    5. Check if requested quantity ≤ Total Available.

### Important Notes

- **Date Filtering**: Always filter by the target date (`transaction_date` or dashboard date), not all time.
- **Timestamp Comparison**: When checking "after adjustment", compare `created_at` timestamps, not just dates.
- **Exclude Current Sale**: When validating a sale, exclude that sale from the sales count to avoid double-counting.

## Examples

### Example 1: Adjustment with Movements and Sales After

- **2025-11-12 10:00 AM**: Normal adjustment_in = 10 (ignored - before adjustment)
- **2025-11-12 11:00 AM**: Sale of 20 (ignored - before adjustment)
- **2025-11-12 2:00 PM**: `[set:available]` = 100, `[set:received]` = 80 (last adjustment)
- **2025-11-12 3:00 PM**: Normal adjustment_in = 5 (counts - after adjustment)
- **2025-11-12 4:00 PM**: Sale of 15 (counts - after adjustment)

**Calculation:**

- Available Stock = 100 (from adjustment)
- Stock Received = 80 (from adjustment)
- Normal movements after = +5
- Sales after = -15
- **Total Available = 100 + 80 + 5 - 15 = 170**

### Example 2: No Adjustment

- **2025-11-12**: Previous day's Remaining Stock = 50
- **2025-11-12 10:00 AM**: Normal adjustment_in = 10
- **2025-11-12 11:00 AM**: Sale of 20
- **2025-11-12 2:00 PM**: Normal received = 30

**Calculation:**

- Baseline = 50 (previous day's Remaining)
- Normal movements = +10 + 30 = +40
- Sales = -20
- **Total Available = 50 + 40 - 20 = 70**

### Example 3: Multiple Adjustments (Only Last Counts)

- **2025-11-12 10:00 AM**: `[set:available]` = 90 (deleted later)
- **2025-11-12 11:00 AM**: Normal adjustment_in = 10 (ignored - before last adjustment)
- **2025-11-12 2:00 PM**: `[set:available]` = 100 (last adjustment - this is what counts)
- **2025-11-12 3:00 PM**: Normal adjustment_in = 5 (counts - after last adjustment)

**Calculation:**

- Available Stock = 100 (from last adjustment at 2:00 PM)
- Normal movements after = +5
- **Total Available = 100 + 5 = 105**

## Summary

1. **Adjustments are supreme**: When they exist, they set the stock level.
2. **Only last adjustment matters**: Multiple adjustments on same day - only the last one counts.
3. **After adjustment counts**: Normal movements and sales after the last adjustment count.
4. **Before adjustment ignored**: Normal movements and sales before the last adjustment are ignored.
5. **No adjustment = previous day**: If no adjustment, use previous day's Remaining Stock.
6. **Date-aware**: Always filter by the target date, not all time.
