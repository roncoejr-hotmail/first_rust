# first_rust

A Rust command-line tool for querying both SQLite and PostgreSQL databases. Supports reading credentials from `.pgpass` files and displaying table records in a consistent format.

## Features

- **SQLite Support**: Query local SQLite databases using `--db-file` parameter
- **PostgreSQL Support**: Query PostgreSQL databases using `--db-pgsql` and `--db-name` parameters
- **Automatic Credential Management**: Reads PostgreSQL credentials from `.pgpass` files
- **TLS/SSL Support**: Secure connections to PostgreSQL databases with TLS encryption
- **Flexible Table Queries**: Specify table names using the `--table` parameter

## Prerequisites

- Rust (latest stable version recommended)
- For PostgreSQL: A `.pgpass` file with database credentials (see Configuration section)

## Installation

1. Clone or download this repository
2. Build the project:
   ```bash
   cargo build --release
   ```

## Configuration

### SQLite Configuration

Set the `db_dir` environment variable (via `.env` file or system environment) to specify the directory containing your SQLite database files:

```bash
db_dir=/path/to/sqlite/databases
```

The program will look for database files in this directory.

### PostgreSQL Configuration

The program uses the `.pgpass` file for PostgreSQL authentication. Create a `.pgpass` file in your home directory with the following format:

```
hostname:port:database:username:password
```

Example:
```
localhost:5432:postgres:myuser:mypassword
*:5432:mydb:myuser:mypassword
```

**Note**: On Windows, the `.pgpass` file should be located at `%USERPROFILE%\.pgpass` or `%APPDATA%\postgresql\pgpass.conf`

You can also specify a custom location using the `PGPASSFILE` environment variable.

## Usage

### SQLite Database

Query a SQLite database:

```bash
cargo run -- --db-file my_database_file --table my_table
```

Or with the compiled binary:

```bash
./target/release/first-rust --db-file my_database_file --table my_table
```

- `--db-file`: Specifies the SQLite database filename (without `.db` extension)
- `--table`: Specifies the table name to query (optional, defaults to "records")

### PostgreSQL Database

Query a PostgreSQL database:

```bash
cargo run -- --db-pgsql --db-name my_database --table my_table
```

Or with the compiled binary:

```bash
./target/release/first-rust --db-pgsql --db-name my_database --table my_table
```

- `--db-pgsql`: Enables PostgreSQL mode
- `--db-name`: Specifies the PostgreSQL database name (required when using `--db-pgsql`)
- `--table`: Specifies the table name to query (optional, defaults to "records")

### Command-Line Arguments

Arguments can be provided in any order:

```bash
# These are equivalent:
cargo run -- --db-file mydb --table mytable
cargo run -- --table mytable --db-file mydb

# PostgreSQL examples:
cargo run -- --db-pgsql --db-name mydb --table mytable
cargo run -- --table mytable --db-pgsql --db-name mydb
```

### Output Format

Records are displayed with column names and values in the format:
```
column1 = value1 | column2 = value2 | column3 = value3 |
```

Each row is displayed on a separate line.

## Project Structure

```
first_rust/
├── Cargo.toml          # Project dependencies and configuration
├── README.md           # This file
├── src/
│   ├── main.rs         # Main entry point and argument parsing
│   └── utils.rs        # Database connection and query functions
└── data/               # Directory for SQLite database files (example)
```

## Dependencies

- `dotenv` - Load environment variables from `.env` files
- `sqlite` - SQLite database support
- `postgres` - PostgreSQL database support
- `postgres-native-tls` - TLS/SSL support for PostgreSQL connections
- `native-tls` - TLS implementation

## Notes

- **Security**: The program accepts self-signed SSL certificates for PostgreSQL connections (for development purposes). In production environments, use proper SSL certificates or add the server's certificate to your system's trust store.

- **Default Table**: If no `--table` parameter is provided, the program defaults to querying a table named "records".

- **Error Handling**: The program uses `.unwrap()` for error handling, which will panic on errors. This is suitable for development and learning purposes but should be improved for production use.

## Examples

### Query SQLite Database

```bash
# Set database directory (or use .env file)
export db_dir=./data

# Query a table
cargo run -- --db-file my_database_file --table users
```

### Query PostgreSQL Database

```bash
# Ensure .pgpass file is configured

# Query a table
cargo run -- --db-pgsql --db-name production_db --table customers
```

## License

This is a learning project. Feel free to use and modify as needed.
