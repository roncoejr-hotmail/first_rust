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

    while i < args.len() {
        //
        //
        //
        //
        match args[i].as_ref() {
            "--db-file" => {
                    println!("{}: {}", args[i], args[i+1]);
                    my_connection = process_connection("--db-file", &args[i+1]);
                    // Get table name from next argument, or use "records" as default
                    let table_name = if i + 2 < args.len() { &args[i+2] } else { "records" };
                    let records = get_records(&my_connection, table_name);
                    for row in &records {
                        for (column, value) in row {
                            print!("{} = {} | ", column, value);
                        }
                        println!();
                    }
                            },
            _ => {
                    // process_connection(args[i], args[i+1]),
                    println!("{}", "unknown option");
                    // _ => println!("{}", "unknown option"),
                }

        //
        //
        //
        //
        }

        i+=2;

    }

    //
    //
    //
}
