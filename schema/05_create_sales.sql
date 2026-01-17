-- Sales Transactions Table
CREATE TABLE IF NOT EXISTS sales (
    sale_id SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(vehicle_id),
    customer_id INTEGER NOT NULL REFERENCES customers(customer_id),
    salesperson_id INTEGER NOT NULL REFERENCES employees(employee_id),
    sale_date DATE NOT NULL,
    sale_price DECIMAL(10, 2) NOT NULL CHECK (sale_price > 0),
    down_payment DECIMAL(10, 2) DEFAULT 0 CHECK (down_payment >= 0),
    payment_method VARCHAR(20) CHECK (payment_method IN ('Cash', 'Finance', 'Lease')),
    trade_in_id INTEGER REFERENCES trade_ins(trade_in_id),
    sale_status VARCHAR(20) DEFAULT 'pending' CHECK (sale_status IN ('completed', 'pending', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_salesperson ON sales(salesperson_id);
CREATE INDEX IF NOT EXISTS idx_sales_vehicle ON sales(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(sale_status);
