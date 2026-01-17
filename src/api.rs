use axum::{
    extract::State,
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

// Handler for sales performance dashboard
async fn get_sales_performance(
    State(state): State<Arc<AppState>>,
) -> Result<Json<SalesPerformance>, (StatusCode, String)> {
    let client = get_db_client(&state.db_name)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
    
    // Get overall metrics
    let metrics_row = client
        .query_one("
            SELECT 
                COUNT(*) as total_sales,
                COALESCE(SUM(sale_price), 0) as total_revenue,
                COALESCE(AVG(sale_price), 0) as avg_deal_size
            FROM sales
        ", &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;
    
    let total_sales_count: i64 = metrics_row.get(0);
    let total_revenue_decimal: Decimal = metrics_row.get(1);
    let total_revenue: f64 = total_revenue_decimal.to_string().parse().unwrap_or(0.0);
    let avg_deal_size_decimal: Decimal = metrics_row.get(2);
    let average_deal_size: f64 = avg_deal_size_decimal.to_string().parse().unwrap_or(0.0);
    
    // Get total commission paid (from employees table - sum of commission_rate * sales)
    let commission_row = client
        .query_one("
            SELECT COALESCE(SUM(s.sale_price * (e.commission_rate / 100)), 0) as total_commission
            FROM sales s
            JOIN employees e ON s.salesperson_id = e.employee_id
        ", &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;
    
    let total_commission_decimal: Decimal = commission_row.get(0);
    let total_commission_paid: f64 = total_commission_decimal.to_string().parse().unwrap_or(0.0);
    
    // Get top performers (salespeople)
    let performers_rows = client
        .query("
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
            WHERE e.role IN ('Salesperson', 'Sales Manager')
            GROUP BY e.employee_id, e.first_name, e.last_name, e.role
            ORDER BY total_revenue DESC
            LIMIT 10
        ", &[])
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
) -> Result<Json<InventoryOverview>, (StatusCode, String)> {
    let client = get_db_client(&state.db_name)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
    
    // Get total vehicle counts
    let counts_row = client
        .query_one("
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
                SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) as sold,
                COALESCE(SUM(CASE WHEN status = 'available' THEN cost_price ELSE 0 END), 0) as inventory_value
            FROM vehicles
        ", &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;
    
    let total_vehicles: i64 = counts_row.get(0);
    let available_vehicles: i64 = counts_row.get(1);
    let sold_vehicles: i64 = counts_row.get(2);
    let inventory_value_decimal: Decimal = counts_row.get(3);
    let total_inventory_value: f64 = inventory_value_decimal.to_string().parse().unwrap_or(0.0);
    
    // Get average days in inventory (for sold vehicles)
    let days_row = client
        .query_one("
            SELECT COALESCE(AVG(s.sale_date - v.date_acquired), 0) as avg_days
            FROM vehicles v
            JOIN sales s ON v.vehicle_id = s.vehicle_id
            WHERE v.status = 'sold'
        ", &[])
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;
    
    let days_decimal: Decimal = days_row.get(0);
    let average_days_in_inventory: f64 = days_decimal.to_string().parse().unwrap_or(0.0);
    
    // Get vehicles by type
    let type_rows = client
        .query("
            SELECT 
                vehicle_type,
                SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
                SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) as sold,
                COUNT(*) as total,
                COALESCE(SUM(CASE WHEN status = 'available' THEN cost_price ELSE 0 END), 0) as total_value
            FROM vehicles
            GROUP BY vehicle_type
            ORDER BY total DESC
        ", &[])
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
    let analysis_rows = client
        .query("
            SELECT 
                v.vehicle_type,
                AVG(v.cost_price) as avg_cost,
                AVG(s.sale_price) as avg_sale_price,
                AVG((s.sale_price - v.cost_price) / v.cost_price * 100) as avg_markup,
                COUNT(*) as count
            FROM vehicles v
            JOIN sales s ON v.vehicle_id = s.vehicle_id
            WHERE v.status = 'sold'
            GROUP BY v.vehicle_type
            ORDER BY count DESC
        ", &[])
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
        .with_state(state)
}
