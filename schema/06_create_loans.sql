-- Loans/Financing Table
CREATE TABLE IF NOT EXISTS loans (
    loan_id SERIAL PRIMARY KEY,
    sale_id INTEGER UNIQUE NOT NULL REFERENCES sales(sale_id),
    loan_amount DECIMAL(10, 2) NOT NULL CHECK (loan_amount > 0),
    interest_rate DECIMAL(5, 2) NOT NULL CHECK (interest_rate >= 0),
    term_months INTEGER NOT NULL CHECK (term_months > 0),
    monthly_payment DECIMAL(10, 2) NOT NULL CHECK (monthly_payment > 0),
    loan_start_date DATE NOT NULL,
    loan_end_date DATE,
    loan_status VARCHAR(20) DEFAULT 'approved' CHECK (loan_status IN ('approved', 'active', 'paid_off', 'defaulted', 'refinanced')),
    remaining_balance DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(loan_status);
CREATE INDEX IF NOT EXISTS idx_loans_sale ON loans(sale_id);
