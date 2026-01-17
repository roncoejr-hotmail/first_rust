use axum::{
    extract::State,
    http::StatusCode,
    response::Json,
    routing::get,
    Router,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;

// Shared application state
#[derive(Clone)]
pub struct AppState {
    pub db_name: String,
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

// Handler for executive overview
async fn get_executive_overview(
    State(state): State<Arc<AppState>>,
) -> Result<Json<ExecutiveOverview>, (StatusCode, String)> {
    // Get database connection
    let mut client = crate::utils::open_postgres_db(&state.db_name);
    
    // Get total revenue
    let total_revenue_query = "SELECT COALESCE(SUM(sale_price), 0) as total FROM sales";
    let revenue_row = client
        .query_one(total_revenue_query, &[])
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;
    let total_revenue: rust_decimal::Decimal = revenue_row.get(0);
    let total_revenue: f64 = total_revenue.to_string().parse().unwrap_or(0.0);
    
    // Get total sales count
    let sales_count_query = "SELECT COUNT(*) as count FROM sales";
    let sales_row = client
        .query_one(sales_count_query, &[])
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;
    let total_sales: i64 = sales_row.get(0);
    
    // Get vehicle counts
    let vehicles_query = "SELECT COUNT(*) as total, SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available FROM vehicles";
    let vehicles_row = client
        .query_one(vehicles_query, &[])
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;
    let total_vehicles: i64 = vehicles_row.get(0);
    let available_vehicles: i64 = vehicles_row.get(1);
    
    // Get customer count
    let customers_query = "SELECT COUNT(*) as count FROM customers";
    let customers_row = client
        .query_one(customers_query, &[])
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;
    let total_customers: i64 = customers_row.get(0);
    
    // Get employee count
    let employees_query = "SELECT COUNT(*) as count FROM employees";
    let employees_row = client
        .query_one(employees_query, &[])
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;
    let total_employees: i64 = employees_row.get(0);
    
    // Get active loans count and value
    let loans_query = "SELECT COUNT(*) as count, COALESCE(SUM(remaining_balance), 0) as total FROM loans WHERE loan_status = 'active'";
    let loans_row = client
        .query_one(loans_query, &[])
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;
    let active_loans: i64 = loans_row.get(0);
    let loan_portfolio_value_decimal: rust_decimal::Decimal = loans_row.get(1);
    let loan_portfolio_value: f64 = loan_portfolio_value_decimal.to_string().parse().unwrap_or(0.0);
    
    // Get average sale price
    let avg_price_query = "SELECT COALESCE(AVG(sale_price), 0) as avg FROM sales";
    let avg_row = client
        .query_one(avg_price_query, &[])
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;
    let average_sale_price_decimal: rust_decimal::Decimal = avg_row.get(0);
    let average_sale_price: f64 = average_sale_price_decimal.to_string().parse().unwrap_or(0.0);
    
    // Get revenue by month
    let monthly_revenue_query = "
        SELECT 
            TO_CHAR(sale_date, 'YYYY-MM') as month,
            SUM(sale_price) as revenue,
            COUNT(*) as count
        FROM sales
        GROUP BY TO_CHAR(sale_date, 'YYYY-MM')
        ORDER BY month DESC
        LIMIT 12
    ";
    let monthly_rows = client
        .query(monthly_revenue_query, &[])
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;
    
    let mut revenue_by_month = Vec::new();
    for row in monthly_rows {
        let month: String = row.get(0);
        let revenue_decimal: rust_decimal::Decimal = row.get(1);
        let revenue: f64 = revenue_decimal.to_string().parse().unwrap_or(0.0);
        let sales_count: i64 = row.get(2);
        revenue_by_month.push(MonthlyRevenue {
            month,
            revenue,
            sales_count: sales_count as i32,
        });
    }
    revenue_by_month.reverse(); // Show oldest to newest
    
    // Get sales by payment method
    let payment_method_query = "
        SELECT 
            payment_method,
            COUNT(*) as count,
            SUM(sale_price) as total
        FROM sales
        GROUP BY payment_method
        ORDER BY count DESC
    ";
    let payment_rows = client
        .query(payment_method_query, &[])
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;
    
    let mut sales_by_payment_method = Vec::new();
    for row in payment_rows {
        let method: String = row.get(0);
        let count: i64 = row.get(1);
        let total_decimal: rust_decimal::Decimal = row.get(2);
        let total_value: f64 = total_decimal.to_string().parse().unwrap_or(0.0);
        sales_by_payment_method.push(PaymentMethodStat {
            method,
            count: count as i32,
            total_value,
        });
    }
    
    // Get top selling vehicle types
    let top_types_query = "
        SELECT 
            v.vehicle_type,
            COUNT(*) as count,
            SUM(s.sale_price) as revenue
        FROM sales s
        JOIN vehicles v ON s.vehicle_id = v.vehicle_id
        GROUP BY v.vehicle_type
        ORDER BY count DESC
        LIMIT 5
    ";
    let types_rows = client
        .query(top_types_query, &[])
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;
    
    let mut top_selling_types = Vec::new();
    for row in types_rows {
        let vehicle_type: String = row.get(0);
        let count: i64 = row.get(1);
        let revenue_decimal: rust_decimal::Decimal = row.get(2);
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
        .with_state(state)
}
