use axum::{
    extract::State,
    http::StatusCode,
    response::Json,
    routing::get,
    Router,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio_postgres::NoTls;
use tokio_native_tls::TlsConnector;
use rust_decimal::Decimal;

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
    
    let connector = TlsConnector::from(tls);
    
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
) -> Result<Json<ExecutiveOverview>, (StatusCode, String)> {
    let client = get_db_client(&state.db_name)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
    
    // Get total revenue
    let revenue_row = client
        .query_one("SELECT COALESCE(SUM(sale_price), 0) as total FROM sales", &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;
    let total_revenue: Decimal = revenue_row.get(0);
    let total_revenue: f64 = total_revenue.to_string().parse().unwrap_or(0.0);
    
    // Get total sales count
    let sales_row = client
        .query_one("SELECT COUNT(*) as count FROM sales", &[])
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
    let avg_row = client
        .query_one("SELECT COALESCE(AVG(sale_price), 0) as avg FROM sales", &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;
    let average_sale_price_decimal: Decimal = avg_row.get(0);
    let average_sale_price: f64 = average_sale_price_decimal.to_string().parse().unwrap_or(0.0);
    
    // Get revenue by month
    let monthly_rows = client
        .query("
            SELECT 
                TO_CHAR(sale_date, 'YYYY-MM') as month,
                SUM(sale_price) as revenue,
                COUNT(*) as count
            FROM sales
            GROUP BY TO_CHAR(sale_date, 'YYYY-MM')
            ORDER BY month DESC
            LIMIT 12
        ", &[])
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
    let payment_rows = client
        .query("
            SELECT 
                payment_method,
                COUNT(*) as count,
                SUM(sale_price) as total
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
        sales_by_payment_method.push(PaymentMethodStat {
            method,
            count: count as i32,
            total_value,
        });
    }
    
    // Get top selling vehicle types
    let types_rows = client
        .query("
            SELECT 
                v.vehicle_type,
                COUNT(*) as count,
                SUM(s.sale_price) as revenue
            FROM sales s
            JOIN vehicles v ON s.vehicle_id = v.vehicle_id
            GROUP BY v.vehicle_type
            ORDER BY count DESC
            LIMIT 5
        ", &[])
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
