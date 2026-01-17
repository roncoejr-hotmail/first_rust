//
//
//
//
//
use std::env;
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use fake::{Fake, Faker};
use rust_decimal::Decimal;
use std::str::FromStr;
use chrono::NaiveDate;


//
//
//
//
//
// pub fn process_inputs(the_arg: &str, the_arg_one: &str)  -> sqlite::Connection {

    //
    //
    //
    //
    // let m_connection = match the_arg {
        // "--db-file" => open_sqlite_db(the_arg_one),
        // _ => open_sqlite_db(the_arg_one),
    // };

    //
    //
    //
    //
    // m_connection

// }


//
//
//
//
//
pub fn process_connection(the_arg: &str, the_arg_one: &str) -> sqlite::Connection {

    //
    //
    //
    //
    let m_connection = match the_arg {
        // "--db-file" => open_sqlite_db(the_arg_one),
        _ => open_sqlite_db(the_arg_one),
    };

    //
    //
    //
    //
    m_connection

}



//
//
//
//
//
pub fn open_sqlite_db(the_db_file: &str) -> sqlite::Connection {
    //
    //
    //
    //
    let sub_dir = match env::var("db_dir") {
        Ok(path) => format!("{}", path),
        Err(e) => format!("{}", e),
    };

    //
    //
    //
    //
    let connection = sqlite::open(format!("{}/{}.db", sub_dir, the_db_file)).unwrap();

    //
    //
    //
    //
    connection
}

//
//
//
//
//
pub fn get_records(connection: &sqlite::Connection, table_name: &str) -> Vec<HashMap<String, String>> {
    //
    //
    //
    //
    let query = format!("SELECT * FROM {}", table_name);
    println!("Querying table: {}", table_name);
    let mut rows = Vec::new();
    
    //
    //
    //
    //
    connection.iterate(query, |pairs| {
        let mut row = HashMap::new();
        for &(column, value) in pairs.iter() {
            let value_str = value.unwrap_or("NULL").to_string();
            row.insert(column.to_string(), value_str);
        }
        rows.push(row);
        true
    }).unwrap();
    
    //
    //
    //
    //
    rows
}

//
//
//
//
//
pub fn read_pgpass(db_name: &str) -> Option<(String, u16, String, String)> {
    //
    //
    //
    //
    let pgpass_path = match env::var("PGPASSFILE") {
        Ok(path) => PathBuf::from(path),
        Err(_) => {
            let mut home = if let Ok(home) = env::var("HOME") {
                PathBuf::from(home)
            } else if let Ok(userprofile) = env::var("USERPROFILE") {
                PathBuf::from(userprofile)
            } else {
                return None;
            };
            home.push(".pgpass");
            home
        }
    };
    
    //
    //
    //
    //
    let contents = fs::read_to_string(&pgpass_path).ok()?;
    
    //
    //
    //
    //
    for line in contents.lines() {
        let parts: Vec<&str> = line.split(':').collect();
        if parts.len() >= 5 {
            let host = parts[0].to_string();
            let port_str = parts[1];
            let database = parts[2].to_string();
            let username = parts[3].to_string();
            let password = parts[4].to_string();
            
            //
            //
            if database == db_name || database == "*" {
                if let Ok(port) = port_str.parse::<u16>() {
                    return Some((host, port, username, password));
                }
            }
        }
    }
    
    None
}

//
//
//
//
//
pub fn open_postgres_db(db_name: &str) -> postgres::Client {
    //
    //
    //
    //
    let (host, port, username, password) = read_pgpass(db_name)
        .expect("Failed to read PostgreSQL credentials from .pgpass file");
    
    //
    //
    //
    //
    let connection_string = format!("postgresql://{}:{}@{}:{}/{}", 
                                     username, password, host, port, db_name);
    
    //
    //
    //
    //
    let tls = native_tls::TlsConnector::builder()
        .danger_accept_invalid_certs(true)
        .build()
        .expect("Failed to create TLS connector");
    let connector = postgres_native_tls::MakeTlsConnector::new(tls);
    let client = postgres::Client::connect(&connection_string, connector)
        .expect("Failed to connect to PostgreSQL database");
    
    //
    //
    //
    //
    client
}

//
//
//
//
//
pub fn get_records_postgres(client: &mut postgres::Client, table_name: &str) -> Vec<HashMap<String, String>> {
    //
    //
    //
    //
    // Get column names first
    let column_query = format!("SELECT column_name FROM information_schema.columns WHERE table_name = '{}' ORDER BY ordinal_position", table_name);
    let column_rows = client.query(&column_query, &[])
        .expect("Failed to get column names");
    
    let columns: Vec<String> = column_rows.iter()
        .map(|row| row.get::<_, String>(0))
        .collect();
    
    // Build query with explicit column casts to text
    let column_list: String = columns.iter()
        .map(|col| format!("{}::text AS {}", col, col))
        .collect::<Vec<_>>()
        .join(", ");
    
    let query = format!("SELECT {} FROM {}", column_list, table_name);
    println!("Querying table: {}", table_name);
    
    //
    //
    //
    //
    let rows = client.query(&query, &[])
        .expect("Failed to execute query");
    
    //
    //
    //
    //
    let mut result = Vec::new();
    
    for row in rows {
        let mut row_map = HashMap::new();
        for column in &columns {
            let value: String = row.get::<_, Option<String>>(column.as_str())
                .unwrap_or_else(|| "NULL".to_string());
            row_map.insert(column.clone(), value);
        }
        result.push(row_map);
    }
    
    //
    //
    //
    //
    result
}

//
//
//
//
//
pub fn generate_random_first_name() -> String {
    //
    //
    //
    //
    let name: String = Faker.fake();
    // Limit to 10 characters as per database constraint
    name.chars().take(10).collect()
}

//
//
//
//
//
pub fn generate_random_last_name() -> String {
    //
    //
    //
    //
    let name: String = Faker.fake();
    // Limit to 10 characters as per database constraint
    name.chars().take(10).collect()
}

//
//
//
//
//
pub fn insert_records_sqlite(connection: &sqlite::Connection, table_name: &str, count: usize) -> Result<usize, String> {
    //
    //
    //
    //
    let mut inserted = 0;
    for _ in 0..count {
        let fname = generate_random_first_name();
        let lname = generate_random_last_name();
        
        let query = format!("INSERT INTO {} (fname, lname) VALUES ('{}', '{}')", 
                           table_name, 
                           fname.replace("'", "''"), 
                           lname.replace("'", "''"));
        
        connection.execute(&query)
            .map_err(|e| format!("Failed to execute insert: {}", e))?;
        
        inserted += 1;
    }
    
    //
    //
    //
    //
    Ok(inserted)
}

//
//
//
//
//
pub fn insert_records_postgres(client: &mut postgres::Client, table_name: &str, count: usize) -> Result<usize, String> {
    //
    //
    //
    //
    let query = format!("INSERT INTO {} (fname, lname) VALUES ($1, $2)", table_name);
    
    let mut inserted = 0;
    for _ in 0..count {
        let fname = generate_random_first_name();
        let lname = generate_random_last_name();
        
        client.execute(&query, &[&fname, &lname])
            .map_err(|e| format!("Failed to insert record: {}", e))?;
        
        inserted += 1;
    }
    
    //
    //
    //
    //
    Ok(inserted)
}

//
//
//
//
//
pub fn create_automotive_schema(client: &mut postgres::Client) -> Result<(), String> {
    //
    //
    //
    //
    let schema_files = [
        "schema/01_create_vehicles.sql",
        "schema/02_create_customers.sql",
        "schema/03_create_employees.sql",
        "schema/04_create_trade_ins.sql",
        "schema/05_create_sales.sql",
        "schema/06_create_loans.sql",
        "schema/07_create_payments.sql",
        "schema/08_create_maintenance_history.sql",
    ];
    
    for file_path in &schema_files {
        let sql = fs::read_to_string(file_path)
            .map_err(|e| format!("Failed to read {}: {}", file_path, e))?;
        
        // Execute each statement separately (some files may have multiple statements)
        for statement in sql.split(';') {
            let trimmed = statement.trim();
            if !trimmed.is_empty() && !trimmed.starts_with("--") {
                client.execute(trimmed, &[])
                    .map_err(|e| format!("Failed to execute statement from {}: {}", file_path, e))?;
            }
        }
        
        println!("Executed schema file: {}", file_path);
    }
    
    Ok(())
}

//
//
//
//
//
pub fn generate_sample_vehicles(client: &mut postgres::Client, count: usize) -> Result<usize, String> {
    //
    //
    //
    //
    let mut inserted = 0;
    let query = "INSERT INTO vehicles (vin, make, model, year, color, mileage, condition, vehicle_type, cost_price, list_price, status, date_acquired, description) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)";
    
    let makes = vec!["Toyota", "Honda", "Ford", "Chevrolet", "BMW", "Mercedes", "Audi", "Volkswagen", "Nissan", "Hyundai"];
    let models = vec!["Camry", "Accord", "F-150", "Silverado", "3 Series", "C-Class", "A4", "Jetta", "Altima", "Elantra"];
    let colors = vec!["Black", "White", "Silver", "Gray", "Red", "Blue", "Green", "Brown"];
    let vehicle_types = vec!["Sedan", "SUV", "Truck", "Coupe", "Hatchback"];
    
    for _ in 0..count {
        let vin: String = (0..17).map(|_| {
            let chars = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789";
            let idx: usize = (0..chars.len()).fake::<usize>();
            chars.chars().nth(idx).unwrap()
        }).collect();
        let make: String = makes[(0..makes.len()).fake::<usize>()].to_string();
        let model: String = models[(0..models.len()).fake::<usize>()].to_string();
        let year: i32 = (2010..2025).fake::<i32>();
        let color: String = colors[(0..colors.len()).fake::<usize>()].to_string();
        let mileage: i32 = (0..150000).fake::<i32>();
        let condition: String = if mileage == 0 { "New".to_string() } else if mileage < 50000 { "Certified Pre-owned".to_string() } else { "Used".to_string() };
        let vehicle_type: String = vehicle_types[(0..vehicle_types.len()).fake::<usize>()].to_string();
        let cost_price: f64 = (15000.0..60000.0).fake::<f64>();
        let list_price = cost_price * 1.15;
        let status: String = if (0..2).fake::<i32>() == 0 { "available".to_string() } else { "pending".to_string() };
        let acquired_year: i32 = (2020..2024).fake::<i32>();
        let acquired_month: i32 = (1..13).fake::<i32>();
        let acquired_day: i32 = if acquired_month == 2 { (1..29).fake::<i32>() } else if acquired_month == 4 || acquired_month == 6 || acquired_month == 9 || acquired_month == 11 { (1..31).fake::<i32>() } else { (1..32).fake::<i32>() };
        let date_acquired = NaiveDate::from_ymd_opt(acquired_year, acquired_month as u32, acquired_day as u32).unwrap();
        let description: String = format!("Vehicle description {}", Faker.fake::<String>());
        
        // Convert DECIMAL values to strings for PostgreSQL
        let cost_price_str = format!("{:.2}", cost_price);
        let list_price_str = format!("{:.2}", list_price);
        
        // Debug: print values to identify the issue
        if inserted == 0 {
            eprintln!("DEBUG: vehicle_type = '{}', len = {}", vehicle_type, vehicle_type.len());
            eprintln!("DEBUG: cost_price = {}, cost_price_str = '{}'", cost_price, cost_price_str);
        }
        
        // Convert DECIMAL values to rust_decimal::Decimal for PostgreSQL
        let cost_price_decimal = Decimal::from_str(&format!("{:.2}", cost_price)).unwrap();
        let list_price_decimal = Decimal::from_str(&format!("{:.2}", list_price)).unwrap();
        
        // Debug: print values to identify the issue
        if inserted == 0 {
            eprintln!("DEBUG: vehicle_type = '{}', len = {}", vehicle_type, vehicle_type.len());
            eprintln!("DEBUG: cost_price = {}, cost_price_decimal = '{}'", cost_price, cost_price_decimal);
        }
        
        // Convert all String parameters to &str for proper serialization
        let vin_str: &str = &vin;
        let make_str: &str = &make;
        let model_str: &str = &model;
        let color_str: &str = &color;
        let condition_str: &str = &condition;
        let vehicle_type_str: &str = &vehicle_type;
        let status_str: &str = &status;
        let description_str: &str = &description;
        
        let result = client.query(query, &[
            &vin_str, &make_str, &model_str, &year, &color_str, &mileage,
            &condition_str, &vehicle_type_str, &cost_price_decimal, &list_price_decimal,
            &status_str, &date_acquired, &description_str
        ]);
        
        match result {
            Ok(_) => {},
            Err(e) => {
                eprintln!("FULL ERROR: {:?}", e);
                return Err(format!("Failed to insert vehicle (vin={}, vehicle_type='{}'): {}", vin, vehicle_type, e));
            }
        }
        
        inserted += 1;
    }
    
    Ok(inserted)
}

//
//
//
//
//
pub fn generate_sample_customers(client: &mut postgres::Client, count: usize) -> Result<usize, String> {
    //
    //
    //
    //
    let mut inserted = 0;
    let query = "INSERT INTO customers (first_name, last_name, email, phone, address, city, state, zip_code, date_of_birth, credit_score) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)";
    
    for _ in 0..count {
        let first_name: String = Faker.fake::<String>().chars().take(50).collect();
        let last_name: String = Faker.fake::<String>().chars().take(50).collect();
        let email: String = format!("{}.{}@{}.com", 
            Faker.fake::<String>().chars().take(30).collect::<String>(), 
            Faker.fake::<String>().chars().take(30).collect::<String>(), 
            Faker.fake::<String>().chars().take(30).collect::<String>()).chars().take(100).collect();
        let phone: String = format!("{}-{}-{}", (100..1000).fake::<i32>(), (100..1000).fake::<i32>(), (1000..10000).fake::<i32>());
        let address: String = format!("{} {}", (1..9999).fake::<i32>(), Faker.fake::<String>().chars().take(190).collect::<String>()).chars().take(200).collect();
        let city: String = Faker.fake::<String>().chars().take(50).collect();
        let us_states = vec!["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", 
                              "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
                              "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
                              "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
                              "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"];
        let state_idx: usize = (0..us_states.len()).fake::<usize>();
        let state: String = us_states[state_idx].to_string();
        let zip_code: String = format!("{}", (10000..99999).fake::<i32>());
        let birth_year: i32 = (1950..2000).fake::<i32>();
        let birth_month: i32 = (1..13).fake::<i32>();
        let birth_day: i32 = if birth_month == 2 { (1..29).fake::<i32>() } else if birth_month == 4 || birth_month == 6 || birth_month == 9 || birth_month == 11 { (1..31).fake::<i32>() } else { (1..32).fake::<i32>() };
        let date_of_birth = NaiveDate::from_ymd_opt(birth_year, birth_month as u32, birth_day as u32).unwrap();
        let credit_score: i32 = (300..850).fake::<i32>();
        
        // Debug: print values to identify the issue
        if inserted == 0 {
            eprintln!("DEBUG: zip_code = '{}', len = {}", zip_code, zip_code.len());
            eprintln!("DEBUG: state = '{}', len = {}", state, state.len());
        }
        
        // Convert all String parameters to &str for proper serialization
        let first_name_str: &str = &first_name;
        let last_name_str: &str = &last_name;
        let email_str: &str = &email;
        let phone_str: &str = &phone;
        let address_str: &str = &address;
        let city_str: &str = &city;
        let state_str: &str = &state;
        let zip_code_str: &str = &zip_code;
        
        client.execute(query, &[
            &first_name_str, &last_name_str, &email_str, &phone_str,
            &address_str, &city_str, &state_str, &zip_code_str,
            &date_of_birth, &credit_score
        ]).map_err(|e| format!("Failed to insert customer (zip_code='{}', state='{}'): {}", zip_code, state, e))?;
        
        inserted += 1;
    }
    
    Ok(inserted)
}

//
//
//
//
//
pub fn generate_sample_employees(client: &mut postgres::Client, count: usize) -> Result<usize, String> {
    //
    //
    //
    //
    let roles = vec!["Salesperson", "Finance Manager", "Sales Manager", "General Manager"];
    let mut inserted = 0;
    let query = "INSERT INTO employees (first_name, last_name, email, phone, role, hire_date, commission_rate, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)";
    
    for _ in 0..count {
        let first_name: String = Faker.fake::<String>().chars().take(50).collect();
        let last_name: String = Faker.fake::<String>().chars().take(50).collect();
        let email: String = format!("{}.{}@{}.com", 
            Faker.fake::<String>().chars().take(30).collect::<String>(), 
            Faker.fake::<String>().chars().take(30).collect::<String>(), 
            Faker.fake::<String>().chars().take(30).collect::<String>()).chars().take(100).collect();
        let phone: String = format!("{}-{}-{}", (100..1000).fake::<i32>(), (100..1000).fake::<i32>(), (1000..10000).fake::<i32>());
        let role_idx: usize = (0..roles.len()).fake::<usize>();
        let role: String = roles[role_idx].to_string();
        let hire_year: i32 = (2015..2024).fake::<i32>();
        let hire_month: i32 = (1..13).fake::<i32>();
        let hire_day: i32 = (1..29).fake::<i32>();
        let hire_date = NaiveDate::from_ymd_opt(hire_year, hire_month as u32, hire_day as u32).unwrap();
        let commission_rate: f64 = match role.as_str() {
            "Salesperson" => (2.0..5.0).fake::<f64>(),
            "Finance Manager" => (1.0..3.0).fake::<f64>(),
            _ => 0.0,
        };
        let is_active: bool = true;
        
        // Convert DECIMAL value to rust_decimal::Decimal for PostgreSQL
        let commission_rate_decimal = Decimal::from_str(&format!("{:.2}", commission_rate)).unwrap();
        
        // Debug: print values to identify the issue
        if inserted == 0 {
            eprintln!("DEBUG: role = '{}', len = {}", role, role.len());
            eprintln!("DEBUG: commission_rate = {}, commission_rate_decimal = '{}'", commission_rate, commission_rate_decimal);
        }
        
        // Convert all String parameters to &str for proper serialization
        let first_name_str: &str = &first_name;
        let last_name_str: &str = &last_name;
        let email_str: &str = &email;
        let phone_str: &str = &phone;
        let role_str: &str = &role;
        
        client.execute(query, &[
            &first_name_str, &last_name_str, &email_str, &phone_str,
            &role_str, &hire_date, &commission_rate_decimal, &is_active
        ]).map_err(|e| format!("Failed to insert employee (role='{}'): {}", role, e))?;
        
        inserted += 1;
    }
    
    Ok(inserted)
}

//
//
//
//
//
pub fn generate_sample_sales(client: &mut postgres::Client, count: usize) -> Result<usize, String> {
    //
    //
    //
    //
    let mut inserted = 0;
    let query = "INSERT INTO sales (vehicle_id, customer_id, salesperson_id, sale_date, sale_price, down_payment, payment_method, sale_status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING sale_id";
    
    // Get available vehicle IDs
    let vehicle_rows = client.query("SELECT vehicle_id, list_price FROM vehicles WHERE status = 'available' LIMIT $1", &[&(count as i64)])
        .map_err(|e| format!("Failed to get vehicles: {}", e))?;
    
    // Get customer IDs
    let customer_rows = client.query("SELECT customer_id FROM customers LIMIT $1", &[&(count as i64)])
        .map_err(|e| format!("Failed to get customers: {}", e))?;
    
    // Get employee IDs (salespersons only)
    let employee_rows = client.query("SELECT employee_id FROM employees WHERE role = 'Salesperson' LIMIT 10", &[])
        .map_err(|e| format!("Failed to get employees: {}", e))?;
    
    if vehicle_rows.is_empty() || customer_rows.is_empty() || employee_rows.is_empty() {
        return Err("Not enough vehicles, customers, or salespersons to create sales".to_string());
    }
    
    let payment_methods = vec!["Cash", "Finance", "Lease"];
    
    for i in 0..count.min(vehicle_rows.len()).min(customer_rows.len()) {
        let vehicle_id: i32 = vehicle_rows[i].get(0);
        let list_price_decimal: Decimal = vehicle_rows[i].get(1);
        let list_price: f64 = list_price_decimal.to_string().parse().unwrap();
        let customer_id: i32 = customer_rows[i % customer_rows.len()].get(0);
        let salesperson_idx: usize = (0..employee_rows.len()).fake::<usize>();
        let salesperson_id: i32 = employee_rows[salesperson_idx].get(0);
        
        let sale_price = list_price * (0.85..1.0).fake::<f64>();
        let payment_method_idx: usize = (0..payment_methods.len()).fake::<usize>();
        let payment_method: String = payment_methods[payment_method_idx].to_string();
        let down_payment = if payment_method == "Finance" || payment_method == "Lease" {
            sale_price * (0.1..0.3).fake::<f64>()
        } else {
            0.0
        };
        let sale_year: i32 = (2023..2024).fake::<i32>();
        let sale_month: i32 = (1..13).fake::<i32>();
        let sale_day: i32 = (1..29).fake::<i32>();
        let sale_date = NaiveDate::from_ymd_opt(sale_year, sale_month as u32, sale_day as u32).unwrap();
        let sale_status: String = "completed".to_string();
        
        let sale_price_decimal = Decimal::from_str(&format!("{:.2}", sale_price)).unwrap();
        let down_payment_decimal = Decimal::from_str(&format!("{:.2}", down_payment)).unwrap();
        let payment_method_str: &str = &payment_method;
        let sale_status_str: &str = &sale_status;
        
        let _row = client.query_one(query, &[
            &vehicle_id, &customer_id, &salesperson_id, &sale_date,
            &sale_price_decimal, &down_payment_decimal, &payment_method_str, &sale_status_str
        ]).map_err(|e| format!("Failed to insert sale: {}", e))?;
        
        // Update vehicle status to 'sold'
        client.execute("UPDATE vehicles SET status = 'sold' WHERE vehicle_id = $1", &[&vehicle_id])
            .map_err(|e| format!("Failed to update vehicle status: {}", e))?;
        
        inserted += 1;
    }
    
    Ok(inserted)
}

//
//
//
//
//
pub fn generate_sample_loans(client: &mut postgres::Client) -> Result<usize, String> {
    //
    //
    //
    //
    let mut inserted = 0;
    let query = "INSERT INTO loans (sale_id, loan_amount, interest_rate, term_months, monthly_payment, loan_start_date, loan_status, remaining_balance) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)";
    
    // Get sales that are financed (not cash)
    let sales_rows = client.query("SELECT sale_id, sale_price, down_payment, sale_date FROM sales WHERE payment_method IN ('Finance', 'Lease')", &[])
        .map_err(|e| format!("Failed to get sales: {}", e))?;
    
    for row in sales_rows {
        let sale_id: i32 = row.get(0);
        let sale_price_decimal: Decimal = row.get(1);
        let sale_price: f64 = sale_price_decimal.to_string().parse().unwrap();
        let down_payment_decimal: Decimal = row.get(2);
        let down_payment: f64 = down_payment_decimal.to_string().parse().unwrap();
        let sale_date: NaiveDate = row.get(3);
        
        let loan_amount = sale_price - down_payment;
        let interest_rate: f64 = (3.0..8.0).fake::<f64>();
        let term_months: i32 = vec![36, 48, 60, 72][(0..4).fake::<usize>()];
        
        // Calculate monthly payment (simplified)
        let monthly_rate = interest_rate / 100.0 / 12.0;
        let monthly_payment = if monthly_rate > 0.0 {
            loan_amount * (monthly_rate * (1.0 + monthly_rate).powi(term_months)) / ((1.0 + monthly_rate).powi(term_months) - 1.0)
        } else {
            loan_amount / term_months as f64
        };
        
        let loan_start_date = sale_date;
        let loan_status: String = "active".to_string();
        let remaining_balance = loan_amount;
        
        let loan_amount_decimal = Decimal::from_str(&format!("{:.2}", loan_amount)).unwrap();
        let interest_rate_decimal = Decimal::from_str(&format!("{:.2}", interest_rate)).unwrap();
        let monthly_payment_decimal = Decimal::from_str(&format!("{:.2}", monthly_payment)).unwrap();
        let remaining_balance_decimal = Decimal::from_str(&format!("{:.2}", remaining_balance)).unwrap();
        let loan_status_str: &str = &loan_status;
        
        client.execute(query, &[
            &sale_id, &loan_amount_decimal, &interest_rate_decimal, &term_months, &monthly_payment_decimal,
            &loan_start_date, &loan_status_str, &remaining_balance_decimal
        ]).map_err(|e| format!("Failed to insert loan: {}", e))?;
        
        inserted += 1;
    }
    
    Ok(inserted)
}

//
//
//
//
//
pub fn generate_sample_payments(client: &mut postgres::Client, months_back: i32) -> Result<usize, String> {
    //
    //
    //
    //
    let mut inserted = 0;
    let query = "INSERT INTO payments (loan_id, payment_date, payment_amount, payment_method, payment_status, principal_amount, interest_amount) VALUES ($1, $2, $3, $4, $5, $6, $7)";
    
    // Get active loans
    let loan_rows = client.query("SELECT loan_id, monthly_payment, loan_start_date, remaining_balance FROM loans WHERE loan_status = 'active'", &[])
        .map_err(|e| format!("Failed to get loans: {}", e))?;
    
    let payment_methods = vec!["ACH", "Check", "Credit Card", "Cash"];
    
    for row in loan_rows {
        let loan_id: i32 = row.get(0);
        let monthly_payment_decimal: Decimal = row.get(1);
        let monthly_payment: f64 = monthly_payment_decimal.to_string().parse().unwrap();
        let loan_start_date: NaiveDate = row.get(2);
        let remaining_balance_decimal: Decimal = row.get(3);
        let mut remaining_balance: f64 = remaining_balance_decimal.to_string().parse().unwrap();
        
        // Generate payments for the last N months
        for month_offset in 0..months_back {
            let payment_date = loan_start_date + chrono::Duration::days((month_offset * 30) as i64);
            
            // Simple interest calculation (simplified)
            let interest_amount = remaining_balance * 0.005;
            let principal_amount = monthly_payment - interest_amount;
            
            let payment_method_idx: usize = (0..payment_methods.len()).fake::<usize>();
            let payment_method: String = payment_methods[payment_method_idx].to_string();
            let payment_status: String = "processed".to_string();
            
            let monthly_payment_decimal = Decimal::from_str(&format!("{:.2}", monthly_payment)).unwrap();
            let principal_amount_decimal = Decimal::from_str(&format!("{:.2}", principal_amount)).unwrap();
            let interest_amount_decimal = Decimal::from_str(&format!("{:.2}", interest_amount)).unwrap();
            let payment_method_str: &str = &payment_method;
            let payment_status_str: &str = &payment_status;
            
            client.execute(query, &[
                &loan_id, &payment_date, &monthly_payment_decimal, &payment_method_str, &payment_status_str,
                &principal_amount_decimal, &interest_amount_decimal
            ]).map_err(|e| format!("Failed to insert payment: {}", e))?;
            
            inserted += 1;
            remaining_balance -= principal_amount;
        }
    }
    
    Ok(inserted)
}

//
//
//
//
//
pub fn generate_sample_maintenance_history(client: &mut postgres::Client, count: usize) -> Result<usize, String> {
    //
    //
    //
    //
    let mut inserted = 0;
    let query = "INSERT INTO maintenance_history (vehicle_id, service_date, service_type, mileage_at_service, service_provider, cost, description) VALUES ($1, $2, $3, $4, $5, $6, $7)";
    
    // Get vehicle IDs
    let vehicle_rows = client.query("SELECT vehicle_id, mileage FROM vehicles LIMIT $1", &[&(count as i64)])
        .map_err(|e| format!("Failed to get vehicles: {}", e))?;
    
    let service_types = vec!["Oil Change", "Tire Rotation", "Brake Service", "Inspection", "Repair", "Battery Replacement"];
    let service_providers = vec!["Auto Service Center", "Quick Lube", "Dealership Service", "Independent Mechanic"];
    
    for row in vehicle_rows {
        let vehicle_id: i32 = row.get(0);
        let current_mileage: i32 = row.get(1);
        
        // Generate 1-3 service records per vehicle
        let num_services: usize = (1..4).fake::<usize>();
        
        for _ in 0..num_services {
            let service_type_idx: usize = (0..service_types.len()).fake::<usize>();
            let service_type: String = service_types[service_type_idx].to_string();
            let service_provider_idx: usize = (0..service_providers.len()).fake::<usize>();
            let service_provider: String = service_providers[service_provider_idx].to_string();
            
            let mileage_at_service: i32 = (0..current_mileage).fake::<i32>();
            let cost: f64 = match &service_type[..] {
                "Oil Change" => (25.0..75.0).fake::<f64>(),
                "Tire Rotation" => (20.0..50.0).fake::<f64>(),
                "Brake Service" => (150.0..500.0).fake::<f64>(),
                "Inspection" => (50.0..150.0).fake::<f64>(),
                "Repair" => (200.0..2000.0).fake::<f64>(),
                _ => (50.0..300.0).fake::<f64>(),
            };
            
            let service_date: String = format!("{}-{:02}-{:02}", (2022..2024).fake::<i32>(), (1..13).fake::<i32>(), (1..29).fake::<i32>());
            let description = format!("{} service performed", service_type);
            
            client.execute(query, &[
                &vehicle_id, &service_date, &service_type, &mileage_at_service,
                &service_provider, &cost, &description
            ]).map_err(|e| format!("Failed to insert maintenance record: {}", e))?;
            
            inserted += 1;
        }
    }
    
    Ok(inserted)
}
