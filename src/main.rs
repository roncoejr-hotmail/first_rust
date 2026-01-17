//
//
//
//
mod utils;
mod api;
mod server;
mod fpa_data_generation;


//
//
//
//
//
use std::env;
// use utils::test_write;
// use utils::process_inputs;
use utils::process_connection;
use utils::get_records;
use utils::open_postgres_db;
use utils::get_records_postgres;
use utils::insert_records_sqlite;
use utils::insert_records_postgres;
use utils::create_automotive_schema;
use utils::generate_sample_vehicles;
use utils::generate_sample_customers;
use utils::generate_sample_employees;
use utils::generate_sample_sales;
use utils::generate_sample_loans;
use utils::generate_sample_payments;
use utils::generate_sample_maintenance_history;
// use utils::open_sqlite_db;
use dotenv::dotenv;



//
//
//
//
//
fn main() {
    //
    //
    //
    let args: Vec<String> = env::args().collect();
    let mut i: usize = 1;
    let mut my_connection: sqlite::Connection;
    let mut table_name: Option<String> = None;
    let mut db_name: Option<String> = None;
    let mut use_postgres: bool = false;
    let mut populate_count: Option<usize> = None;
    let mut do_populate: bool = false;
    let mut create_schema: bool = false;
    let mut generate_sample_data: bool = false;

    //
    //
    //
    //
    dotenv().ok();

    //
    //
    //
    //
    match env::var("db_dir") {
        Ok(path) => println!("If doing local development, SQLite DB location: {}", path),
        Err(e) => println!("{}", e),
    }

    // First pass: check for --serve FIRST before anything else
    for (idx, arg) in args.iter().enumerate() {
        if arg == "--serve" {
            // Get db-name from args
            let mut serve_db_name = String::from("postgres");
            for i in 1..args.len() {
                if args[i] == "--db-name" && i + 1 < args.len() {
                    serve_db_name = args[i + 1].clone();
                    break;
                }
            }
            
            // Get port from args (can be after --serve or use default)
            let port: u16 = if idx + 1 < args.len() {
                args[idx + 1].parse().unwrap_or(3000)
            } else {
                3000
            };
            
            println!("🚀 Starting API server...");
            println!("📊 Database: {}", serve_db_name);
            println!("🔌 Port: {}", port);
            
            // Run the async server in a new tokio runtime
            let runtime = tokio::runtime::Runtime::new().unwrap();
            runtime.block_on(async {
                server::run_server(serve_db_name, port).await;
            });
            return;
        }
    }
    
    // Second pass: collect table name, db-name, --populate, --count, and check for --db-pgsql
    let mut j: usize = 1;
    while j < args.len() {
        if j < args.len() - 1 && args[j] == "--table" {
            table_name = Some(args[j+1].clone());
            println!("{}: {}", args[j], args[j+1]);
        } else if j < args.len() - 1 && args[j] == "--db-name" {
            db_name = Some(args[j+1].clone());
            println!("{}: {}", args[j], args[j+1]);
        } else if j < args.len() - 1 && args[j] == "--count" {
            populate_count = Some(args[j+1].parse()
                .expect("--count must be a valid number"));
            println!("{}: {}", args[j], args[j+1]);
        } else if args[j] == "--db-pgsql" {
            use_postgres = true;
            println!("{}", args[j]);
        } else if args[j] == "--populate" {
            do_populate = true;
            println!("{}", args[j]);
        } else if args[j] == "--create-schema" {
            create_schema = true;
            println!("{}", args[j]);
        } else if args[j] == "--generate-sample-data" {
            generate_sample_data = true;
            println!("{}", args[j]);
        }
        j += 1;
    }

    // Third pass: process other arguments
    while i < args.len() {
        //
        //
        //
        //
        let increment = match args[i].as_ref() {
            "--create-schema" => {
                    let db = db_name.as_deref().expect("--db-name parameter is required with --create-schema");
                    let mut pg_client = open_postgres_db(db);
                    match create_automotive_schema(&mut pg_client) {
                        Ok(_) => println!("Schema created successfully!"),
                        Err(e) => eprintln!("Error creating schema: {}", e),
                    }
                    1
                            },
            "--generate-sample-data" => {
                    let db = db_name.as_deref().expect("--db-name parameter is required with --generate-sample-data");
                    let count = populate_count.expect("--count is required when using --generate-sample-data");
                    let mut pg_client = open_postgres_db(db);
                    
                    println!("Generating sample data...");
                    match generate_sample_vehicles(&mut pg_client, count) {
                        Ok(n) => println!("Generated {} vehicles", n),
                        Err(e) => eprintln!("Error generating vehicles: {}", e),
                    }
                    match generate_sample_customers(&mut pg_client, count) {
                        Ok(n) => println!("Generated {} customers", n),
                        Err(e) => eprintln!("Error generating customers: {}", e),
                    }
                    match generate_sample_employees(&mut pg_client, count / 4 + 1) {
                        Ok(n) => println!("Generated {} employees", n),
                        Err(e) => eprintln!("Error generating employees: {}", e),
                    }
                    // Generate sales (uses available vehicles, customers, and salespersons)
                    match generate_sample_sales(&mut pg_client, count / 2) {
                        Ok(n) => println!("Generated {} sales", n),
                        Err(e) => eprintln!("Error generating sales: {}", e),
                    }
                    // Generate loans for financed sales
                    match generate_sample_loans(&mut pg_client) {
                        Ok(n) => println!("Generated {} loans", n),
                        Err(e) => eprintln!("Error generating loans: {}", e),
                    }
                    // Generate payment history (last 6 months for each loan)
                    match generate_sample_payments(&mut pg_client, 6) {
                        Ok(n) => println!("Generated {} payment records", n),
                        Err(e) => eprintln!("Error generating payments: {}", e),
                    }
                    // Generate maintenance history for vehicles
                    match generate_sample_maintenance_history(&mut pg_client, count) {
                        Ok(n) => println!("Generated {} maintenance records", n),
                        Err(e) => eprintln!("Error generating maintenance history: {}", e),
                    }
                    1
                            },
            "--generate-fpa-data" => {
                    let db = db_name.as_deref().expect("--db-name parameter is required with --generate-fpa-data");
                    let mut pg_client = open_postgres_db(db);
                    
                    println!("\n=== Generating FP&A Sample Data ===");
                    match fpa_data_generation::generate_all_fpa_data(&mut pg_client, 2023) {
                        Ok(_) => println!("\n✓ FP&A data generation complete!"),
                        Err(e) => eprintln!("✗ Error generating FP&A data: {}", e),
                    }
                    1
                            },
            "--db-file" => {
                    println!("{}: {}", args[i], args[i+1]);
                    my_connection = process_connection("--db-file", &args[i+1]);
                    // Use table name from --table parameter, or default to "records"
                    let table = table_name.as_deref().unwrap_or("records");
                    
                    if do_populate {
                        let count = populate_count.expect("--count is required when using --populate");
                        match insert_records_sqlite(&my_connection, table, count) {
                            Ok(inserted) => println!("Successfully inserted {} records", inserted),
                            Err(e) => eprintln!("Error inserting records: {}", e),
                        }
                    } else {
                        let records = get_records(&my_connection, table);
                        for row in &records {
                            for (column, value) in row {
                                print!("{} = {} | ", column, value);
                            }
                            println!();
                        }
                    }
                    2
                            },
            "--db-pgsql" => {
                    // Only process if not creating schema or generating sample data
                    if !create_schema && !generate_sample_data {
                        // Process PostgreSQL connection
                        let db = db_name.as_deref().expect("--db-name parameter is required with --db-pgsql");
                        let mut pg_client = open_postgres_db(db);
                        // Use table name from --table parameter, or default to "records"
                        let table = table_name.as_deref().unwrap_or("records");
                        
                        if do_populate {
                            let count = populate_count.expect("--count is required when using --populate");
                            match insert_records_postgres(&mut pg_client, table, count) {
                                Ok(inserted) => println!("Successfully inserted {} records", inserted),
                                Err(e) => eprintln!("Error inserting records: {}", e),
                            }
                        } else {
                            let records = get_records_postgres(&mut pg_client, table);
                            for row in &records {
                                for (column, value) in row {
                                    print!("{} = {} | ", column, value);
                                }
                                println!();
                            }
                        }
                    }
                    1
                            },
            "--table" => {
                    // Already processed in first pass, skip
                    2
                            },
            "--db-name" => {
                    // Already processed in first pass, skip
                    2
                            },
            "--count" => {
                    // Already processed in first pass, skip
                    2
                            },
            "--populate" => {
                    // Already processed in first pass, skip
                    1
                            },
            "--create-schema" => {
                    // Already processed in main match arm above, skip
                    1
                            },
            "--generate-sample-data" => {
                    // Already processed in main match arm above, skip
                    1
                            },
            "--generate-fpa-data" => {
                    // Already processed in main match arm above, skip
                    1
                            },
            _ => {
                    // process_connection(args[i], args[i+1]),
                    println!("{}", "unknown option");
                    // _ => println!("{}", "unknown option"),
                    1
                }
        };

        i += increment;

    }

    //
    //
    //
}
