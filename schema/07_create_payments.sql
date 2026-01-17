-- Payments Table
CREATE TABLE IF NOT EXISTS payments (
    payment_id SERIAL PRIMARY KEY,
    loan_id INTEGER NOT NULL REFERENCES loans(loan_id),
    payment_date DATE NOT NULL,
    payment_amount DECIMAL(10, 2) NOT NULL CHECK (payment_amount > 0),
    payment_method VARCHAR(20) CHECK (payment_method IN ('Check', 'ACH', 'Credit Card', 'Cash')),
    payment_status VARCHAR(20) DEFAULT 'processed' CHECK (payment_status IN ('processed', 'pending', 'failed', 'refunded')),
    principal_amount DECIMAL(10, 2) DEFAULT 0 CHECK (principal_amount >= 0),
    interest_amount DECIMAL(10, 2) DEFAULT 0 CHECK (interest_amount >= 0),
    late_fee DECIMAL(10, 2) DEFAULT 0 CHECK (late_fee >= 0),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_loan ON payments(loan_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);
