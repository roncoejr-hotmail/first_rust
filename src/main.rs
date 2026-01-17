//
//
//
//
mod utils;


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
        Ok(path) => println!("SQLite DB location: {}", path),
        Err(e) => println!("{}", e),
    }

    // First pass: collect table name, db-name, --populate, --count, and check for --db-pgsql
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
        }
        j += 1;
    }

    // Second pass: process other arguments
    while i < args.len() {
        //
        //
        //
        //
        let increment = match args[i].as_ref() {
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
