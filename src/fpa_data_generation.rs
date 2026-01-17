// FP&A Data Generation Functions
// Generates realistic financial planning and analysis sample data

use postgres::Client;
use fake::{Fake, Faker};
use fake::faker::company::en::CompanyName;
use rust_decimal::Decimal;
use std::str::FromStr;
use chrono::{NaiveDate, Datelike};

/// Generate cost centers
pub fn generate_cost_centers(client: &mut Client, count: usize) -> Result<usize, String> {
    let mut inserted = 0;
    
    let departments = vec!["Sales", "Finance", "Marketing", "Operations", "IT", "HR"];
    let cost_center_types = vec!["Showroom", "Service", "Parts", "Admin", "Corporate"];
    
    // Get some employee IDs to assign as managers
    let manager_ids: Vec<i32> = client
        .query("SELECT employee_id FROM employees WHERE role IN ('Sales Manager', 'General Manager') LIMIT 20", &[])
        .map_err(|e| format!("Failed to fetch managers: {}", e))?
        .iter()
        .map(|row| row.get(0))
        .collect();
    
    for i in 0..count {
        let dept = departments[i % departments.len()];
        let cc_type = cost_center_types[i % cost_center_types.len()];
        let code = format!("CC-{:04}", i + 1);
        let name = format!("{} - {}", dept, cc_type);
        let manager_id = if !manager_ids.is_empty() {
            manager_ids[i % manager_ids.len()]
        } else {
            1
        };
        let budget_allocation = Decimal::from_str(&format!("{:.2}", (50000.0..500000.0).fake::<f64>()))
            .map_err(|e| format!("Failed to parse budget allocation: {}", e))?;
        
        client.execute(
            "INSERT INTO cost_centers (cost_center_code, cost_center_name, department, manager_id, budget_allocation, is_active) 
             VALUES ($1, $2, $3, $4, $5, $6)",
            &[&code, &name, &dept, &manager_id, &budget_allocation, &true]
        ).map_err(|e| format!("Failed to insert cost center: {}", e))?;
        
        inserted += 1;
    }
    
    Ok(inserted)
}

/// Generate budgets for a fiscal year
pub fn generate_budgets(client: &mut Client, fiscal_year: i32) -> Result<usize, String> {
    let mut inserted = 0;
    
    let categories = vec![
        ("revenue", vec!["vehicle_sales", "service_revenue", "parts_sales", "finance_income"]),
        ("cogs", vec!["vehicle_cost", "parts_cost", "direct_labor"]),
        ("operating_expenses", vec!["salaries", "rent", "utilities", "insurance", "marketing"]),
        ("marketing", vec!["digital_ads", "traditional_media", "events", "promotions"]),
    ];
    
    let departments = vec!["Sales", "Finance", "Marketing", "Operations", "IT", "HR"];
    
    // Get cost center IDs
    let cost_center_ids: Vec<i32> = client
        .query("SELECT cost_center_id FROM cost_centers WHERE is_active = true", &[])
        .map_err(|e| format!("Failed to fetch cost centers: {}", e))?
        .iter()
        .map(|row| row.get(0))
        .collect();
    
    // Get an employee ID for created_by
    let employee_id: i32 = client
        .query_one("SELECT employee_id FROM employees LIMIT 1", &[])
        .map_err(|e| format!("Failed to fetch employee: {}", e))?
        .get(0);
    
    // Create budget version
    client.execute(
        "INSERT INTO budget_versions (fiscal_year, version_number, version_name, is_current, created_by) 
         VALUES ($1, 1, 'Initial Budget', true, $2)",
        &[&fiscal_year, &employee_id]
    ).map_err(|e| format!("Failed to create budget version: {}", e))?;
    
    let version_id: i32 = client
        .query_one("SELECT version_id FROM budget_versions WHERE fiscal_year = $1 AND version_number = 1", &[&fiscal_year])
        .map_err(|e| format!("Failed to fetch version: {}", e))?
        .get(0);
    
    // Generate monthly budgets for each category
    for (category, subcategories) in &categories {
        for subcategory in subcategories {
            for month in 1..=12 {
                let quarter = ((month - 1) / 3) + 1;
                let dept = departments[(month - 1) % departments.len()];
                let cc_id = if !cost_center_ids.is_empty() {
                    Some(cost_center_ids[(month - 1) % cost_center_ids.len()])
                } else {
                    None
                };
                
                // Generate realistic budget amounts based on category
                let base_amount = match *category {
                    "revenue" => (200000.0..500000.0).fake::<f64>(),
                    "cogs" => (100000.0..300000.0).fake::<f64>(),
                    "operating_expenses" => (50000.0..150000.0).fake::<f64>(),
                    "marketing" => (10000.0..50000.0).fake::<f64>(),
                    _ => (10000.0..100000.0).fake::<f64>(),
                };
                
                let budgeted_amount = Decimal::from_str(&format!("{:.2}", base_amount))
                    .map_err(|e| format!("Failed to parse budget amount: {}", e))?;
                
                client.execute(
                    "INSERT INTO budgets (fiscal_year, fiscal_quarter, fiscal_month, category, subcategory, 
                     department, cost_center_id, budgeted_amount, status, created_by, budget_version_id) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'approved', $9, $10)",
                    &[&fiscal_year, &(quarter as i32), &(month as i32), category, subcategory, 
                      &dept, &cc_id, &budgeted_amount, &employee_id, &version_id]
                ).map_err(|e| format!("Failed to insert budget: {}", e))?;
                
                inserted += 1;
            }
        }
    }
    
    Ok(inserted)
}

/// Generate actuals from existing sales and expenses
pub fn generate_actuals_from_sales(client: &mut Client) -> Result<usize, String> {
    let mut inserted = 0;
    
    // Get all sales and create actuals
    let sales = client
        .query("SELECT sale_id, sale_date, sale_price, vehicle_id FROM sales", &[])
        .map_err(|e| format!("Failed to fetch sales: {}", e))?;
    
    for row in sales {
        let sale_id: i32 = row.get(0);
        let sale_date: NaiveDate = row.get(1);
        let sale_price: Decimal = row.get(2);
        let vehicle_id: i32 = row.get(3);
        
        let fiscal_year = sale_date.year();
        let fiscal_month = sale_date.month() as i32;
        let fiscal_quarter = ((fiscal_month - 1) / 3) + 1;
        
        // Get vehicle cost for COGS
        let vehicle_cost: Decimal = client
            .query_one("SELECT cost_price FROM vehicles WHERE vehicle_id = $1", &[&vehicle_id])
            .map_err(|e| format!("Failed to fetch vehicle cost: {}", e))?
            .get(0);
        
        // Insert revenue actual
        client.execute(
            "INSERT INTO actuals (transaction_date, fiscal_year, fiscal_quarter, fiscal_month, 
             category, subcategory, actual_amount, reference_type, reference_id) 
             VALUES ($1, $2, $3, $4, 'revenue', 'vehicle_sales', $5, 'sale', $6)",
            &[&sale_date, &fiscal_year, &fiscal_quarter, &fiscal_month, &sale_price, &sale_id]
        ).map_err(|e| format!("Failed to insert revenue actual: {}", e))?;
        inserted += 1;
        
        // Insert COGS actual
        client.execute(
            "INSERT INTO actuals (transaction_date, fiscal_year, fiscal_quarter, fiscal_month, 
             category, subcategory, actual_amount, reference_type, reference_id) 
             VALUES ($1, $2, $3, $4, 'cogs', 'vehicle_cost', $5, 'sale', $6)",
            &[&sale_date, &fiscal_year, &fiscal_quarter, &fiscal_month, &vehicle_cost, &sale_id]
        ).map_err(|e| format!("Failed to insert COGS actual: {}", e))?;
        inserted += 1;
    }
    
    Ok(inserted)
}

/// Generate operating expenses
pub fn generate_expenses(client: &mut Client, count: usize) -> Result<usize, String> {
    let mut inserted = 0;
    
    let expense_types = vec![
        ("payroll", 50000.0, 150000.0, true, "monthly"),
        ("rent", 10000.0, 30000.0, true, "monthly"),
        ("utilities", 2000.0, 8000.0, true, "monthly"),
        ("marketing", 5000.0, 50000.0, false, ""),
        ("insurance", 5000.0, 20000.0, true, "monthly"),
        ("maintenance", 1000.0, 10000.0, false, ""),
        ("supplies", 500.0, 5000.0, false, ""),
        ("professional_services", 2000.0, 20000.0, false, ""),
    ];
    
    let vendors = vec!["ABC Services", "XYZ Corp", "Local Utilities", "Insurance Co", "Marketing Agency"];
    
    // Get cost center IDs
    let cost_center_ids: Vec<i32> = client
        .query("SELECT cost_center_id FROM cost_centers WHERE is_active = true", &[])
        .map_err(|e| format!("Failed to fetch cost centers: {}", e))?
        .iter()
        .map(|row| row.get(0))
        .collect();
    
    // Get an approver
    let approver_id: i32 = client
        .query_one("SELECT employee_id FROM employees WHERE role = 'General Manager' LIMIT 1", &[])
        .map_err(|e| format!("Failed to fetch approver: {}", e))?
        .get(0);
    
    let start_date = NaiveDate::from_ymd_opt(2023, 1, 1).unwrap();
    let end_date = NaiveDate::from_ymd_opt(2023, 12, 31).unwrap();
    
    for i in 0..count {
        let (expense_type, min_amt, max_amt, is_recurring, frequency) = &expense_types[i % expense_types.len()];
        let vendor = vendors[i % vendors.len()];
        let cc_id = if !cost_center_ids.is_empty() {
            Some(cost_center_ids[i % cost_center_ids.len()])
        } else {
            None
        };
        
        let days_range = (end_date - start_date).num_days();
        let random_days = (0..days_range).fake::<i64>();
        let expense_date = start_date + chrono::Duration::days(random_days);
        
        let amount = Decimal::from_str(&format!("{:.2}", (*min_amt..*max_amt).fake::<f64>()))
            .map_err(|e| format!("Failed to parse expense amount: {}", e))?;
        
        let recurrence_freq = if *is_recurring { Some(*frequency) } else { None };
        
        client.execute(
            "INSERT INTO expenses (expense_date, expense_type, category, cost_center_id, amount, 
             vendor, is_recurring, recurrence_frequency, approved_by, status) 
             VALUES ($1, $2, 'operating_expenses', $3, $4, $5, $6, $7, $8, 'approved')",
            &[&expense_date, expense_type, &cc_id, &amount, &vendor, is_recurring, &recurrence_freq, &approver_id]
        ).map_err(|e| format!("Failed to insert expense: {}", e))?;
        
        inserted += 1;
    }
    
    Ok(inserted)
}

/// Generate KPI definitions
pub fn generate_kpi_definitions(client: &mut Client) -> Result<usize, String> {
    let kpis = vec![
        // Financial KPIs
        ("Total Revenue", "total_revenue", "Sum of all revenue", "currency", 1000000.0, 800000.0, 900000.0, 1000000.0, "financial", "monthly"),
        ("Gross Profit Margin", "gross_margin", "Revenue - COGS / Revenue * 100", "percentage", 25.0, 15.0, 20.0, 25.0, "financial", "monthly"),
        ("Net Profit Margin", "net_margin", "Net Income / Revenue * 100", "percentage", 10.0, 5.0, 8.0, 10.0, "financial", "monthly"),
        ("Operating Expense Ratio", "opex_ratio", "Operating Expenses / Revenue * 100", "percentage", 20.0, 25.0, 22.0, 20.0, "financial", "monthly"),
        
        // Sales KPIs
        ("Sales Volume", "sales_volume", "Number of vehicles sold", "count", 50.0, 30.0, 40.0, 50.0, "sales", "monthly"),
        ("Average Deal Size", "avg_deal_size", "Average sale price per vehicle", "currency", 40000.0, 30000.0, 35000.0, 40000.0, "sales", "monthly"),
        ("Sales Conversion Rate", "conversion_rate", "Sales / Leads * 100", "percentage", 25.0, 15.0, 20.0, 25.0, "sales", "monthly"),
        ("Sales per Employee", "sales_per_employee", "Total sales / number of sales employees", "currency", 200000.0, 150000.0, 175000.0, 200000.0, "sales", "monthly"),
        
        // Inventory KPIs
        ("Inventory Turnover", "inventory_turnover", "COGS / Average Inventory", "ratio", 8.0, 4.0, 6.0, 8.0, "inventory", "monthly"),
        ("Days in Inventory", "days_in_inventory", "Average days vehicles sit before sale", "days", 30.0, 60.0, 45.0, 30.0, "inventory", "monthly"),
        ("Inventory Value", "inventory_value", "Total value of available inventory", "currency", 2000000.0, 1500000.0, 1750000.0, 2000000.0, "inventory", "monthly"),
        
        // Customer KPIs
        ("Customer Lifetime Value", "customer_ltv", "Average revenue per customer over lifetime", "currency", 50000.0, 30000.0, 40000.0, 50000.0, "customer", "quarterly"),
        ("Customer Retention Rate", "retention_rate", "Repeat customers / total customers * 100", "percentage", 30.0, 15.0, 22.0, 30.0, "customer", "quarterly"),
        ("Net Promoter Score", "nps", "Customer satisfaction score", "number", 50.0, 20.0, 35.0, 50.0, "customer", "quarterly"),
    ];
    
    let mut inserted = 0;
    
    for (name, code, desc, unit, target, red, yellow, green, category, frequency) in kpis {
        let target_dec = Decimal::from_str(&format!("{:.2}", target))
            .map_err(|e| format!("Failed to parse target: {}", e))?;
        let red_dec = Decimal::from_str(&format!("{:.2}", red))
            .map_err(|e| format!("Failed to parse red threshold: {}", e))?;
        let yellow_dec = Decimal::from_str(&format!("{:.2}", yellow))
            .map_err(|e| format!("Failed to parse yellow threshold: {}", e))?;
        let green_dec = Decimal::from_str(&format!("{:.2}", green))
            .map_err(|e| format!("Failed to parse green threshold: {}", e))?;
        
        client.execute(
            "INSERT INTO kpi_definitions (kpi_name, kpi_code, description, unit, target_value, 
             threshold_red, threshold_yellow, threshold_green, category, frequency, is_active) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)",
            &[&name, &code, &desc, &unit, &target_dec, &red_dec, &yellow_dec, &green_dec, &category, &frequency]
        ).map_err(|e| format!("Failed to insert KPI definition: {}", e))?;
        
        inserted += 1;
    }
    
    Ok(inserted)
}

/// Generate forecast scenarios
pub fn generate_forecast_scenarios(client: &mut Client, fiscal_year: i32) -> Result<usize, String> {
    let scenarios = vec![
        ("Best Case Scenario", "best_case", "Optimistic projections with 20% growth"),
        ("Most Likely Scenario", "most_likely", "Realistic projections with 10% growth"),
        ("Worst Case Scenario", "worst_case", "Conservative projections with 5% decline"),
    ];
    
    let employee_id: i32 = client
        .query_one("SELECT employee_id FROM employees LIMIT 1", &[])
        .map_err(|e| format!("Failed to fetch employee: {}", e))?
        .get(0);
    
    let mut inserted = 0;
    
    for (name, stype, desc) in scenarios {
        client.execute(
            "INSERT INTO forecast_scenarios (scenario_name, scenario_type, fiscal_year, description, 
             created_by, is_active) 
             VALUES ($1, $2, $3, $4, $5, true)",
            &[&name, &stype, &fiscal_year, &desc, &employee_id]
        ).map_err(|e| format!("Failed to insert forecast scenario: {}", e))?;
        
        inserted += 1;
    }
    
    Ok(inserted)
}

pub fn generate_forecast_data(client: &mut Client, fiscal_year: i32) -> Result<usize, String> {
    use rand::Rng;
    
    // Get all scenarios for this fiscal year
    let scenarios = client
        .query("SELECT scenario_id, scenario_type FROM forecast_scenarios WHERE fiscal_year = $1", &[&fiscal_year])
        .map_err(|e| format!("Failed to query scenarios: {}", e))?;
    
    if scenarios.is_empty() {
        return Err("No forecast scenarios found. Run generate_forecast_scenarios first.".to_string());
    }
    
    // Get budget data as baseline
    let budget_data = client
        .query("
            SELECT 
                fiscal_month,
                category,
                department,
                COALESCE(SUM(budgeted_amount), 0) as amount
            FROM budgets
            WHERE fiscal_year = $1 AND status = 'approved'
            GROUP BY fiscal_month, category, department
        ", &[&fiscal_year])
        .map_err(|e| format!("Failed to query budget data: {}", e))?;
    
    let mut rng = rand::thread_rng();
    let mut inserted = 0;
    
    for scenario_row in scenarios {
        let scenario_id: i32 = scenario_row.get(0);
        let scenario_type: String = scenario_row.get(1);
        
        // Determine adjustment factor based on scenario type
        let (revenue_factor, expense_factor) = match scenario_type.as_str() {
            "best_case" => (1.20, 0.95),      // +20% revenue, -5% expenses
            "most_likely" => (1.10, 1.05),    // +10% revenue, +5% expenses
            "worst_case" => (0.95, 1.15),     // -5% revenue, +15% expenses
            _ => (1.0, 1.0),
        };
        
        for budget_row in &budget_data {
            let fiscal_month: i32 = budget_row.get(0);
            let category: String = budget_row.get(1);
            let department: String = budget_row.get(2);
            let budget_dec: Decimal = budget_row.get(3);
            let budget_amount: f64 = budget_dec.to_string().parse().unwrap_or(0.0);
            
            // Apply adjustment with some random variation
            let variation = rng.gen_range(0.95..1.05);
            let factor = if category == "revenue" { revenue_factor } else { expense_factor };
            let forecasted_amount = budget_amount * factor * variation;
            
            let forecast_dec = Decimal::from_str(&format!("{:.2}", forecasted_amount))
                .map_err(|e| format!("Failed to parse forecast amount: {}", e))?;
            
            // Create a forecast date (first day of the month)
            let forecast_date = chrono::NaiveDate::from_ymd_opt(fiscal_year, fiscal_month as u32, 1)
                .ok_or_else(|| format!("Invalid date: {}-{}-01", fiscal_year, fiscal_month))?;
            
            // Calculate quarter
            let fiscal_quarter = ((fiscal_month - 1) / 3) + 1;
            
            client.execute(
                "INSERT INTO forecast_data 
                 (scenario_id, forecast_date, fiscal_year, fiscal_quarter, fiscal_month, 
                  category, department, forecasted_amount, confidence_level)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
                &[
                    &scenario_id,
                    &forecast_date,
                    &fiscal_year,
                    &fiscal_quarter,
                    &fiscal_month,
                    &category,
                    &department,
                    &forecast_dec,
                    &"medium",
                ],
            ).map_err(|e| format!("Failed to insert forecast data: {}", e))?;
            
            inserted += 1;
        }
    }
    
    Ok(inserted)
}

pub fn generate_rolling_forecasts(client: &mut Client) -> Result<usize, String> {
    use chrono::{Datelike, Duration};
    use rand::Rng;
    
    let mut rng = rand::thread_rng();
    let mut inserted = 0;
    
    // Get budget data as baseline for forecasting
    let categories = client
        .query("
            SELECT DISTINCT category, department 
            FROM budgets 
            WHERE fiscal_year = 2023 AND status = 'approved'
        ", &[])
        .map_err(|e| format!("Failed to query categories: {}", e))?;
    
    if categories.is_empty() {
        return Err("No budget data found. Run budget generation first.".to_string());
    }
    
    let today = chrono::Local::now().naive_local().date();
    
    // Generate rolling forecasts for the past 6 months (simulating historical forecasts)
    // For each historical month, we create a 12-month forward forecast
    for months_ago in (0..6).rev() {
        let forecast_created_date = today - Duration::days((months_ago * 30) as i64);
        // Convert date to datetime at midnight for TIMESTAMP field
        let forecast_created = forecast_created_date.and_hms_opt(0, 0, 0).unwrap();
        
        // For each category, create 12 months of forecasts
        for cat_row in &categories {
            let category: String = cat_row.get(0);
            let department: String = cat_row.get(1);
            
            // Get average monthly budget for this category
            let avg_budget_result = client
                .query_one("
                    SELECT COALESCE(AVG(budgeted_amount), 0)
                    FROM budgets
                    WHERE category = $1 AND department = $2 
                      AND fiscal_year = 2023 AND status = 'approved'
                ", &[&category, &department])
                .map_err(|e| format!("Failed to query avg budget: {}", e))?;
            
            let avg_decimal: Decimal = avg_budget_result.get(0);
            let avg_budget: f64 = avg_decimal.to_string().parse().unwrap_or(0.0);
            
            if avg_budget == 0.0 {
                continue;
            }
            
            // Generate 12 months forward from the forecast creation date
            for month_offset in 0..12 {
                let forecast_period = forecast_created_date + Duration::days((month_offset * 30) as i64);
                let period_start = chrono::NaiveDate::from_ymd_opt(
                    forecast_period.year(),
                    forecast_period.month(),
                    1
                ).unwrap_or(forecast_period);
                
                // Add growth trend and seasonality
                let growth_factor = 1.0 + (month_offset as f64 * 0.005); // 0.5% monthly growth
                let seasonality = 1.0 + ((month_offset as f64 * 0.5).sin() * 0.1); // ±10% seasonal variation
                let random_var = rng.gen_range(0.95..1.05);
                
                let forecasted_value = avg_budget * growth_factor * seasonality * random_var;
                let forecast_dec = Decimal::from_str(&format!("{:.2}", forecasted_value))
                    .map_err(|e| format!("Failed to parse forecast: {}", e))?;
                
                // If this period is in the past, we can add actual values and variance
                let (actual_value, actual_recorded_date, variance, variance_pct) = if period_start < today {
                    // Get actual from actuals table if it exists
                    let actual_result = client
                        .query_opt("
                            SELECT COALESCE(SUM(actual_amount), 0)
                            FROM actuals
                            WHERE category = $1 
                              AND department = $2
                              AND EXTRACT(YEAR FROM transaction_date) = $3
                              AND EXTRACT(MONTH FROM transaction_date) = $4
                        ", &[&category, &department, &(period_start.year() as i32), &(period_start.month() as i32)])
                        .ok()
                        .flatten();
                    
                    if let Some(actual_row) = actual_result {
                        let actual_dec: Decimal = actual_row.get(0);
                        let actual: f64 = actual_dec.to_string().parse().unwrap_or(0.0);
                        
                        if actual > 0.0 {
                            let var = actual - forecasted_value;
                            let var_pct = if forecasted_value > 0.0 {
                                (var / forecasted_value) * 100.0
                            } else {
                                0.0
                            };
                            
                            let actual_dec = Decimal::from_str(&format!("{:.2}", actual))
                                .map_err(|e| format!("Failed to parse actual: {}", e))?;
                            let var_dec = Decimal::from_str(&format!("{:.2}", var))
                                .map_err(|e| format!("Failed to parse variance: {}", e))?;
                            let var_pct_dec = Decimal::from_str(&format!("{:.2}", var_pct))
                                .map_err(|e| format!("Failed to parse var %: {}", e))?;
                            
                            // Convert period_start (DATE) to TIMESTAMP at midnight
                            let actual_recorded_datetime = period_start.and_hms_opt(0, 0, 0).unwrap();
                            
                            (Some(actual_dec), Some(actual_recorded_datetime), Some(var_dec), Some(var_pct_dec))
                        } else {
                            (None, None, None, None)
                        }
                    } else {
                        (None, None, None, None)
                    }
                } else {
                    (None, None, None, None)
                };
                
                // Insert rolling forecast
                // Match on options to pass the right reference types
                match (actual_value.as_ref(), variance.as_ref(), variance_pct.as_ref(), actual_recorded_date.as_ref()) {
                    (Some(act), Some(var), Some(var_pct), Some(act_date)) => {
                        client.execute(
                            "INSERT INTO rolling_forecasts 
                             (forecast_period, category, department, forecasted_value, 
                              actual_value, variance, variance_percentage,
                              forecast_created_date, actual_recorded_date)
                             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
                            &[&period_start, &category, &department, &forecast_dec, act, var, var_pct, &forecast_created, act_date],
                        )
                    },
                    _ => {
                        client.execute(
                            "INSERT INTO rolling_forecasts 
                             (forecast_period, category, department, forecasted_value, 
                              actual_value, variance, variance_percentage,
                              forecast_created_date, actual_recorded_date)
                             VALUES ($1, $2, $3, $4, NULL, NULL, NULL, $5, NULL)",
                            &[&period_start, &category, &department, &forecast_dec, &forecast_created],
                        )
                    }
                }.map_err(|e| format!("Failed to insert rolling forecast for {} {}: {}", category, period_start, e))?;
                
                inserted += 1;
            }
        }
    }
    
    Ok(inserted)
}

pub fn generate_kpi_actuals(client: &mut Client) -> Result<usize, String> {
    use chrono::Duration;
    use rand::Rng;
    
    // Get all active KPI definitions
    let kpis = client
        .query("
            SELECT kpi_id, kpi_name, target_value, threshold_green, threshold_yellow, threshold_red
            FROM kpi_definitions
            WHERE is_active = true
        ", &[])
        .map_err(|e| format!("Failed to query KPI definitions: {}", e))?;
    
    if kpis.is_empty() {
        return Err("No KPI definitions found. Run generate_kpi_definitions first.".to_string());
    }
    
    let mut rng = rand::thread_rng();
    let mut inserted = 0;
    
    // Generate 12 months of historical data
    let today = chrono::Local::now().naive_local().date();
    
    for kpi_row in kpis {
        let kpi_id: i32 = kpi_row.get(0);
        let kpi_name: String = kpi_row.get(1);
        let target_decimal: Decimal = kpi_row.get(2);
        let target: f64 = target_decimal.to_string().parse().unwrap_or(0.0);
        let green_decimal: Decimal = kpi_row.get(3);
        let threshold_green: f64 = green_decimal.to_string().parse().unwrap_or(0.0);
        let yellow_decimal: Decimal = kpi_row.get(4);
        let threshold_yellow: f64 = yellow_decimal.to_string().parse().unwrap_or(0.0);
        let red_decimal: Decimal = kpi_row.get(5);
        let threshold_red: f64 = red_decimal.to_string().parse().unwrap_or(0.0);
        
        // Determine if higher is better based on thresholds
        let is_higher_better = threshold_green >= threshold_yellow;
        
        // Generate data for last 12 months
        for months_ago in (0..12).rev() {
            let period_date = today - Duration::days((months_ago * 30) as i64);
            
            // Create some variation in performance over time
            let time_factor = 1.0 - (months_ago as f64 * 0.02); // Gradual improvement
            
            // Decide performance tier for this KPI
            let performance_roll: f64 = rng.gen_range(0.0..1.0);
            
            let actual_value = if is_higher_better {
                // Higher is better - generate values around thresholds
                if performance_roll < 0.5 {
                    // On track - above green threshold
                    let range = (threshold_green - threshold_yellow).max(target * 0.1);
                    threshold_green + rng.gen_range(0.0..range) * time_factor
                } else if performance_roll < 0.8 {
                    // At risk - between yellow and green
                    threshold_yellow + rng.gen_range(0.0..(threshold_green - threshold_yellow))
                } else {
                    // Off track - below yellow
                    threshold_red + rng.gen_range(0.0..(threshold_yellow - threshold_red).max(threshold_yellow * 0.2))
                }
            } else {
                // Lower is better - generate values around thresholds
                if performance_roll < 0.5 {
                    // On track - below green threshold
                    let range = (threshold_yellow - threshold_green).max(target * 0.1);
                    threshold_green - rng.gen_range(0.0..range) * time_factor
                } else if performance_roll < 0.8 {
                    // At risk - between green and yellow
                    threshold_green + rng.gen_range(0.0..(threshold_yellow - threshold_green))
                } else {
                    // Off track - above yellow
                    threshold_yellow + rng.gen_range(0.0..(threshold_red - threshold_yellow).max(threshold_yellow * 0.2))
                }
            };
            
            // Ensure non-negative values
            let actual_value = actual_value.max(0.0);
            
            let value_decimal = Decimal::from_str(&format!("{:.2}", actual_value))
                .map_err(|e| format!("Failed to parse actual value: {}", e))?;
            
            // Calculate period end (end of month)
            let period_start = period_date.with_day(1).unwrap_or(period_date);
            let next_month = if period_start.month() == 12 {
                chrono::NaiveDate::from_ymd_opt(period_start.year() + 1, 1, 1)
            } else {
                chrono::NaiveDate::from_ymd_opt(period_start.year(), period_start.month() + 1, 1)
            };
            let period_end = next_month.unwrap_or(period_date) - Duration::days(1);
            
            // Insert KPI actual
            client
                .execute(
                    "INSERT INTO kpi_actuals (kpi_id, period_start, period_end, actual_value, notes)
                     VALUES ($1, $2, $3, $4, $5)",
                    &[
                        &kpi_id,
                        &period_start,
                        &period_end,
                        &value_decimal,
                        &format!("Generated sample data for {}", kpi_name),
                    ],
                )
                .map_err(|e| format!("Failed to insert KPI actual for {} on {:?}: {:?}", kpi_name, period_start, e))?;
            
            inserted += 1;
        }
    }
    
    Ok(inserted)
}

/// Generate all FP&A sample data
pub fn generate_all_fpa_data(client: &mut Client, fiscal_year: i32) -> Result<(), String> {
    println!("Generating FP&A sample data...");
    
    // Check if FP&A tables exist
    let table_check = client
        .query("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cost_centers')", &[])
        .map_err(|e| format!("Failed to check for FP&A tables: {}", e))?;
    
    let tables_exist: bool = table_check[0].get(0);
    if !tables_exist {
        return Err("FP&A tables don't exist! Please run: psql -U your_user -d postgres -f schema/09_create_fpa_tables.sql".to_string());
    }
    
    // 1. Cost Centers
    let cc_count = generate_cost_centers(client, 10)?;
    println!("Generated {} cost centers", cc_count);
    
    // 2. Budgets
    let budget_count = generate_budgets(client, fiscal_year)?;
    println!("Generated {} budget line items", budget_count);
    
    // 3. Actuals from sales
    let actual_count = generate_actuals_from_sales(client)?;
    println!("Generated {} actual transactions", actual_count);
    
    // 4. Expenses
    let expense_count = generate_expenses(client, 200)?;
    println!("Generated {} expenses", expense_count);
    
    // 5. KPI Definitions
    let kpi_count = generate_kpi_definitions(client)?;
    println!("Generated {} KPI definitions", kpi_count);
    
    // 6. KPI Actuals (12 months of historical data)
    let kpi_actual_count = generate_kpi_actuals(client)?;
    println!("Generated {} KPI actual records", kpi_actual_count);
    
    // 7. Forecast Scenarios
    let scenario_count = generate_forecast_scenarios(client, fiscal_year)?;
    println!("Generated {} forecast scenarios", scenario_count);
    
    // 8. Forecast Data
    let forecast_data_count = generate_forecast_data(client, fiscal_year)?;
    println!("Generated {} forecast data records", forecast_data_count);
    
    // 9. Rolling Forecasts
    let rolling_forecast_count = generate_rolling_forecasts(client)?;
    println!("Generated {} rolling forecast records", rolling_forecast_count);
    
    println!("FP&A data generation complete!");
    
    Ok(())
}
