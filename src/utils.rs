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
        let make: &str = makes[(0..makes.len()).fake::<usize>()];
        let model: &str = models[(0..models.len()).fake::<usize>()];
        let year: i32 = (2010..2025).fake::<i32>();
        let color: &str = colors[(0..colors.len()).fake::<usize>()];
        let mileage: i32 = (0..150000).fake::<i32>();
        let condition = if mileage == 0 { "New" } else if mileage < 50000 { "Certified Pre-owned" } else { "Used" };
        let vehicle_type: &str = vehicle_types[(0..vehicle_types.len()).fake::<usize>()];
        let cost_price: f64 = (15000.0..60000.0).fake::<f64>();
        let list_price = cost_price * 1.15;
        let status = if (0..2).fake::<i32>() == 0 { "available" } else { "pending" };
        let date_acquired: String = format!("{}-{:02}-{:02}", (2020..2024).fake::<i32>(), (1..13).fake::<i32>(), (1..29).fake::<i32>());
        let description: String = format!("Vehicle description {}", Faker.fake::<String>());
        
        client.execute(query, &[
            &vin, make, model, &year, color, &mileage, &condition, vehicle_type,
            &(cost_price as f32), &(list_price as f32), &status, &date_acquired, &description
        ]).map_err(|e| format!("Failed to insert vehicle: {}", e))?;
        
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
        let first_name: String = Faker.fake::<String>();
        let last_name: String = Faker.fake::<String>();
        let email: String = format!("{}.{}@{}.com", Faker.fake::<String>(), Faker.fake::<String>(), Faker.fake::<String>());
        let phone: String = format!("{}-{}-{}", (100..1000).fake::<i32>(), (100..1000).fake::<i32>(), (1000..10000).fake::<i32>());
        let address: String = format!("{} {}", (1..9999).fake::<i32>(), Faker.fake::<String>());
        let city: String = Faker.fake::<String>();
        let state: String = format!("{}", Faker.fake::<char>()).repeat(2).to_uppercase();
        let zip_code: String = format!("{}", (10000..99999).fake::<i32>());
        let date_of_birth: String = format!("{}-{:02}-{:02}", (1950..2000).fake::<i32>(), (1..13).fake::<i32>(), (1..29).fake::<i32>());
        let credit_score: i32 = (300..850).fake::<i32>();
        
        client.execute(query, &[
            &first_name, &last_name, &email, &phone, &address, &city, &state, &zip_code,
            &date_of_birth, &credit_score
        ]).map_err(|e| format!("Failed to insert customer: {}", e))?;
        
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
        let first_name: String = Faker.fake::<String>();
        let last_name: String = Faker.fake::<String>();
        let email: String = format!("{}.{}@{}.com", Faker.fake::<String>(), Faker.fake::<String>(), Faker.fake::<String>());
        let phone: String = format!("{}-{}-{}", (100..1000).fake::<i32>(), (100..1000).fake::<i32>(), (1000..10000).fake::<i32>());
        let role_idx: usize = (0..roles.len()).fake::<usize>();
        let role = roles[role_idx];
        let hire_date: String = format!("{}-{:02}-{:02}", (2015..2024).fake::<i32>(), (1..13).fake::<i32>(), (1..29).fake::<i32>());
        let commission_rate: f64 = match role {
            "Salesperson" => (2.0..5.0).fake::<f64>(),
            "Finance Manager" => (1.0..3.0).fake::<f64>(),
            _ => 0.0,
        };
        let is_active: bool = true;
        
        client.execute(query, &[
            &first_name, &last_name, &email, &phone, &role, &hire_date,
            &(commission_rate as f32), &is_active
        ]).map_err(|e| format!("Failed to insert employee: {}", e))?;
        
        inserted += 1;
    }
    
    Ok(inserted)
}
