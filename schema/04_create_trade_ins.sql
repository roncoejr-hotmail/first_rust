-- Trade-ins Table
CREATE TABLE IF NOT EXISTS trade_ins (
    trade_in_id SERIAL PRIMARY KEY,
    sale_id INTEGER UNIQUE,
    vin VARCHAR(17),
    make VARCHAR(50),
    model VARCHAR(50),
    year INTEGER,
    mileage INTEGER,
    condition VARCHAR(20),
    trade_in_value DECIMAL(10, 2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
