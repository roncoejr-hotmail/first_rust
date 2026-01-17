# FP&A Data Generation Guide

## Overview
The FP&A data generation tool creates realistic financial planning and analysis sample data for testing and demonstration purposes.

## Prerequisites

1. **Create FP&A Schema First:**
   ```bash
   psql -U your_user -d postgres -f schema/09_create_fpa_tables.sql
   ```

2. **Generate Core Operational Data:**
   ```bash
   cargo run -- --db-pgsql --db-name postgres --generate-sample-data --count 200
   ```
   This creates vehicles, customers, employees, sales, loans, payments, and maintenance records.

## Generate FP&A Data

### Command
```bash
cargo run -- --db-pgsql --db-name postgres --generate-fpa-data
```

### What Gets Generated

#### 1. **Cost Centers** (10 centers)
- Organizational units for budget tracking
- Assigned to departments (Sales, Finance, Marketing, Operations, IT, HR)
- Each with a manager and budget allocation
- Examples:
  - `CC-0001: Sales - Showroom`
  - `CC-0002: Finance - Admin`
  - `CC-0003: Marketing - Corporate`

#### 2. **Budgets** (192 line items)
- Full fiscal year 2023 budget
- Monthly budgets for each category:
  - **Revenue**: vehicle_sales, service_revenue, parts_sales, finance_income
  - **COGS**: vehicle_cost, parts_cost, direct_labor
  - **Operating Expenses**: salaries, rent, utilities, insurance, marketing
  - **Marketing**: digital_ads, traditional_media, events, promotions
- Allocated across 6 departments
- Status: `approved` (ready for variance analysis)

#### 3. **Actuals** (from existing sales)
- Automatically creates actual transactions from:
  - All sales records → Revenue actuals
  - Vehicle costs → COGS actuals
- Properly categorized and dated
- Linked to original transactions via `reference_type` and `reference_id`

#### 4. **Expenses** (200 records)
- Operating expenses throughout 2023:
  - **Payroll**: $50K-$150K (recurring monthly)
  - **Rent**: $10K-$30K (recurring monthly)
  - **Utilities**: $2K-$8K (recurring monthly)
  - **Marketing**: $5K-$50K (one-time)
  - **Insurance**: $5K-$20K (recurring monthly)
  - **Maintenance**: $1K-$10K (one-time)
  - **Supplies**: $500-$5K (one-time)
  - **Professional Services**: $2K-$20K (one-time)
- Assigned to cost centers
- Status: `approved`

#### 5. **KPI Definitions** (14 KPIs)
- **Financial KPIs:**
  - Total Revenue (target: $1M/month)
  - Gross Profit Margin (target: 25%)
  - Net Profit Margin (target: 10%)
  - Operating Expense Ratio (target: 20%)

- **Sales KPIs:**
  - Sales Volume (target: 50 vehicles/month)
  - Average Deal Size (target: $40K)
  - Sales Conversion Rate (target: 25%)
  - Sales per Employee (target: $200K/month)

- **Inventory KPIs:**
  - Inventory Turnover (target: 8x/year)
  - Days in Inventory (target: 30 days)
  - Inventory Value (target: $2M)

- **Customer KPIs:**
  - Customer Lifetime Value (target: $50K)
  - Customer Retention Rate (target: 30%)
  - Net Promoter Score (target: 50)

Each KPI includes:
- Red/Yellow/Green thresholds
- Target values
- Calculation methods
- Update frequency

#### 6. **Forecast Scenarios** (3 scenarios)
- **Best Case**: Optimistic projections (20% growth)
- **Most Likely**: Realistic projections (10% growth)
- **Worst Case**: Conservative projections (5% decline)

All scenarios ready for detailed forecast data entry.

## Data Relationships

```
Cost Centers
    ↓
Budgets ←→ Actuals (variance analysis)
    ↓
Expenses → Actuals
    ↓
KPI Definitions → KPI Actuals (calculated)
    ↓
Forecast Scenarios → Forecast Data
```

## Verification Queries

### Check Budget vs Actual
```sql
SELECT * FROM vw_budget_vs_actual_monthly 
WHERE fiscal_year = 2023 
ORDER BY fiscal_month, category;
```

### View Cost Centers
```sql
SELECT cc.cost_center_code, cc.cost_center_name, 
       e.first_name || ' ' || e.last_name as manager,
       cc.budget_allocation
FROM cost_centers cc
JOIN employees e ON cc.manager_id = e.employee_id
WHERE cc.is_active = true;
```

### Check Expenses by Type
```sql
SELECT expense_type, 
       COUNT(*) as count,
       SUM(amount) as total_amount,
       AVG(amount) as avg_amount
FROM expenses
WHERE status = 'approved'
GROUP BY expense_type
ORDER BY total_amount DESC;
```

### View KPI Definitions
```sql
SELECT kpi_name, kpi_code, category, unit, 
       target_value, threshold_green, frequency
FROM kpi_definitions
WHERE is_active = true
ORDER BY category, kpi_name;
```

### Check Forecast Scenarios
```sql
SELECT scenario_name, scenario_type, fiscal_year, 
       description, is_active
FROM forecast_scenarios
ORDER BY scenario_type;
```

## Usage Examples

### Full Setup (Fresh Start)
```bash
# 1. Truncate all tables
psql -U your_user -d postgres -f schema/99_truncate_all.sql

# 2. Create FP&A schema (if not exists)
psql -U your_user -d postgres -f schema/09_create_fpa_tables.sql

# 3. Generate operational data
cargo run -- --db-pgsql --db-name postgres --generate-sample-data --count 200

# 4. Generate FP&A data
cargo run -- --db-pgsql --db-name postgres --generate-fpa-data
```

### Add More FP&A Data (Existing Setup)
```bash
# Just regenerate FP&A data
cargo run -- --db-pgsql --db-name postgres --generate-fpa-data
```

## Data Volume Summary

| Table | Records Generated |
|-------|-------------------|
| cost_centers | 10 |
| budgets | ~192 (4 categories × 4 subcategories × 12 months) |
| actuals | ~400 (2 per sale: revenue + COGS) |
| expenses | 200 |
| kpi_definitions | 14 |
| forecast_scenarios | 3 |
| **Total** | **~819 records** |

## Next Steps

After generating data, you can:

1. **Build FP&A Dashboards** - Use the data for variance analysis, KPI tracking, etc.
2. **Add KPI Actuals** - Calculate and insert actual KPI values
3. **Create Forecast Data** - Add detailed forecasts to scenarios
4. **Add Variance Comments** - Document significant variances
5. **Generate Rolling Forecasts** - Create continuous forecast data

## Customization

### Change Fiscal Year
Edit `src/fpa_data_generation.rs`:
```rust
// In generate_all_fpa_data function
let fiscal_year = 2024; // Change this
```

### Adjust Budget Amounts
Edit the budget generation ranges in `generate_budgets()`:
```rust
let base_amount = match *category {
    "revenue" => (300000.0..600000.0).fake::<f64>(), // Increase range
    "cogs" => (150000.0..400000.0).fake::<f64>(),
    // ...
};
```

### Add More Expense Types
Edit the `expense_types` vector in `generate_expenses()`:
```rust
let expense_types = vec![
    ("payroll", 50000.0, 150000.0, true, "monthly"),
    ("your_new_type", min, max, is_recurring, frequency),
    // ...
];
```

## Troubleshooting

### Error: "Failed to fetch managers"
**Solution**: Generate employees first with `--generate-sample-data`

### Error: "Failed to fetch employee"
**Solution**: Ensure at least one employee exists in the database

### Error: "Failed to insert budget"
**Solution**: Check that cost_centers table exists and has data

### No actuals generated
**Solution**: Generate sales first - actuals are created from existing sales

## Advanced: Manual Data Entry

### Add Custom Budget
```sql
INSERT INTO budgets (fiscal_year, fiscal_quarter, fiscal_month, category, 
                     subcategory, department, budgeted_amount, status, created_by) 
VALUES (2023, 1, 1, 'revenue', 'custom_revenue', 'Sales', 100000.00, 'approved', 1);
```

### Add Custom KPI
```sql
INSERT INTO kpi_definitions (kpi_name, kpi_code, description, unit, 
                             target_value, threshold_red, threshold_yellow, 
                             threshold_green, category, frequency) 
VALUES ('Custom Metric', 'custom_metric', 'My custom KPI', 'percentage', 
        75.0, 50.0, 65.0, 75.0, 'custom', 'monthly');
```

### Record KPI Actual
```sql
INSERT INTO kpi_actuals (kpi_id, period_start, period_end, actual_value, 
                         target_value, variance, variance_percentage, status) 
VALUES (1, '2023-01-01', '2023-01-31', 1100000.00, 1000000.00, 
        100000.00, 10.00, 'green');
```

## Integration with Dashboards

Once data is generated, you can build:
- Budget Management Dashboard
- Variance Analysis Dashboard
- KPI Scorecard
- Forecast Comparison
- Cash Flow Projection
- Profitability Analysis

See `FPA_ENHANCEMENT_PLAN.md` for full dashboard specifications.
