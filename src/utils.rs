//
//
//
//
//
use std::env;
use std::collections::HashMap;


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
pub fn get_records(connection: &sqlite::Connection) -> Vec<HashMap<String, String>> {
    //
    //
    //
    //
    let query = "SELECT * FROM test_table";
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
