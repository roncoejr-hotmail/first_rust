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
