//
//
//
//
//
use std::env;


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
