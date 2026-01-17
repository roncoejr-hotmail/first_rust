use axum::{
    extract::{State, Query},
    http::StatusCode,
    response::Json,
    routing::get,
    Router,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use postgres_native_tls::MakeTlsConnector;
use rust_decimal::Decimal;

// Shared application state
#[derive(Clone)]
pub struct AppState {
    pub db_name: String,
}

// Filter parameters
#[derive(Debug, Deserialize)]
pub struct DateRangeFilter {
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SalesFilters {
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub vehicle_type: Option<String>,
    pub employee_id: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct InventoryFilters {
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub vehicle_type: Option<String>,
    pub status: Option<String>,
    pub search: Option<String>,
}

// Executive Overview Response
#[derive(Debug, Serialize, Deserialize)]
pub struct ExecutiveOverview {
    pub total_revenue: f64,
    pub total_sales: i64,
    pub total_vehicles: i64,
    pub available_vehicles: i64,
    pub total_customers: i64,
    pub total_employees: i64,
    pub active_loans: i64,
    pub loan_portfolio_value: f64,
    pub average_sale_price: f64,
    pub revenue_by_month: Vec<MonthlyRevenue>,
    pub sales_by_payment_method: Vec<PaymentMethodStat>,
    pub top_selling_types: Vec<VehicleTypeStat>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MonthlyRevenue {
    pub month: String,
    pub revenue: f64,
    pub sales_count: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PaymentMethodStat {
    pub method: String,
    pub count: i32,
    pub total_value: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VehicleTypeStat {
    pub vehicle_type: String,
    pub count: i32,
    pub total_revenue: f64,
}

// Helper function to get async database connection
async fn get_db_client(db_name: &str) -> Result<tokio_postgres::Client, String> {
    let (host, port, username, password) = crate::utils::read_pgpass(db_name)
        .ok_or_else(|| "Failed to read .pgpass".to_string())?;
    
    let connection_string = format!("postgresql://{}:{}@{}:{}/{}", 
                                     username, password, host, port, db_name);
    
    let tls = native_tls::TlsConnector::builder()
        .danger_accept_invalid_certs(true)
        .build()
        .map_err(|e| format!("TLS error: {}", e))?;
    
    let connector = MakeTlsConnector::new(tls);
    
    let (client, connection) = tokio_postgres::connect(&connection_string, connector)
        .await
        .map_err(|e| format!("Connection error: {}", e))?;
    
    // Spawn connection handler
    tokio::spawn(async move {
        if let Err(e) = connection.await {
            eprintln!("Connection error: {}", e);
        }
    });
    
    Ok(client)
}

// Handler for executive overview
async fn get_executive_overview(
    State(state): State<Arc<AppState>>,
    Query(filters): Query<DateRangeFilter>,
) -> Result<Json<ExecutiveOverview>, (StatusCode, String)> {
    let client = get_db_client(&state.db_name)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
    
    // Build date filter SQL
    let date_filter = if filters.start_date.is_some() || filters.end_date.is_some() {
        let mut conditions = Vec::new();
        if let Some(start) = &filters.start_date {
            conditions.push(format!("sale_date >= '{}'", start));
        }
        if let Some(end) = &filters.end_date {
            conditions.push(format!("sale_date <= '{}'", end));
        }
        format!("WHERE {}", conditions.join(" AND "))
    } else {
        String::new()
    };
    
    // Get total revenue
    let revenue_query = format!("SELECT COALESCE(SUM(sale_price), 0) as total FROM sales {}", date_filter);
    let revenue_row = client
        .query_one(&revenue_query, &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;
    let total_revenue: Decimal = revenue_row.get(0);
    let total_revenue: f64 = total_revenue.to_string().parse().unwrap_or(0.0);
    
    // Get total sales count
    let sales_query = format!("SELECT COUNT(*) as count FROM sales {}", date_filter);
    let sales_row = client
        .query_one(&sales_query, &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;
    let total_sales: i64 = sales_row.get(0);
    
    // Get vehicle counts
    let vehicles_row = client
        .query_one("SELECT COUNT(*) as total, SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available FROM vehicles", &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;
    let total_vehicles: i64 = vehicles_row.get(0);
    let available_vehicles: i64 = vehicles_row.get(1);
    
    // Get customer count
    let customers_row = client
        .query_one("SELECT COUNT(*) as count FROM customers", &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;
    let total_customers: i64 = customers_row.get(0);
    
    // Get employee count
    let employees_row = client
        .query_one("SELECT COUNT(*) as count FROM employees", &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;
    let total_employees: i64 = employees_row.get(0);
    
    // Get active loans count and value
    let loans_row = client
        .query_one("SELECT COUNT(*) as count, COALESCE(SUM(remaining_balance), 0) as total FROM loans WHERE loan_status = 'active'", &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;
    let active_loans: i64 = loans_row.get(0);
    let loan_portfolio_value_decimal: Decimal = loans_row.get(1);
    let loan_portfolio_value: f64 = loan_portfolio_value_decimal.to_string().parse().unwrap_or(0.0);
    
    // Get average sale price
    let avg_query = format!("SELECT COALESCE(AVG(sale_price), 0) as avg FROM sales {}", date_filter);
    let avg_row = client
        .query_one(&avg_query, &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;
    let average_sale_price_decimal: Decimal = avg_row.get(0);
    let average_sale_price: f64 = average_sale_price_decimal.to_string().parse().unwrap_or(0.0);
    
    // Get revenue by month
    let monthly_query = format!("
        SELECT 
            TO_CHAR(sale_date, 'YYYY-MM') as month,
            SUM(sale_price) as revenue,
            COUNT(*) as count
        FROM sales
        {}
        GROUP BY TO_CHAR(sale_date, 'YYYY-MM')
        ORDER BY month DESC
        LIMIT 12
    ", date_filter);
    let monthly_rows = client
        .query(&monthly_query, &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;
    
    let mut revenue_by_month = Vec::new();
    for row in monthly_rows {
        let month: String = row.get(0);
        let revenue_decimal: Decimal = row.get(1);
        let revenue: f64 = revenue_decimal.to_string().parse().unwrap_or(0.0);
        let sales_count: i64 = row.get(2);
        revenue_by_month.push(MonthlyRevenue {
            month,
            revenue,
            sales_count: sales_count as i32,
        });
    }
    revenue_by_month.reverse();
    
    // Get sales by payment method
    let payment_query = format!("
        SELECT 
            payment_method,
            COUNT(*) as count,
            SUM(sale_price) as total
        FROM sales
        {}
        GROUP BY payment_method
        ORDER BY count DESC
    ", date_filter);
    let payment_rows = client
        .query(&payment_query, &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;
    
    let mut sales_by_payment_method = Vec::new();
    for row in payment_rows {
        let method: String = row.get(0);
        let count: i64 = row.get(1);
        let total_decimal: Decimal = row.get(2);
        let total_value: f64 = total_decimal.to_string().parse().unwrap_or(0.0);
        sales_by_payment_method.push(PaymentMethodStat {
            method,
            count: count as i32,
            total_value,
        });
    }
    
    // Get top selling vehicle types
    let types_query = format!("
        SELECT 
            v.vehicle_type,
            COUNT(*) as count,
            SUM(s.sale_price) as revenue
        FROM sales s
        JOIN vehicles v ON s.vehicle_id = v.vehicle_id
        {}
        GROUP BY v.vehicle_type
        ORDER BY count DESC
        LIMIT 5
    ", date_filter);
    let types_rows = client
        .query(&types_query, &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;
    
    let mut top_selling_types = Vec::new();
    for row in types_rows {
        let vehicle_type: String = row.get(0);
        let count: i64 = row.get(1);
        let revenue_decimal: Decimal = row.get(2);
        let total_revenue: f64 = revenue_decimal.to_string().parse().unwrap_or(0.0);
        top_selling_types.push(VehicleTypeStat {
            vehicle_type,
            count: count as i32,
            total_revenue,
        });
    }
    
    Ok(Json(ExecutiveOverview {
        total_revenue,
        total_sales,
        total_vehicles,
        available_vehicles,
        total_customers,
        total_employees,
        active_loans,
        loan_portfolio_value,
        average_sale_price,
        revenue_by_month,
        sales_by_payment_method,
        top_selling_types,
    }))
}

// Sales Performance Response
#[derive(Debug, Serialize, Deserialize)]
pub struct SalesPerformance {
    pub total_sales_count: i64,
    pub total_revenue: f64,
    pub total_commission_paid: f64,
    pub average_deal_size: f64,
    pub top_performers: Vec<SalespersonPerformance>,
    pub sales_by_month: Vec<MonthlySalesPerformance>,
    pub sales_by_payment_method: Vec<PaymentMethodBreakdown>,
    pub sales_by_vehicle_type: Vec<VehicleTypeBreakdown>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SalespersonPerformance {
    pub employee_id: i32,
    pub name: String,
    pub role: String,
    pub total_sales: i32,
    pub total_revenue: f64,
    pub commission_earned: f64,
    pub average_sale_price: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MonthlySalesPerformance {
    pub month: String,
    pub sales_count: i32,
    pub revenue: f64,
    pub average_deal_size: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PaymentMethodBreakdown {
    pub method: String,
    pub count: i32,
    pub total_value: f64,
    pub percentage: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VehicleTypeBreakdown {
    pub vehicle_type: String,
    pub count: i32,
    pub total_revenue: f64,
    pub average_price: f64,
}

// Inventory Management Response
#[derive(Debug, Serialize, Deserialize)]
pub struct InventoryOverview {
    pub total_vehicles: i64,
    pub available_vehicles: i64,
    pub sold_vehicles: i64,
    pub total_inventory_value: f64,
    pub average_days_in_inventory: f64,
    pub vehicles_by_type: Vec<InventoryByType>,
    pub cost_vs_price_analysis: Vec<CostPriceAnalysis>,
    pub recent_vehicles: Vec<VehicleDetail>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InventoryByType {
    pub vehicle_type: String,
    pub available: i32,
    pub sold: i32,
    pub total: i32,
    pub total_value: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CostPriceAnalysis {
    pub vehicle_type: String,
    pub avg_cost: f64,
    pub avg_sale_price: f64,
    pub avg_markup_percentage: f64,
    pub count: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VehicleDetail {
    pub vehicle_id: i32,
    pub vin: String,
    pub make: String,
    pub model: String,
    pub year: i32,
    pub vehicle_type: String,
    pub color: String,
    pub mileage: i32,
    pub cost_price: f64,
    pub status: String,
    pub days_in_inventory: i32,
}

// Finance & Loan Management Response
#[derive(Debug, Serialize, Deserialize)]
pub struct FinanceOverview {
    pub total_loans: i64,
    pub active_loans: i64,
    pub total_loan_value: f64,
    pub outstanding_balance: f64,
    pub total_interest_revenue: f64,
    pub average_interest_rate: f64,
    pub payment_collection_rate: f64,
    pub loans_by_status: Vec<LoanStatusStat>,
    pub monthly_payment_trends: Vec<MonthlyPaymentTrend>,
    pub top_loans_by_balance: Vec<LoanDetail>,
    pub late_payment_analysis: LatePaymentStats,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LoanStatusStat {
    pub status: String,
    pub count: i32,
    pub total_value: f64,
    pub percentage: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MonthlyPaymentTrend {
    pub month: String,
    pub total_payments: f64,
    pub payment_count: i32,
    pub principal_paid: f64,
    pub interest_paid: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LoanDetail {
    pub loan_id: i32,
    pub customer_name: String,
    pub vehicle_info: String,
    pub loan_amount: f64,
    pub remaining_balance: f64,
    pub interest_rate: f64,
    pub monthly_payment: f64,
    pub term_months: i32,
    pub loan_status: String,
    pub loan_start_date: String,
    pub days_active: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LatePaymentStats {
    pub total_late_payments: i32,
    pub total_late_fees: f64,
    pub loans_at_risk: i32,
    pub average_days_late: f64,
}

// Customer Analytics Response
#[derive(Debug, Serialize, Deserialize)]
pub struct CustomerAnalytics {
    pub total_customers: i64,
    pub active_customers: i64,
    pub repeat_customers: i64,
    pub average_credit_score: f64,
    pub total_customer_lifetime_value: f64,
    pub average_customer_value: f64,
    pub customers_by_state: Vec<StateDistribution>,
    pub credit_score_distribution: Vec<CreditScoreBucket>,
    pub top_customers: Vec<TopCustomer>,
    pub customer_acquisition_trend: Vec<AcquisitionTrend>,
    pub age_demographics: Vec<AgeDemographic>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StateDistribution {
    pub state: String,
    pub customer_count: i32,
    pub total_purchases: f64,
    pub average_credit_score: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreditScoreBucket {
    pub score_range: String,
    pub count: i32,
    pub percentage: f64,
    pub avg_purchase_value: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TopCustomer {
    pub customer_id: i32,
    pub customer_name: String,
    pub email: String,
    pub state: String,
    pub total_purchases: f64,
    pub purchase_count: i32,
    pub credit_score: i32,
    pub first_purchase_date: String,
    pub last_purchase_date: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AcquisitionTrend {
    pub month: String,
    pub new_customers: i32,
    pub total_purchases: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AgeDemographic {
    pub age_range: String,
    pub count: i32,
    pub percentage: f64,
    pub avg_credit_score: f64,
}

// Maintenance Analytics Response
#[derive(Debug, Serialize, Deserialize)]
pub struct MaintenanceAnalytics {
    pub total_maintenance_records: i64,
    pub total_maintenance_cost: f64,
    pub average_maintenance_cost: f64,
    pub vehicles_serviced: i64,
    pub most_common_service: String,
    pub maintenance_by_type: Vec<MaintenanceByType>,
    pub maintenance_cost_trend: Vec<MaintenanceCostTrend>,
    pub top_vehicles_by_cost: Vec<VehicleMaintenanceSummary>,
    pub recent_maintenance: Vec<MaintenanceRecord>,
    pub service_provider_stats: Vec<ServiceProviderStat>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MaintenanceByType {
    pub service_type: String,
    pub count: i32,
    pub total_cost: f64,
    pub average_cost: f64,
    pub percentage: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MaintenanceCostTrend {
    pub month: String,
    pub total_cost: f64,
    pub service_count: i32,
    pub average_cost: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VehicleMaintenanceSummary {
    pub vehicle_id: i32,
    pub vin: String,
    pub vehicle_info: String,
    pub total_maintenance_cost: f64,
    pub service_count: i32,
    pub last_service_date: String,
    pub last_service_type: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MaintenanceRecord {
    pub maintenance_id: i32,
    pub vehicle_id: i32,
    pub vehicle_info: String,
    pub service_date: String,
    pub service_type: String,
    pub mileage_at_service: i32,
    pub service_provider: String,
    pub cost: f64,
    pub description: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ServiceProviderStat {
    pub service_provider: String,
    pub service_count: i32,
    pub total_cost: f64,
    pub average_cost: f64,
}

// Employee Performance Response
#[derive(Debug, Serialize, Deserialize)]
pub struct EmployeePerformance {
    pub total_employees: i64,
    pub active_employees: i64,
    pub total_commission_paid: f64,
    pub average_commission_rate: f64,
    pub top_performers: Vec<EmployeeStats>,
    pub performance_by_role: Vec<RolePerformance>,
    pub monthly_performance: Vec<MonthlyEmployeePerformance>,
    pub employee_list: Vec<EmployeeDetail>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EmployeeStats {
    pub employee_id: i32,
    pub employee_name: String,
    pub role: String,
    pub total_sales: i32,
    pub total_revenue: f64,
    pub commission_earned: f64,
    pub average_deal_size: f64,
    pub commission_rate: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RolePerformance {
    pub role: String,
    pub employee_count: i32,
    pub total_sales: i32,
    pub total_revenue: f64,
    pub average_revenue_per_employee: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MonthlyEmployeePerformance {
    pub month: String,
    pub total_sales: i32,
    pub total_revenue: f64,
    pub total_commission: f64,
    pub active_employees: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EmployeeDetail {
    pub employee_id: i32,
    pub employee_name: String,
    pub email: String,
    pub role: String,
    pub hire_date: String,
    pub commission_rate: f64,
    pub is_active: bool,
    pub total_sales: i32,
    pub total_revenue: f64,
    pub days_employed: i32,
}

// Financial Forecasting Response
#[derive(Debug, Serialize, Deserialize)]
pub struct FinancialForecast {
    pub total_revenue: f64,
    pub total_profit: f64,
    pub profit_margin: f64,
    pub average_monthly_revenue: f64,
    pub month_over_month_growth: f64,
    pub year_over_year_growth: f64,
    pub monthly_trends: Vec<MonthlyFinancialTrend>,
    pub profitability_by_vehicle_type: Vec<VehicleProfitability>,
    pub quarterly_summary: Vec<QuarterlySummary>,
    pub revenue_forecast: Vec<ForecastProjection>,
    pub cash_flow_analysis: CashFlowAnalysis,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MonthlyFinancialTrend {
    pub month: String,
    pub revenue: f64,
    pub cost: f64,
    pub profit: f64,
    pub profit_margin: f64,
    pub sales_count: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VehicleProfitability {
    pub vehicle_type: String,
    pub total_revenue: f64,
    pub total_cost: f64,
    pub total_profit: f64,
    pub profit_margin: f64,
    pub units_sold: i32,
    pub avg_profit_per_unit: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QuarterlySummary {
    pub quarter: String,
    pub revenue: f64,
    pub profit: f64,
    pub sales_count: i32,
    pub average_sale_price: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ForecastProjection {
    pub month: String,
    pub projected_revenue: f64,
    pub confidence_level: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CashFlowAnalysis {
    pub total_inflow: f64,
    pub total_outflow: f64,
    pub net_cash_flow: f64,
    pub loan_payments_received: f64,
    pub maintenance_expenses: f64,
    pub inventory_investment: f64,
}

// Handler for sales performance dashboard
async fn get_sales_performance(
    State(state): State<Arc<AppState>>,
    Query(filters): Query<SalesFilters>,
) -> Result<Json<SalesPerformance>, (StatusCode, String)> {
    let client = get_db_client(&state.db_name)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
    
    // Build filter SQL
    let mut conditions = Vec::new();
    if let Some(start) = &filters.start_date {
        conditions.push(format!("s.sale_date >= '{}'", start));
    }
    if let Some(end) = &filters.end_date {
        conditions.push(format!("s.sale_date <= '{}'", end));
    }
    if let Some(vtype) = &filters.vehicle_type {
        conditions.push(format!("v.vehicle_type = '{}'", vtype));
    }
    if let Some(emp_id) = filters.employee_id {
        if emp_id > 0 {
            conditions.push(format!("s.salesperson_id = {}", emp_id));
        }
    }
    let date_filter = if !conditions.is_empty() {
        format!("WHERE {}", conditions.join(" AND "))
    } else {
        String::new()
    };
    
    // Get overall metrics (need to adjust for JOIN if filtering by vehicle type)
    let metrics_query = if filters.vehicle_type.is_some() {
        format!("
            SELECT 
                COUNT(*) as total_sales,
                COALESCE(SUM(s.sale_price), 0) as total_revenue,
                COALESCE(AVG(s.sale_price), 0) as avg_deal_size
            FROM sales s
            JOIN vehicles v ON s.vehicle_id = v.vehicle_id
            {}
        ", date_filter)
    } else {
        let simple_filter = date_filter.replace("s.sale_date", "sale_date");
        format!("
            SELECT 
                COUNT(*) as total_sales,
                COALESCE(SUM(sale_price), 0) as total_revenue,
                COALESCE(AVG(sale_price), 0) as avg_deal_size
            FROM sales
            {}
        ", simple_filter)
    };
    let metrics_row = client
        .query_one(&metrics_query, &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;
    
    let total_sales_count: i64 = metrics_row.get(0);
    let total_revenue_decimal: Decimal = metrics_row.get(1);
    let total_revenue: f64 = total_revenue_decimal.to_string().parse().unwrap_or(0.0);
    let avg_deal_size_decimal: Decimal = metrics_row.get(2);
    let average_deal_size: f64 = avg_deal_size_decimal.to_string().parse().unwrap_or(0.0);
    
    // Get total commission paid
    let commission_query = if filters.vehicle_type.is_some() {
        format!("
            SELECT COALESCE(SUM(s.sale_price * (e.commission_rate / 100)), 0) as total_commission
            FROM sales s
            JOIN employees e ON s.salesperson_id = e.employee_id
            JOIN vehicles v ON s.vehicle_id = v.vehicle_id
            {}
        ", date_filter)
    } else {
        format!("
            SELECT COALESCE(SUM(s.sale_price * (e.commission_rate / 100)), 0) as total_commission
            FROM sales s
            JOIN employees e ON s.salesperson_id = e.employee_id
            {}
        ", date_filter)
    };
    let commission_row = client
        .query_one(&commission_query, &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;
    
    let total_commission_decimal: Decimal = commission_row.get(0);
    let total_commission_paid: f64 = total_commission_decimal.to_string().parse().unwrap_or(0.0);
    
    // Get top performers (salespeople)
    let performers_query = if filters.vehicle_type.is_some() {
        let additional_conds = conditions.iter()
            .filter(|c| !c.contains("salesperson_id"))  // Keep other filters except employee_id for this query
            .map(|c| c.as_str())
            .collect::<Vec<_>>()
            .join(" AND ");
        let where_clause = if !additional_conds.is_empty() {
            format!("WHERE e.role IN ('Salesperson', 'Sales Manager') AND {}", additional_conds)
        } else {
            "WHERE e.role IN ('Salesperson', 'Sales Manager')".to_string()
        };
        format!("
            SELECT 
                e.employee_id,
                e.first_name || ' ' || e.last_name as name,
                e.role,
                COUNT(s.sale_id) as total_sales,
                COALESCE(SUM(s.sale_price), 0) as total_revenue,
                COALESCE(SUM(s.sale_price * (e.commission_rate / 100)), 0) as commission_earned,
                COALESCE(AVG(s.sale_price), 0) as avg_sale_price
            FROM employees e
            LEFT JOIN sales s ON e.employee_id = s.salesperson_id
            LEFT JOIN vehicles v ON s.vehicle_id = v.vehicle_id
            {}
            GROUP BY e.employee_id, e.first_name, e.last_name, e.role
            ORDER BY total_revenue DESC
            LIMIT 10
        ", where_clause)
    } else {
        let additional_conds = conditions.iter()
            .filter(|c| !c.contains("salesperson_id"))
            .map(|c| c.as_str())
            .collect::<Vec<_>>()
            .join(" AND ");
        let where_clause = if !additional_conds.is_empty() {
            format!("WHERE e.role IN ('Salesperson', 'Sales Manager') AND {}", additional_conds)
        } else {
            "WHERE e.role IN ('Salesperson', 'Sales Manager')".to_string()
        };
        format!("
            SELECT 
                e.employee_id,
                e.first_name || ' ' || e.last_name as name,
                e.role,
                COUNT(s.sale_id) as total_sales,
                COALESCE(SUM(s.sale_price), 0) as total_revenue,
                COALESCE(SUM(s.sale_price * (e.commission_rate / 100)), 0) as commission_earned,
                COALESCE(AVG(s.sale_price), 0) as avg_sale_price
            FROM employees e
            LEFT JOIN sales s ON e.employee_id = s.salesperson_id
            {}
            GROUP BY e.employee_id, e.first_name, e.last_name, e.role
            ORDER BY total_revenue DESC
            LIMIT 10
        ", where_clause)
    };
    let performers_rows = client
        .query(&performers_query, &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;
    
    let mut top_performers = Vec::new();
    for row in performers_rows {
        let employee_id: i32 = row.get(0);
        let name: String = row.get(1);
        let role: String = row.get(2);
        let total_sales: i64 = row.get(3);
        let revenue_decimal: Decimal = row.get(4);
        let total_revenue: f64 = revenue_decimal.to_string().parse().unwrap_or(0.0);
        let commission_decimal: Decimal = row.get(5);
        let commission_earned: f64 = commission_decimal.to_string().parse().unwrap_or(0.0);
        let avg_decimal: Decimal = row.get(6);
        let average_sale_price: f64 = avg_decimal.to_string().parse().unwrap_or(0.0);
        
        top_performers.push(SalespersonPerformance {
            employee_id,
            name,
            role,
            total_sales: total_sales as i32,
            total_revenue,
            commission_earned,
            average_sale_price,
        });
    }
    
    // Get sales by month
    let monthly_rows = client
        .query("
            SELECT 
                TO_CHAR(sale_date, 'YYYY-MM') as month,
                COUNT(*) as sales_count,
                SUM(sale_price) as revenue,
                AVG(sale_price) as avg_deal_size
            FROM sales
            GROUP BY TO_CHAR(sale_date, 'YYYY-MM')
            ORDER BY month DESC
            LIMIT 12
        ", &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;
    
    let mut sales_by_month = Vec::new();
    for row in monthly_rows {
        let month: String = row.get(0);
        let sales_count: i64 = row.get(1);
        let revenue_decimal: Decimal = row.get(2);
        let revenue: f64 = revenue_decimal.to_string().parse().unwrap_or(0.0);
        let avg_decimal: Decimal = row.get(3);
        let average_deal_size: f64 = avg_decimal.to_string().parse().unwrap_or(0.0);
        
        sales_by_month.push(MonthlySalesPerformance {
            month,
            sales_count: sales_count as i32,
            revenue,
            average_deal_size,
        });
    }
    sales_by_month.reverse();
    
    // Get sales by payment method
    let payment_rows = client
        .query("
            SELECT 
                payment_method,
                COUNT(*) as count,
                SUM(sale_price) as total,
                (COUNT(*)::float / (SELECT COUNT(*) FROM sales)::float * 100) as percentage
            FROM sales
            GROUP BY payment_method
            ORDER BY count DESC
        ", &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;
    
    let mut sales_by_payment_method = Vec::new();
    for row in payment_rows {
        let method: String = row.get(0);
        let count: i64 = row.get(1);
        let total_decimal: Decimal = row.get(2);
        let total_value: f64 = total_decimal.to_string().parse().unwrap_or(0.0);
        let percentage: f64 = row.get(3);
        
        sales_by_payment_method.push(PaymentMethodBreakdown {
            method,
            count: count as i32,
            total_value,
            percentage,
        });
    }
    
    // Get sales by vehicle type
    let vehicle_rows = client
        .query("
            SELECT 
                v.vehicle_type,
                COUNT(*) as count,
                SUM(s.sale_price) as total_revenue,
                AVG(s.sale_price) as avg_price
            FROM sales s
            JOIN vehicles v ON s.vehicle_id = v.vehicle_id
            GROUP BY v.vehicle_type
            ORDER BY total_revenue DESC
        ", &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;
    
    let mut sales_by_vehicle_type = Vec::new();
    for row in vehicle_rows {
        let vehicle_type: String = row.get(0);
        let count: i64 = row.get(1);
        let revenue_decimal: Decimal = row.get(2);
        let total_revenue: f64 = revenue_decimal.to_string().parse().unwrap_or(0.0);
        let avg_decimal: Decimal = row.get(3);
        let average_price: f64 = avg_decimal.to_string().parse().unwrap_or(0.0);
        
        sales_by_vehicle_type.push(VehicleTypeBreakdown {
            vehicle_type,
            count: count as i32,
            total_revenue,
            average_price,
        });
    }
    
    Ok(Json(SalesPerformance {
        total_sales_count,
        total_revenue,
        total_commission_paid,
        average_deal_size,
        top_performers,
        sales_by_month,
        sales_by_payment_method,
        sales_by_vehicle_type,
    }))
}

// Handler for inventory management
async fn get_inventory_overview(
    State(state): State<Arc<AppState>>,
    Query(filters): Query<InventoryFilters>,
) -> Result<Json<InventoryOverview>, (StatusCode, String)> {
    let client = get_db_client(&state.db_name)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
    
    // Build filter SQL
    let mut conditions = Vec::new();
    if let Some(start) = &filters.start_date {
        conditions.push(format!("date_acquired >= '{}'", start));
    }
    if let Some(end) = &filters.end_date {
        conditions.push(format!("date_acquired <= '{}'", end));
    }
    if let Some(vtype) = &filters.vehicle_type {
        conditions.push(format!("vehicle_type = '{}'", vtype));
    }
    if let Some(status) = &filters.status {
        conditions.push(format!("status = '{}'", status.to_lowercase()));
    }
    if let Some(search) = &filters.search {
        if !search.is_empty() {
            conditions.push(format!("(vin ILIKE '%{}%' OR make ILIKE '%{}%' OR model ILIKE '%{}%')", search, search, search));
        }
    }
    let vehicle_filter = if !conditions.is_empty() {
        format!("WHERE {}", conditions.join(" AND "))
    } else {
        String::new()
    };
    
    // Get total vehicle counts
    let counts_query = format!("
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
            SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) as sold,
            COALESCE(SUM(CASE WHEN status = 'available' THEN cost_price ELSE 0 END), 0) as inventory_value
        FROM vehicles
        {}
    ", vehicle_filter);
    let counts_row = client
        .query_one(&counts_query, &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;
    
    let total_vehicles: i64 = counts_row.get(0);
    let available_vehicles: i64 = counts_row.get(1);
    let sold_vehicles: i64 = counts_row.get(2);
    let inventory_value_decimal: Decimal = counts_row.get(3);
    let total_inventory_value: f64 = inventory_value_decimal.to_string().parse().unwrap_or(0.0);
    
    // Get average days in inventory (for sold vehicles)
    let days_filter = if !conditions.is_empty() {
        format!(" AND {}", conditions.join(" AND "))
    } else {
        String::new()
    };
    let days_query = format!("
        SELECT COALESCE(AVG(s.sale_date - v.date_acquired), 0) as avg_days
        FROM vehicles v
        JOIN sales s ON v.vehicle_id = s.vehicle_id
        WHERE v.status = 'sold'{}
    ", days_filter);
    let days_row = client
        .query_one(&days_query, &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;
    
    let days_decimal: Decimal = days_row.get(0);
    let average_days_in_inventory: f64 = days_decimal.to_string().parse().unwrap_or(0.0);
    
    // Get vehicles by type
    let type_query = format!("
        SELECT 
            vehicle_type,
            SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
            SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) as sold,
            COUNT(*) as total,
            COALESCE(SUM(CASE WHEN status = 'available' THEN cost_price ELSE 0 END), 0) as total_value
        FROM vehicles
        {}
        GROUP BY vehicle_type
        ORDER BY total DESC
    ", vehicle_filter);
    let type_rows = client
        .query(&type_query, &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;
    
    let mut vehicles_by_type = Vec::new();
    for row in type_rows {
        let vehicle_type: String = row.get(0);
        let available: i64 = row.get(1);
        let sold: i64 = row.get(2);
        let total: i64 = row.get(3);
        let value_decimal: Decimal = row.get(4);
        let total_value: f64 = value_decimal.to_string().parse().unwrap_or(0.0);
        
        vehicles_by_type.push(InventoryByType {
            vehicle_type,
            available: available as i32,
            sold: sold as i32,
            total: total as i32,
            total_value,
        });
    }
    
    // Get cost vs price analysis
    let analysis_filter = if !conditions.is_empty() {
        format!(" AND {}", conditions.join(" AND "))
    } else {
        String::new()
    };
    let analysis_query = format!("
        SELECT 
            v.vehicle_type,
            AVG(v.cost_price) as avg_cost,
            AVG(s.sale_price) as avg_sale_price,
            AVG((s.sale_price - v.cost_price) / v.cost_price * 100) as avg_markup,
            COUNT(*) as count
        FROM vehicles v
        JOIN sales s ON v.vehicle_id = s.vehicle_id
        WHERE v.status = 'sold'{}
        GROUP BY v.vehicle_type
        ORDER BY count DESC
    ", analysis_filter);
    let analysis_rows = client
        .query(&analysis_query, &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;
    
    let mut cost_vs_price_analysis = Vec::new();
    for row in analysis_rows {
        let vehicle_type: String = row.get(0);
        let cost_decimal: Decimal = row.get(1);
        let avg_cost: f64 = cost_decimal.to_string().parse().unwrap_or(0.0);
        let price_decimal: Decimal = row.get(2);
        let avg_sale_price: f64 = price_decimal.to_string().parse().unwrap_or(0.0);
        let markup_decimal: Decimal = row.get(3);
        let avg_markup_percentage: f64 = markup_decimal.to_string().parse().unwrap_or(0.0);
        let count: i64 = row.get(4);
        
        cost_vs_price_analysis.push(CostPriceAnalysis {
            vehicle_type,
            avg_cost,
            avg_sale_price,
            avg_markup_percentage,
            count: count as i32,
        });
    }
    
    // Get recent vehicles (last 20 added, showing available first)
    let vehicle_rows = client
        .query("
            SELECT 
                vehicle_id,
                vin,
                make,
                model,
                year,
                vehicle_type,
                color,
                mileage,
                cost_price,
                status,
                CURRENT_DATE - date_acquired as days_in_inventory
            FROM vehicles
            ORDER BY 
                CASE WHEN status = 'available' THEN 0 ELSE 1 END,
                date_acquired DESC
            LIMIT 20
        ", &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;
    
    let mut recent_vehicles = Vec::new();
    for row in vehicle_rows {
        let vehicle_id: i32 = row.get(0);
        let vin: String = row.get(1);
        let make: String = row.get(2);
        let model: String = row.get(3);
        let year: i32 = row.get(4);
        let vehicle_type: String = row.get(5);
        let color: String = row.get(6);
        let mileage: i32 = row.get(7);
        let cost_decimal: Decimal = row.get(8);
        let cost_price: f64 = cost_decimal.to_string().parse().unwrap_or(0.0);
        let status: String = row.get(9);
        let days_in_inventory: i32 = row.get(10);
        
        recent_vehicles.push(VehicleDetail {
            vehicle_id,
            vin,
            make,
            model,
            year,
            vehicle_type,
            color,
            mileage,
            cost_price,
            status,
            days_in_inventory,
        });
    }
    
    Ok(Json(InventoryOverview {
        total_vehicles,
        available_vehicles,
        sold_vehicles,
        total_inventory_value,
        average_days_in_inventory,
        vehicles_by_type,
        cost_vs_price_analysis,
        recent_vehicles,
    }))
}

// Handler for finance & loan management
async fn get_finance_overview(
    State(state): State<Arc<AppState>>,
) -> Result<Json<FinanceOverview>, (StatusCode, String)> {
    let client = get_db_client(&state.db_name)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
    
    // Get total loan counts and values
    let loan_stats = client
        .query_one("
            SELECT 
                COUNT(*) as total_loans,
                SUM(CASE WHEN loan_status IN ('active', 'approved') THEN 1 ELSE 0 END) as active_loans,
                COALESCE(SUM(loan_amount), 0) as total_loan_value,
                COALESCE(SUM(CASE WHEN loan_status IN ('active', 'approved') THEN remaining_balance ELSE 0 END), 0) as outstanding_balance,
                COALESCE(AVG(interest_rate), 0) as avg_interest_rate
            FROM loans
        ", &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;
    
    let total_loans: i64 = loan_stats.get(0);
    let active_loans: i64 = loan_stats.get(1);
    let loan_value_decimal: Decimal = loan_stats.get(2);
    let total_loan_value: f64 = loan_value_decimal.to_string().parse().unwrap_or(0.0);
    let outstanding_decimal: Decimal = loan_stats.get(3);
    let outstanding_balance: f64 = outstanding_decimal.to_string().parse().unwrap_or(0.0);
    let avg_rate_decimal: Decimal = loan_stats.get(4);
    let average_interest_rate: f64 = avg_rate_decimal.to_string().parse().unwrap_or(0.0);
    
    // Calculate total interest revenue from all payments
    let interest_row = client
        .query_one("
            SELECT COALESCE(SUM(interest_amount), 0) as total_interest
            FROM payments
            WHERE payment_status = 'processed'
        ", &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;
    
    let interest_decimal: Decimal = interest_row.get(0);
    let total_interest_revenue: f64 = interest_decimal.to_string().parse().unwrap_or(0.0);
    
    // Calculate payment collection rate
    let collection_row = client
        .query_one("
            SELECT 
                COUNT(*) as total_expected,
                SUM(CASE WHEN payment_status = 'processed' THEN 1 ELSE 0 END) as processed
            FROM payments
        ", &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;
    
    let total_expected: i64 = collection_row.get(0);
    let processed: i64 = collection_row.get(1);
    let payment_collection_rate: f64 = if total_expected > 0 {
        (processed as f64 / total_expected as f64) * 100.0
    } else {
        0.0
    };
    
    // Get loans by status
    let status_rows = client
        .query("
            SELECT 
                loan_status,
                COUNT(*) as count,
                COALESCE(SUM(loan_amount), 0) as total_value,
                (COUNT(*)::float / (SELECT COUNT(*) FROM loans)::float * 100) as percentage
            FROM loans
            GROUP BY loan_status
            ORDER BY count DESC
        ", &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;
    
    let mut loans_by_status = Vec::new();
    for row in status_rows {
        let status: String = row.get(0);
        let count: i64 = row.get(1);
        let value_decimal: Decimal = row.get(2);
        let total_value: f64 = value_decimal.to_string().parse().unwrap_or(0.0);
        let percentage: f64 = row.get(3);
        
        loans_by_status.push(LoanStatusStat {
            status,
            count: count as i32,
            total_value,
            percentage,
        });
    }
    
    // Get monthly payment trends (last 6 months)
    let payment_rows = client
        .query("
            SELECT 
                TO_CHAR(payment_date, 'YYYY-MM') as month,
                COALESCE(SUM(payment_amount), 0) as total_payments,
                COUNT(*) as payment_count,
                COALESCE(SUM(principal_amount), 0) as principal_paid,
                COALESCE(SUM(interest_amount), 0) as interest_paid
            FROM payments
            WHERE payment_status = 'processed'
                AND payment_date >= CURRENT_DATE - INTERVAL '6 months'
            GROUP BY TO_CHAR(payment_date, 'YYYY-MM')
            ORDER BY month DESC
            LIMIT 6
        ", &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;
    
    let mut monthly_payment_trends = Vec::new();
    for row in payment_rows {
        let month: String = row.get(0);
        let total_decimal: Decimal = row.get(1);
        let total_payments: f64 = total_decimal.to_string().parse().unwrap_or(0.0);
        let payment_count: i64 = row.get(2);
        let principal_decimal: Decimal = row.get(3);
        let principal_paid: f64 = principal_decimal.to_string().parse().unwrap_or(0.0);
        let interest_decimal: Decimal = row.get(4);
        let interest_paid: f64 = interest_decimal.to_string().parse().unwrap_or(0.0);
        
        monthly_payment_trends.push(MonthlyPaymentTrend {
            month,
            total_payments,
            payment_count: payment_count as i32,
            principal_paid,
            interest_paid,
        });
    }
    monthly_payment_trends.reverse();
    
    // Get top loans by remaining balance
    let loan_rows = client
        .query("
            SELECT 
                l.loan_id,
                c.first_name || ' ' || c.last_name as customer_name,
                v.year || ' ' || v.make || ' ' || v.model as vehicle_info,
                l.loan_amount,
                l.remaining_balance,
                l.interest_rate,
                l.monthly_payment,
                l.term_months,
                l.loan_status,
                l.loan_start_date,
                CURRENT_DATE - l.loan_start_date as days_active
            FROM loans l
            JOIN sales s ON l.sale_id = s.sale_id
            JOIN customers c ON s.customer_id = c.customer_id
            JOIN vehicles v ON s.vehicle_id = v.vehicle_id
            WHERE l.loan_status IN ('active', 'approved')
            ORDER BY l.remaining_balance DESC
            LIMIT 10
        ", &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;
    
    let mut top_loans_by_balance = Vec::new();
    for row in loan_rows {
        let loan_id: i32 = row.get(0);
        let customer_name: String = row.get(1);
        let vehicle_info: String = row.get(2);
        let amount_decimal: Decimal = row.get(3);
        let loan_amount: f64 = amount_decimal.to_string().parse().unwrap_or(0.0);
        let balance_decimal: Decimal = row.get(4);
        let remaining_balance: f64 = balance_decimal.to_string().parse().unwrap_or(0.0);
        let rate_decimal: Decimal = row.get(5);
        let interest_rate: f64 = rate_decimal.to_string().parse().unwrap_or(0.0);
        let payment_decimal: Decimal = row.get(6);
        let monthly_payment: f64 = payment_decimal.to_string().parse().unwrap_or(0.0);
        let term_months: i32 = row.get(7);
        let loan_status: String = row.get(8);
        let loan_start_date: chrono::NaiveDate = row.get(9);
        let days_active: i32 = row.get(10);
        
        top_loans_by_balance.push(LoanDetail {
            loan_id,
            customer_name,
            vehicle_info,
            loan_amount,
            remaining_balance,
            interest_rate,
            monthly_payment,
            term_months,
            loan_status,
            loan_start_date: loan_start_date.to_string(),
            days_active,
        });
    }
    
    // Get late payment analysis
    let late_payment_row = client
        .query_one("
            SELECT 
                COUNT(*) as total_late,
                COALESCE(SUM(late_fee), 0) as total_fees,
                COUNT(DISTINCT loan_id) as loans_at_risk,
                0 as avg_days_late
            FROM payments
            WHERE late_fee > 0
        ", &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;
    
    let total_late_payments: i64 = late_payment_row.get(0);
    let fees_decimal: Decimal = late_payment_row.get(1);
    let total_late_fees: f64 = fees_decimal.to_string().parse().unwrap_or(0.0);
    let loans_at_risk: i64 = late_payment_row.get(2);
    let average_days_late: f64 = 0.0; // Placeholder since we don't track days late in schema
    
    let late_payment_analysis = LatePaymentStats {
        total_late_payments: total_late_payments as i32,
        total_late_fees,
        loans_at_risk: loans_at_risk as i32,
        average_days_late,
    };
    
    Ok(Json(FinanceOverview {
        total_loans,
        active_loans,
        total_loan_value,
        outstanding_balance,
        total_interest_revenue,
        average_interest_rate,
        payment_collection_rate,
        loans_by_status,
        monthly_payment_trends,
        top_loans_by_balance,
        late_payment_analysis,
    }))
}

// Handler for customer analytics
async fn get_customer_analytics(
    State(state): State<Arc<AppState>>,
) -> Result<Json<CustomerAnalytics>, (StatusCode, String)> {
    let client = get_db_client(&state.db_name)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
    
    // Get total customer counts
    let customer_stats = client
        .query_one("
            SELECT 
                COUNT(*) as total_customers,
                COUNT(DISTINCT CASE WHEN s.customer_id IS NOT NULL THEN c.customer_id END) as active_customers,
                COUNT(DISTINCT CASE WHEN s.purchase_count > 1 THEN c.customer_id END) as repeat_customers,
                COALESCE(AVG(c.credit_score), 0) as avg_credit_score
            FROM customers c
            LEFT JOIN (
                SELECT customer_id, COUNT(*) as purchase_count
                FROM sales
                GROUP BY customer_id
            ) s ON c.customer_id = s.customer_id
        ", &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Customer stats query error: {}", e)))?;
    
    let total_customers: i64 = customer_stats.get(0);
    let active_customers: i64 = customer_stats.get(1);
    let repeat_customers: i64 = customer_stats.get(2);
    let avg_credit_decimal: rust_decimal::Decimal = customer_stats.get(3);
    let average_credit_score: f64 = avg_credit_decimal.to_string().parse().unwrap_or(0.0);
    
    // Calculate customer lifetime value
    let clv_row = client
        .query_one("
            SELECT 
                COALESCE(SUM(sale_price), 0) as total_clv,
                CASE 
                    WHEN COUNT(DISTINCT customer_id) > 0 
                    THEN COALESCE(SUM(sale_price), 0) / COUNT(DISTINCT customer_id)
                    ELSE 0
                END as avg_customer_value
            FROM sales
        ", &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("CLV query error: {}", e)))?;
    
    let clv_decimal: Decimal = clv_row.get(0);
    let total_customer_lifetime_value: f64 = clv_decimal.to_string().parse().unwrap_or(0.0);
    let avg_decimal: Decimal = clv_row.get(1);
    let average_customer_value: f64 = avg_decimal.to_string().parse().unwrap_or(0.0);
    
    // Get customers by state
    let state_rows = client
        .query("
            SELECT 
                c.state,
                COUNT(DISTINCT c.customer_id) as customer_count,
                COALESCE(SUM(s.sale_price), 0) as total_purchases,
                COALESCE(AVG(c.credit_score), 0) as avg_credit_score
            FROM customers c
            LEFT JOIN sales s ON c.customer_id = s.customer_id
            WHERE c.state IS NOT NULL AND c.state != ''
            GROUP BY c.state
            ORDER BY customer_count DESC
            LIMIT 15
        ", &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("State distribution query error: {}", e)))?;
    
    let mut customers_by_state = Vec::new();
    for row in state_rows {
        let state: String = row.get(0);
        let customer_count: i64 = row.get(1);
        let purchases_decimal: Decimal = row.get(2);
        let total_purchases: f64 = purchases_decimal.to_string().parse().unwrap_or(0.0);
        let credit_decimal: Decimal = row.get(3);
        let average_credit_score: f64 = credit_decimal.to_string().parse().unwrap_or(0.0);
        
        customers_by_state.push(StateDistribution {
            state,
            customer_count: customer_count as i32,
            total_purchases,
            average_credit_score,
        });
    }
    
    // Get credit score distribution
    let credit_rows = client
        .query("
            SELECT 
                CASE 
                    WHEN credit_score >= 800 THEN '800-850 (Excellent)'
                    WHEN credit_score >= 740 THEN '740-799 (Very Good)'
                    WHEN credit_score >= 670 THEN '670-739 (Good)'
                    WHEN credit_score >= 580 THEN '580-669 (Fair)'
                    ELSE '300-579 (Poor)'
                END as score_range,
                COUNT(*) as count,
                (COUNT(*)::float / (SELECT COUNT(*) FROM customers WHERE credit_score IS NOT NULL)::float * 100) as percentage,
                COALESCE(AVG(s.sale_price), 0) as avg_purchase_value
            FROM customers c
            LEFT JOIN sales s ON c.customer_id = s.customer_id
            WHERE c.credit_score IS NOT NULL
            GROUP BY score_range
            ORDER BY MIN(c.credit_score) DESC
        ", &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Credit score query error: {}", e)))?;
    
    let mut credit_score_distribution = Vec::new();
    for row in credit_rows {
        let score_range: String = row.get(0);
        let count: i64 = row.get(1);
        let percentage: f64 = row.get(2);
        let avg_decimal: Decimal = row.get(3);
        let avg_purchase_value: f64 = avg_decimal.to_string().parse().unwrap_or(0.0);
        
        credit_score_distribution.push(CreditScoreBucket {
            score_range,
            count: count as i32,
            percentage,
            avg_purchase_value,
        });
    }
    
    // Get top customers by lifetime value
    let top_customer_rows = client
        .query("
            SELECT 
                c.customer_id,
                c.first_name || ' ' || c.last_name as customer_name,
                c.email,
                c.state,
                COALESCE(SUM(s.sale_price), 0) as total_purchases,
                COUNT(s.sale_id) as purchase_count,
                c.credit_score,
                MIN(s.sale_date) as first_purchase,
                MAX(s.sale_date) as last_purchase
            FROM customers c
            LEFT JOIN sales s ON c.customer_id = s.customer_id
            GROUP BY c.customer_id, c.first_name, c.last_name, c.email, c.state, c.credit_score
            HAVING COUNT(s.sale_id) > 0
            ORDER BY total_purchases DESC
            LIMIT 10
        ", &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Top customers query error: {}", e)))?;
    
    let mut top_customers = Vec::new();
    for row in top_customer_rows {
        let customer_id: i32 = row.get(0);
        let customer_name: String = row.get(1);
        let email: String = row.get(2);
        let state: String = row.get(3);
        let purchases_decimal: Decimal = row.get(4);
        let total_purchases: f64 = purchases_decimal.to_string().parse().unwrap_or(0.0);
        let purchase_count: i64 = row.get(5);
        let credit_score: i32 = row.get(6);
        let first_purchase: chrono::NaiveDate = row.get(7);
        let last_purchase: chrono::NaiveDate = row.get(8);
        
        top_customers.push(TopCustomer {
            customer_id,
            customer_name,
            email,
            state,
            total_purchases,
            purchase_count: purchase_count as i32,
            credit_score,
            first_purchase_date: first_purchase.to_string(),
            last_purchase_date: last_purchase.to_string(),
        });
    }
    
    // Get customer acquisition trend (all historical data)
    let acquisition_rows = client
        .query("
            SELECT 
                TO_CHAR(c.created_at, 'YYYY-MM') as month,
                COUNT(DISTINCT c.customer_id) as new_customers,
                COALESCE(SUM(s.sale_price), 0) as total_purchases
            FROM customers c
            LEFT JOIN sales s ON c.customer_id = s.customer_id 
                AND DATE_TRUNC('month', s.sale_date) = DATE_TRUNC('month', c.created_at)
            GROUP BY TO_CHAR(c.created_at, 'YYYY-MM')
            ORDER BY month ASC
        ", &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Acquisition trend query error: {}", e)))?;
    
    let mut customer_acquisition_trend = Vec::new();
    for row in acquisition_rows {
        let month: String = row.get(0);
        let new_customers: i64 = row.get(1);
        let purchases_decimal: Decimal = row.get(2);
        let total_purchases: f64 = purchases_decimal.to_string().parse().unwrap_or(0.0);
        
        customer_acquisition_trend.push(AcquisitionTrend {
            month,
            new_customers: new_customers as i32,
            total_purchases,
        });
    }
    
    // Get age demographics
    let age_rows = client
        .query("
            SELECT 
                age_range,
                count,
                percentage,
                avg_credit_score
            FROM (
                SELECT 
                    CASE 
                        WHEN age < 25 THEN '18-24'
                        WHEN age < 35 THEN '25-34'
                        WHEN age < 45 THEN '35-44'
                        WHEN age < 55 THEN '45-54'
                        WHEN age < 65 THEN '55-64'
                        ELSE '65+'
                    END as age_range,
                    MIN(age) as min_age,
                    COUNT(*) as count,
                    (COUNT(*)::float / (SELECT COUNT(*) FROM customers WHERE date_of_birth IS NOT NULL)::float * 100) as percentage,
                    COALESCE(AVG(credit_score), 0) as avg_credit_score
                FROM (
                    SELECT 
                        customer_id,
                        credit_score,
                        EXTRACT(YEAR FROM AGE(CURRENT_DATE, date_of_birth)) as age
                    FROM customers
                    WHERE date_of_birth IS NOT NULL
                ) age_calc
                GROUP BY age_range
            ) age_groups
            ORDER BY min_age
        ", &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Age demographics query error: {}", e)))?;
    
    let mut age_demographics = Vec::new();
    for row in age_rows {
        let age_range: String = row.get(0);
        let count: i64 = row.get(1);
        let percentage: f64 = row.get(2);
        let credit_decimal: Decimal = row.get(3);
        let avg_credit_score: f64 = credit_decimal.to_string().parse().unwrap_or(0.0);
        
        age_demographics.push(AgeDemographic {
            age_range,
            count: count as i32,
            percentage,
            avg_credit_score,
        });
    }
    
    Ok(Json(CustomerAnalytics {
        total_customers,
        active_customers,
        repeat_customers,
        average_credit_score,
        total_customer_lifetime_value,
        average_customer_value,
        customers_by_state,
        credit_score_distribution,
        top_customers,
        customer_acquisition_trend,
        age_demographics,
    }))
}

// Handler for maintenance analytics
async fn get_maintenance_analytics(
    State(state): State<Arc<AppState>>,
) -> Result<Json<MaintenanceAnalytics>, (StatusCode, String)> {
    let client = get_db_client(&state.db_name)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
    
    // Get overall maintenance statistics
    let stats_row = client
        .query_one("
            SELECT 
                COUNT(*) as total_records,
                COALESCE(SUM(cost), 0) as total_cost,
                CASE 
                    WHEN COUNT(*) > 0 THEN COALESCE(SUM(cost), 0) / COUNT(*)
                    ELSE 0
                END as avg_cost,
                COUNT(DISTINCT vehicle_id) as vehicles_serviced
            FROM maintenance_history
        ", &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Maintenance stats error: {}", e)))?;
    
    let total_maintenance_records: i64 = stats_row.get(0);
    let cost_decimal: Decimal = stats_row.get(1);
    let total_maintenance_cost: f64 = cost_decimal.to_string().parse().unwrap_or(0.0);
    let avg_decimal: Decimal = stats_row.get(2);
    let average_maintenance_cost: f64 = avg_decimal.to_string().parse().unwrap_or(0.0);
    let vehicles_serviced: i64 = stats_row.get(3);
    
    // Get most common service type
    let common_service_row = client
        .query_opt("
            SELECT service_type
            FROM maintenance_history
            WHERE service_type IS NOT NULL
            GROUP BY service_type
            ORDER BY COUNT(*) DESC
            LIMIT 1
        ", &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Common service error: {}", e)))?;
    
    let most_common_service: String = common_service_row
        .as_ref()
        .map(|row| row.get::<_, String>(0))
        .unwrap_or_else(|| "N/A".to_string());
    
    // Get maintenance by service type
    let type_rows = client
        .query("
            SELECT 
                service_type,
                COUNT(*) as count,
                COALESCE(SUM(cost), 0) as total_cost,
                COALESCE(AVG(cost), 0) as avg_cost,
                (COUNT(*)::float / (SELECT COUNT(*) FROM maintenance_history)::float * 100) as percentage
            FROM maintenance_history
            WHERE service_type IS NOT NULL
            GROUP BY service_type
            ORDER BY count DESC
        ", &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Maintenance by type error: {}", e)))?;
    
    let mut maintenance_by_type = Vec::new();
    for row in type_rows {
        let service_type: String = row.get(0);
        let count: i64 = row.get(1);
        let cost_decimal: Decimal = row.get(2);
        let total_cost: f64 = cost_decimal.to_string().parse().unwrap_or(0.0);
        let avg_decimal: Decimal = row.get(3);
        let average_cost: f64 = avg_decimal.to_string().parse().unwrap_or(0.0);
        let percentage: f64 = row.get(4);
        
        maintenance_by_type.push(MaintenanceByType {
            service_type,
            count: count as i32,
            total_cost,
            average_cost,
            percentage,
        });
    }
    
    // Get maintenance cost trend (all historical data)
    let trend_rows = client
        .query("
            SELECT 
                TO_CHAR(service_date, 'YYYY-MM') as month,
                COALESCE(SUM(cost), 0) as total_cost,
                COUNT(*) as service_count,
                COALESCE(AVG(cost), 0) as avg_cost
            FROM maintenance_history
            GROUP BY TO_CHAR(service_date, 'YYYY-MM')
            ORDER BY month ASC
        ", &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Cost trend error: {}", e)))?;
    
    let mut maintenance_cost_trend = Vec::new();
    for row in trend_rows {
        let month: String = row.get(0);
        let cost_decimal: Decimal = row.get(1);
        let total_cost: f64 = cost_decimal.to_string().parse().unwrap_or(0.0);
        let service_count: i64 = row.get(2);
        let avg_decimal: Decimal = row.get(3);
        let average_cost: f64 = avg_decimal.to_string().parse().unwrap_or(0.0);
        
        maintenance_cost_trend.push(MaintenanceCostTrend {
            month,
            total_cost,
            service_count: service_count as i32,
            average_cost,
        });
    }
    
    // Get top vehicles by maintenance cost
    let vehicle_rows = client
        .query("
            SELECT 
                v.vehicle_id,
                v.vin,
                v.year || ' ' || v.make || ' ' || v.model as vehicle_info,
                COALESCE(SUM(m.cost), 0) as total_cost,
                COUNT(m.maintenance_id) as service_count,
                MAX(m.service_date) as last_service_date,
                (
                    SELECT service_type 
                    FROM maintenance_history 
                    WHERE vehicle_id = v.vehicle_id 
                    ORDER BY service_date DESC 
                    LIMIT 1
                ) as last_service_type
            FROM vehicles v
            LEFT JOIN maintenance_history m ON v.vehicle_id = m.vehicle_id
            GROUP BY v.vehicle_id, v.vin, v.year, v.make, v.model
            HAVING COUNT(m.maintenance_id) > 0
            ORDER BY total_cost DESC
            LIMIT 10
        ", &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Top vehicles error: {}", e)))?;
    
    let mut top_vehicles_by_cost = Vec::new();
    for row in vehicle_rows {
        let vehicle_id: i32 = row.get(0);
        let vin: String = row.get(1);
        let vehicle_info: String = row.get(2);
        let cost_decimal: Decimal = row.get(3);
        let total_maintenance_cost: f64 = cost_decimal.to_string().parse().unwrap_or(0.0);
        let service_count: i64 = row.get(4);
        let last_service_date: chrono::NaiveDate = row.get(5);
        let last_service_type: String = row.get(6);
        
        top_vehicles_by_cost.push(VehicleMaintenanceSummary {
            vehicle_id,
            vin,
            vehicle_info,
            total_maintenance_cost,
            service_count: service_count as i32,
            last_service_date: last_service_date.to_string(),
            last_service_type,
        });
    }
    
    // Get recent maintenance records
    let recent_rows = client
        .query("
            SELECT 
                m.maintenance_id,
                m.vehicle_id,
                v.year || ' ' || v.make || ' ' || v.model as vehicle_info,
                m.service_date,
                m.service_type,
                m.mileage_at_service,
                m.service_provider,
                m.cost,
                COALESCE(m.description, '') as description
            FROM maintenance_history m
            JOIN vehicles v ON m.vehicle_id = v.vehicle_id
            ORDER BY m.service_date DESC
            LIMIT 20
        ", &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Recent maintenance error: {}", e)))?;
    
    let mut recent_maintenance = Vec::new();
    for row in recent_rows {
        let maintenance_id: i32 = row.get(0);
        let vehicle_id: i32 = row.get(1);
        let vehicle_info: String = row.get(2);
        let service_date: chrono::NaiveDate = row.get(3);
        let service_type: String = row.get(4);
        let mileage_at_service: i32 = row.get(5);
        let service_provider: String = row.get(6);
        let cost_decimal: Decimal = row.get(7);
        let cost: f64 = cost_decimal.to_string().parse().unwrap_or(0.0);
        let description: String = row.get(8);
        
        recent_maintenance.push(MaintenanceRecord {
            maintenance_id,
            vehicle_id,
            vehicle_info,
            service_date: service_date.to_string(),
            service_type,
            mileage_at_service,
            service_provider,
            cost,
            description,
        });
    }
    
    // Get service provider statistics
    let provider_rows = client
        .query("
            SELECT 
                service_provider,
                COUNT(*) as service_count,
                COALESCE(SUM(cost), 0) as total_cost,
                COALESCE(AVG(cost), 0) as avg_cost
            FROM maintenance_history
            WHERE service_provider IS NOT NULL AND service_provider != ''
            GROUP BY service_provider
            ORDER BY total_cost DESC
            LIMIT 10
        ", &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Service provider error: {}", e)))?;
    
    let mut service_provider_stats = Vec::new();
    for row in provider_rows {
        let service_provider: String = row.get(0);
        let service_count: i64 = row.get(1);
        let cost_decimal: Decimal = row.get(2);
        let total_cost: f64 = cost_decimal.to_string().parse().unwrap_or(0.0);
        let avg_decimal: Decimal = row.get(3);
        let average_cost: f64 = avg_decimal.to_string().parse().unwrap_or(0.0);
        
        service_provider_stats.push(ServiceProviderStat {
            service_provider,
            service_count: service_count as i32,
            total_cost,
            average_cost,
        });
    }
    
    Ok(Json(MaintenanceAnalytics {
        total_maintenance_records,
        total_maintenance_cost,
        average_maintenance_cost,
        vehicles_serviced,
        most_common_service,
        maintenance_by_type,
        maintenance_cost_trend,
        top_vehicles_by_cost,
        recent_maintenance,
        service_provider_stats,
    }))
}

// Handler for employee performance
async fn get_employee_performance(
    State(state): State<Arc<AppState>>,
) -> Result<Json<EmployeePerformance>, (StatusCode, String)> {
    let client = get_db_client(&state.db_name)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
    
    // Get overall employee statistics
    let stats_row = client
        .query_one("
            SELECT 
                COUNT(*) as total_employees,
                SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active_employees,
                COALESCE(AVG(commission_rate), 0) as avg_commission_rate
            FROM employees
        ", &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Employee stats error: {}", e)))?;
    
    let total_employees: i64 = stats_row.get(0);
    let active_employees: i64 = stats_row.get(1);
    let avg_rate_decimal: Decimal = stats_row.get(2);
    let average_commission_rate: f64 = avg_rate_decimal.to_string().parse().unwrap_or(0.0);
    
    // Calculate total commission paid
    let commission_row = client
        .query_one("
            SELECT COALESCE(SUM(s.sale_price * e.commission_rate / 100), 0) as total_commission
            FROM sales s
            JOIN employees e ON s.salesperson_id = e.employee_id
        ", &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Commission calc error: {}", e)))?;
    
    let commission_decimal: Decimal = commission_row.get(0);
    let total_commission_paid: f64 = commission_decimal.to_string().parse().unwrap_or(0.0);
    
    // Get top performers
    let performer_rows = client
        .query("
            SELECT 
                e.employee_id,
                e.first_name || ' ' || e.last_name as employee_name,
                e.role,
                COUNT(s.sale_id) as total_sales,
                COALESCE(SUM(s.sale_price), 0) as total_revenue,
                COALESCE(SUM(s.sale_price * e.commission_rate / 100), 0) as commission_earned,
                CASE 
                    WHEN COUNT(s.sale_id) > 0 
                    THEN COALESCE(SUM(s.sale_price), 0) / COUNT(s.sale_id)
                    ELSE 0
                END as avg_deal_size,
                e.commission_rate
            FROM employees e
            LEFT JOIN sales s ON e.employee_id = s.salesperson_id
            GROUP BY e.employee_id, e.first_name, e.last_name, e.role, e.commission_rate
            HAVING COUNT(s.sale_id) > 0
            ORDER BY total_revenue DESC
            LIMIT 10
        ", &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Top performers error: {}", e)))?;
    
    let mut top_performers = Vec::new();
    for row in performer_rows {
        let employee_id: i32 = row.get(0);
        let employee_name: String = row.get(1);
        let role: String = row.get(2);
        let total_sales: i64 = row.get(3);
        let revenue_decimal: Decimal = row.get(4);
        let total_revenue: f64 = revenue_decimal.to_string().parse().unwrap_or(0.0);
        let commission_decimal: Decimal = row.get(5);
        let commission_earned: f64 = commission_decimal.to_string().parse().unwrap_or(0.0);
        let avg_decimal: Decimal = row.get(6);
        let average_deal_size: f64 = avg_decimal.to_string().parse().unwrap_or(0.0);
        let rate_decimal: Decimal = row.get(7);
        let commission_rate: f64 = rate_decimal.to_string().parse().unwrap_or(0.0);
        
        top_performers.push(EmployeeStats {
            employee_id,
            employee_name,
            role,
            total_sales: total_sales as i32,
            total_revenue,
            commission_earned,
            average_deal_size,
            commission_rate,
        });
    }
    
    // Get performance by role
    let role_rows = client
        .query("
            SELECT 
                e.role,
                COUNT(DISTINCT e.employee_id) as employee_count,
                COUNT(s.sale_id) as total_sales,
                COALESCE(SUM(s.sale_price), 0) as total_revenue,
                CASE 
                    WHEN COUNT(DISTINCT e.employee_id) > 0 
                    THEN COALESCE(SUM(s.sale_price), 0) / COUNT(DISTINCT e.employee_id)
                    ELSE 0
                END as avg_revenue_per_employee
            FROM employees e
            LEFT JOIN sales s ON e.employee_id = s.salesperson_id
            GROUP BY e.role
            ORDER BY total_revenue DESC
        ", &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Role performance error: {}", e)))?;
    
    let mut performance_by_role = Vec::new();
    for row in role_rows {
        let role: String = row.get(0);
        let employee_count: i64 = row.get(1);
        let total_sales: i64 = row.get(2);
        let revenue_decimal: Decimal = row.get(3);
        let total_revenue: f64 = revenue_decimal.to_string().parse().unwrap_or(0.0);
        let avg_decimal: Decimal = row.get(4);
        let average_revenue_per_employee: f64 = avg_decimal.to_string().parse().unwrap_or(0.0);
        
        performance_by_role.push(RolePerformance {
            role,
            employee_count: employee_count as i32,
            total_sales: total_sales as i32,
            total_revenue,
            average_revenue_per_employee,
        });
    }
    
    // Get monthly performance trends
    let monthly_rows = client
        .query("
            SELECT 
                TO_CHAR(s.sale_date, 'YYYY-MM') as month,
                COUNT(s.sale_id) as total_sales,
                COALESCE(SUM(s.sale_price), 0) as total_revenue,
                COALESCE(SUM(s.sale_price * e.commission_rate / 100), 0) as total_commission,
                COUNT(DISTINCT e.employee_id) as active_employees
            FROM sales s
            JOIN employees e ON s.salesperson_id = e.employee_id
            GROUP BY TO_CHAR(s.sale_date, 'YYYY-MM')
            ORDER BY month ASC
        ", &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Monthly performance error: {}", e)))?;
    
    let mut monthly_performance = Vec::new();
    for row in monthly_rows {
        let month: String = row.get(0);
        let total_sales: i64 = row.get(1);
        let revenue_decimal: Decimal = row.get(2);
        let total_revenue: f64 = revenue_decimal.to_string().parse().unwrap_or(0.0);
        let commission_decimal: Decimal = row.get(3);
        let total_commission: f64 = commission_decimal.to_string().parse().unwrap_or(0.0);
        let active_employees: i64 = row.get(4);
        
        monthly_performance.push(MonthlyEmployeePerformance {
            month,
            total_sales: total_sales as i32,
            total_revenue,
            total_commission,
            active_employees: active_employees as i32,
        });
    }
    
    // Get all employees with their performance metrics
    let employee_rows = client
        .query("
            SELECT 
                e.employee_id,
                e.first_name || ' ' || e.last_name as employee_name,
                e.email,
                e.role,
                e.hire_date,
                e.commission_rate,
                e.is_active,
                COUNT(s.sale_id) as total_sales,
                COALESCE(SUM(s.sale_price), 0) as total_revenue,
                CURRENT_DATE - e.hire_date as days_employed
            FROM employees e
            LEFT JOIN sales s ON e.employee_id = s.salesperson_id
            GROUP BY e.employee_id, e.first_name, e.last_name, e.email, e.role, e.hire_date, e.commission_rate, e.is_active
            ORDER BY total_revenue DESC
        ", &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Employee list error: {}", e)))?;
    
    let mut employee_list = Vec::new();
    for row in employee_rows {
        let employee_id: i32 = row.get(0);
        let employee_name: String = row.get(1);
        let email: String = row.get(2);
        let role: String = row.get(3);
        let hire_date: chrono::NaiveDate = row.get(4);
        let rate_decimal: Decimal = row.get(5);
        let commission_rate: f64 = rate_decimal.to_string().parse().unwrap_or(0.0);
        let is_active: bool = row.get(6);
        let total_sales: i64 = row.get(7);
        let revenue_decimal: Decimal = row.get(8);
        let total_revenue: f64 = revenue_decimal.to_string().parse().unwrap_or(0.0);
        let days_employed: i32 = row.get(9);
        
        employee_list.push(EmployeeDetail {
            employee_id,
            employee_name,
            email,
            role,
            hire_date: hire_date.to_string(),
            commission_rate,
            is_active,
            total_sales: total_sales as i32,
            total_revenue,
            days_employed,
        });
    }
    
    Ok(Json(EmployeePerformance {
        total_employees,
        active_employees,
        total_commission_paid,
        average_commission_rate,
        top_performers,
        performance_by_role,
        monthly_performance,
        employee_list,
    }))
}

// Handler for financial forecasting
async fn get_financial_forecast(
    State(state): State<Arc<AppState>>,
) -> Result<Json<FinancialForecast>, (StatusCode, String)> {
    let client = get_db_client(&state.db_name)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
    
    // Get overall financial metrics
    let overall_row = client
        .query_one("
            SELECT 
                COALESCE(SUM(s.sale_price), 0) as total_revenue,
                COALESCE(SUM(s.sale_price - v.cost_price), 0) as total_profit,
                CASE 
                    WHEN SUM(s.sale_price) > 0 
                    THEN (SUM(s.sale_price - v.cost_price) / SUM(s.sale_price) * 100)
                    ELSE 0
                END as profit_margin
            FROM sales s
            JOIN vehicles v ON s.vehicle_id = v.vehicle_id
        ", &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Overall metrics error: {}", e)))?;
    
    let revenue_decimal: Decimal = overall_row.get(0);
    let total_revenue: f64 = revenue_decimal.to_string().parse().unwrap_or(0.0);
    let profit_decimal: Decimal = overall_row.get(1);
    let total_profit: f64 = profit_decimal.to_string().parse().unwrap_or(0.0);
    let margin_decimal: Decimal = overall_row.get(2);
    let profit_margin: f64 = margin_decimal.to_string().parse().unwrap_or(0.0);
    
    // Get monthly trends
    let monthly_rows = client
        .query("
            SELECT 
                TO_CHAR(s.sale_date, 'YYYY-MM') as month,
                COALESCE(SUM(s.sale_price), 0) as revenue,
                COALESCE(SUM(v.cost_price), 0) as cost,
                COALESCE(SUM(s.sale_price - v.cost_price), 0) as profit,
                CASE 
                    WHEN SUM(s.sale_price) > 0 
                    THEN (SUM(s.sale_price - v.cost_price) / SUM(s.sale_price) * 100)
                    ELSE 0
                END as profit_margin,
                COUNT(*) as sales_count
            FROM sales s
            JOIN vehicles v ON s.vehicle_id = v.vehicle_id
            GROUP BY TO_CHAR(s.sale_date, 'YYYY-MM')
            ORDER BY month ASC
        ", &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Monthly trends error: {}", e)))?;
    
    let mut monthly_trends = Vec::new();
    for row in monthly_rows {
        let month: String = row.get(0);
        let rev_decimal: Decimal = row.get(1);
        let revenue: f64 = rev_decimal.to_string().parse().unwrap_or(0.0);
        let cost_decimal: Decimal = row.get(2);
        let cost: f64 = cost_decimal.to_string().parse().unwrap_or(0.0);
        let profit_decimal: Decimal = row.get(3);
        let profit: f64 = profit_decimal.to_string().parse().unwrap_or(0.0);
        let margin_decimal: Decimal = row.get(4);
        let profit_margin: f64 = margin_decimal.to_string().parse().unwrap_or(0.0);
        let sales_count: i64 = row.get(5);
        
        monthly_trends.push(MonthlyFinancialTrend {
            month,
            revenue,
            cost,
            profit,
            profit_margin,
            sales_count: sales_count as i32,
        });
    }
    
    // Calculate average monthly revenue
    let average_monthly_revenue = if !monthly_trends.is_empty() {
        total_revenue / monthly_trends.len() as f64
    } else {
        0.0
    };
    
    // Calculate month-over-month growth
    let month_over_month_growth = if monthly_trends.len() >= 2 {
        let last_month = &monthly_trends[monthly_trends.len() - 1];
        let prev_month = &monthly_trends[monthly_trends.len() - 2];
        if prev_month.revenue > 0.0 {
            ((last_month.revenue - prev_month.revenue) / prev_month.revenue) * 100.0
        } else {
            0.0
        }
    } else {
        0.0
    };
    
    // Calculate year-over-year growth (if we have 12+ months of data)
    let year_over_year_growth = if monthly_trends.len() >= 13 {
        let current_month = &monthly_trends[monthly_trends.len() - 1];
        let year_ago_month = &monthly_trends[monthly_trends.len() - 13];
        if year_ago_month.revenue > 0.0 {
            ((current_month.revenue - year_ago_month.revenue) / year_ago_month.revenue) * 100.0
        } else {
            0.0
        }
    } else {
        0.0
    };
    
    // Get profitability by vehicle type
    let profitability_rows = client
        .query("
            SELECT 
                v.vehicle_type,
                COALESCE(SUM(s.sale_price), 0) as total_revenue,
                COALESCE(SUM(v.cost_price), 0) as total_cost,
                COALESCE(SUM(s.sale_price - v.cost_price), 0) as total_profit,
                CASE 
                    WHEN SUM(s.sale_price) > 0 
                    THEN (SUM(s.sale_price - v.cost_price) / SUM(s.sale_price) * 100)
                    ELSE 0
                END as profit_margin,
                COUNT(*) as units_sold,
                CASE 
                    WHEN COUNT(*) > 0 
                    THEN SUM(s.sale_price - v.cost_price) / COUNT(*)
                    ELSE 0
                END as avg_profit_per_unit
            FROM sales s
            JOIN vehicles v ON s.vehicle_id = v.vehicle_id
            GROUP BY v.vehicle_type
            ORDER BY total_profit DESC
        ", &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Profitability error: {}", e)))?;
    
    let mut profitability_by_vehicle_type = Vec::new();
    for row in profitability_rows {
        let vehicle_type: String = row.get(0);
        let rev_decimal: Decimal = row.get(1);
        let total_revenue: f64 = rev_decimal.to_string().parse().unwrap_or(0.0);
        let cost_decimal: Decimal = row.get(2);
        let total_cost: f64 = cost_decimal.to_string().parse().unwrap_or(0.0);
        let profit_decimal: Decimal = row.get(3);
        let total_profit: f64 = profit_decimal.to_string().parse().unwrap_or(0.0);
        let margin_decimal: Decimal = row.get(4);
        let profit_margin: f64 = margin_decimal.to_string().parse().unwrap_or(0.0);
        let units_sold: i64 = row.get(5);
        let avg_decimal: Decimal = row.get(6);
        let avg_profit_per_unit: f64 = avg_decimal.to_string().parse().unwrap_or(0.0);
        
        profitability_by_vehicle_type.push(VehicleProfitability {
            vehicle_type,
            total_revenue,
            total_cost,
            total_profit,
            profit_margin,
            units_sold: units_sold as i32,
            avg_profit_per_unit,
        });
    }
    
    // Get quarterly summary
    let quarterly_rows = client
        .query("
            SELECT 
                TO_CHAR(s.sale_date, 'YYYY-\"Q\"Q') as quarter,
                COALESCE(SUM(s.sale_price), 0) as revenue,
                COALESCE(SUM(s.sale_price - v.cost_price), 0) as profit,
                COUNT(*) as sales_count,
                COALESCE(AVG(s.sale_price), 0) as avg_sale_price
            FROM sales s
            JOIN vehicles v ON s.vehicle_id = v.vehicle_id
            GROUP BY TO_CHAR(s.sale_date, 'YYYY-\"Q\"Q')
            ORDER BY quarter ASC
        ", &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Quarterly summary error: {}", e)))?;
    
    let mut quarterly_summary = Vec::new();
    for row in quarterly_rows {
        let quarter: String = row.get(0);
        let rev_decimal: Decimal = row.get(1);
        let revenue: f64 = rev_decimal.to_string().parse().unwrap_or(0.0);
        let profit_decimal: Decimal = row.get(2);
        let profit: f64 = profit_decimal.to_string().parse().unwrap_or(0.0);
        let sales_count: i64 = row.get(3);
        let avg_decimal: Decimal = row.get(4);
        let average_sale_price: f64 = avg_decimal.to_string().parse().unwrap_or(0.0);
        
        quarterly_summary.push(QuarterlySummary {
            quarter,
            revenue,
            profit,
            sales_count: sales_count as i32,
            average_sale_price,
        });
    }
    
    // Simple forecast: project next 3 months based on average monthly revenue with growth trend
    let mut revenue_forecast = Vec::new();
    if !monthly_trends.is_empty() {
        let base_forecast = average_monthly_revenue * (1.0 + (month_over_month_growth / 100.0));
        let last_month = &monthly_trends[monthly_trends.len() - 1];
        
        // Parse last month and project forward
        for i in 1..=3 {
            let projected = base_forecast * (1.0 + (month_over_month_growth / 100.0 * i as f64));
            let confidence = if i == 1 { "High" } else if i == 2 { "Medium" } else { "Low" };
            
            revenue_forecast.push(ForecastProjection {
                month: format!("{}+{}", last_month.month, i),
                projected_revenue: projected,
                confidence_level: confidence.to_string(),
            });
        }
    }
    
    // Cash flow analysis
    let cash_flow_row = client
        .query_one("
            SELECT 
                COALESCE(SUM(s.sale_price), 0) as total_inflow,
                COALESCE(SUM(v.cost_price), 0) as inventory_investment,
                COALESCE((SELECT SUM(payment_amount) FROM payments WHERE payment_status = 'processed'), 0) as loan_payments,
                COALESCE((SELECT SUM(cost) FROM maintenance_history), 0) as maintenance_expenses
            FROM sales s
            JOIN vehicles v ON s.vehicle_id = v.vehicle_id
        ", &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Cash flow error: {}", e)))?;
    
    let inflow_decimal: Decimal = cash_flow_row.get(0);
    let total_inflow: f64 = inflow_decimal.to_string().parse().unwrap_or(0.0);
    let inventory_decimal: Decimal = cash_flow_row.get(1);
    let inventory_investment: f64 = inventory_decimal.to_string().parse().unwrap_or(0.0);
    let loan_decimal: Decimal = cash_flow_row.get(2);
    let loan_payments_received: f64 = loan_decimal.to_string().parse().unwrap_or(0.0);
    let maint_decimal: Decimal = cash_flow_row.get(3);
    let maintenance_expenses: f64 = maint_decimal.to_string().parse().unwrap_or(0.0);
    
    let total_outflow = inventory_investment + maintenance_expenses;
    let net_cash_flow = total_inflow + loan_payments_received - total_outflow;
    
    let cash_flow_analysis = CashFlowAnalysis {
        total_inflow,
        total_outflow,
        net_cash_flow,
        loan_payments_received,
        maintenance_expenses,
        inventory_investment,
    };
    
    Ok(Json(FinancialForecast {
        total_revenue,
        total_profit,
        profit_margin,
        average_monthly_revenue,
        month_over_month_growth,
        year_over_year_growth,
        monthly_trends,
        profitability_by_vehicle_type,
        quarterly_summary,
        revenue_forecast,
        cash_flow_analysis,
    }))
}

// Health check endpoint
async fn health_check() -> &'static str {
    "OK"
}

// Create the API router
pub fn create_router(db_name: String) -> Router {
    let state = Arc::new(AppState { db_name });
    
    Router::new()
        .route("/health", get(health_check))
        .route("/api/dashboard/executive", get(get_executive_overview))
        .route("/api/dashboard/sales-performance", get(get_sales_performance))
        .route("/api/dashboard/inventory", get(get_inventory_overview))
        .route("/api/dashboard/finance", get(get_finance_overview))
        .route("/api/dashboard/customers", get(get_customer_analytics))
        .route("/api/dashboard/maintenance", get(get_maintenance_analytics))
        .route("/api/dashboard/employees", get(get_employee_performance))
        .route("/api/dashboard/forecasting", get(get_financial_forecast))
        .with_state(state)
}
