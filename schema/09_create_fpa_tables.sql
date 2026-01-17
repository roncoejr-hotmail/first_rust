-- =====================================================
-- Financial Planning & Analysis (FP&A) Schema
-- =====================================================
-- This script creates tables for budgeting, forecasting,
-- variance analysis, KPI tracking, and financial planning
-- =====================================================

-- =====================================================
-- 1. COST CENTERS
-- =====================================================
-- Organizational units for budget allocation and tracking
DROP TABLE IF EXISTS cost_centers CASCADE;
CREATE TABLE cost_centers (
    cost_center_id SERIAL PRIMARY KEY,
    cost_center_code VARCHAR(20) UNIQUE NOT NULL,
    cost_center_name VARCHAR(100) NOT NULL,
    department VARCHAR(50),
    manager_id INT REFERENCES employees(employee_id),
    budget_allocation DECIMAL(12,2),
    is_active BOOLEAN DEFAULT true,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cost_centers_department ON cost_centers(department);
CREATE INDEX idx_cost_centers_manager ON cost_centers(manager_id);
CREATE INDEX idx_cost_centers_active ON cost_centers(is_active);

-- =====================================================
-- 2. BUDGETS
-- =====================================================
-- Budget planning and allocation by period and category
DROP TABLE IF EXISTS budgets CASCADE;
CREATE TABLE budgets (
    budget_id SERIAL PRIMARY KEY,
    fiscal_year INT NOT NULL,
    fiscal_quarter INT CHECK (fiscal_quarter BETWEEN 1 AND 4),
    fiscal_month INT CHECK (fiscal_month BETWEEN 1 AND 12),
    category VARCHAR(50) NOT NULL, -- 'revenue', 'cogs', 'operating_expenses', 'marketing', etc.
    subcategory VARCHAR(100),
    department VARCHAR(50),
    cost_center_id INT REFERENCES cost_centers(cost_center_id),
    budgeted_amount DECIMAL(12,2) NOT NULL,
    notes TEXT,
    created_by INT REFERENCES employees(employee_id),
    created_date DATE DEFAULT CURRENT_DATE,
    last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'locked', 'rejected'))
);

CREATE INDEX idx_budgets_fiscal_year ON budgets(fiscal_year);
CREATE INDEX idx_budgets_fiscal_quarter ON budgets(fiscal_year, fiscal_quarter);
CREATE INDEX idx_budgets_fiscal_month ON budgets(fiscal_year, fiscal_month);
CREATE INDEX idx_budgets_category ON budgets(category);
CREATE INDEX idx_budgets_department ON budgets(department);
CREATE INDEX idx_budgets_cost_center ON budgets(cost_center_id);
CREATE INDEX idx_budgets_status ON budgets(status);

-- =====================================================
-- 3. ACTUALS
-- =====================================================
-- Actual financial transactions for variance analysis
DROP TABLE IF EXISTS actuals CASCADE;
CREATE TABLE actuals (
    actual_id SERIAL PRIMARY KEY,
    transaction_date DATE NOT NULL,
    fiscal_year INT NOT NULL,
    fiscal_quarter INT,
    fiscal_month INT,
    category VARCHAR(50) NOT NULL,
    subcategory VARCHAR(100),
    department VARCHAR(50),
    cost_center_id INT REFERENCES cost_centers(cost_center_id),
    actual_amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    reference_type VARCHAR(50), -- 'sale', 'expense', 'payroll', 'maintenance', etc.
    reference_id INT, -- Links to sales, expenses, maintenance, etc.
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_actuals_transaction_date ON actuals(transaction_date);
CREATE INDEX idx_actuals_fiscal_period ON actuals(fiscal_year, fiscal_month);
CREATE INDEX idx_actuals_category ON actuals(category);
CREATE INDEX idx_actuals_department ON actuals(department);
CREATE INDEX idx_actuals_cost_center ON actuals(cost_center_id);
CREATE INDEX idx_actuals_reference ON actuals(reference_type, reference_id);

-- =====================================================
-- 4. FORECAST SCENARIOS
-- =====================================================
-- Define multiple forecast scenarios for planning
DROP TABLE IF EXISTS forecast_scenarios CASCADE;
CREATE TABLE forecast_scenarios (
    scenario_id SERIAL PRIMARY KEY,
    scenario_name VARCHAR(100) NOT NULL,
    scenario_type VARCHAR(50) NOT NULL DEFAULT 'most_likely' 
        CHECK (scenario_type IN ('best_case', 'worst_case', 'most_likely', 'custom', 'rolling')),
    fiscal_year INT NOT NULL,
    description TEXT,
    assumptions TEXT, -- JSON field with key assumptions
    created_by INT REFERENCES employees(employee_id),
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_forecast_scenarios_year ON forecast_scenarios(fiscal_year);
CREATE INDEX idx_forecast_scenarios_type ON forecast_scenarios(scenario_type);
CREATE INDEX idx_forecast_scenarios_active ON forecast_scenarios(is_active);

-- =====================================================
-- 5. FORECAST DATA
-- =====================================================
-- Forecasted values by scenario and period
DROP TABLE IF EXISTS forecast_data CASCADE;
CREATE TABLE forecast_data (
    forecast_id SERIAL PRIMARY KEY,
    scenario_id INT NOT NULL REFERENCES forecast_scenarios(scenario_id) ON DELETE CASCADE,
    forecast_date DATE NOT NULL,
    fiscal_year INT NOT NULL,
    fiscal_quarter INT,
    fiscal_month INT,
    category VARCHAR(50) NOT NULL,
    subcategory VARCHAR(100),
    department VARCHAR(50),
    forecasted_amount DECIMAL(12,2) NOT NULL,
    confidence_level VARCHAR(20) DEFAULT 'medium' 
        CHECK (confidence_level IN ('high', 'medium', 'low')),
    notes TEXT,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_forecast_data_scenario ON forecast_data(scenario_id);
CREATE INDEX idx_forecast_data_date ON forecast_data(forecast_date);
CREATE INDEX idx_forecast_data_fiscal_period ON forecast_data(fiscal_year, fiscal_month);
CREATE INDEX idx_forecast_data_category ON forecast_data(category);

-- =====================================================
-- 6. KPI DEFINITIONS
-- =====================================================
-- Define trackable KPIs with targets and thresholds
DROP TABLE IF EXISTS kpi_definitions CASCADE;
CREATE TABLE kpi_definitions (
    kpi_id SERIAL PRIMARY KEY,
    kpi_name VARCHAR(100) NOT NULL,
    kpi_code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    calculation_method TEXT, -- SQL or formula description
    unit VARCHAR(20) NOT NULL DEFAULT 'number' 
        CHECK (unit IN ('currency', 'percentage', 'count', 'ratio', 'days', 'number')),
    target_value DECIMAL(12,2),
    threshold_red DECIMAL(12,2), -- Below this is red (poor performance)
    threshold_yellow DECIMAL(12,2), -- Below this is yellow (warning)
    threshold_green DECIMAL(12,2), -- Above this is green (good performance)
    category VARCHAR(50), -- 'financial', 'sales', 'inventory', 'customer', 'employee'
    frequency VARCHAR(20) DEFAULT 'monthly' 
        CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
    is_active BOOLEAN DEFAULT true,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_kpi_definitions_category ON kpi_definitions(category);
CREATE INDEX idx_kpi_definitions_active ON kpi_definitions(is_active);
CREATE INDEX idx_kpi_definitions_frequency ON kpi_definitions(frequency);

-- =====================================================
-- 7. KPI ACTUALS
-- =====================================================
-- Actual KPI values over time
DROP TABLE IF EXISTS kpi_actuals CASCADE;
CREATE TABLE kpi_actuals (
    kpi_actual_id SERIAL PRIMARY KEY,
    kpi_id INT NOT NULL REFERENCES kpi_definitions(kpi_id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    actual_value DECIMAL(12,2) NOT NULL,
    target_value DECIMAL(12,2),
    variance DECIMAL(12,2), -- actual - target
    variance_percentage DECIMAL(5,2), -- (actual - target) / target * 100
    status VARCHAR(20) CHECK (status IN ('green', 'yellow', 'red')),
    notes TEXT,
    calculated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_kpi_actuals_kpi ON kpi_actuals(kpi_id);
CREATE INDEX idx_kpi_actuals_period ON kpi_actuals(period_start, period_end);
CREATE INDEX idx_kpi_actuals_status ON kpi_actuals(status);

-- =====================================================
-- 8. EXPENSES
-- =====================================================
-- Operating expenses tracking
DROP TABLE IF EXISTS expenses CASCADE;
CREATE TABLE expenses (
    expense_id SERIAL PRIMARY KEY,
    expense_date DATE NOT NULL,
    expense_type VARCHAR(50) NOT NULL, -- 'payroll', 'rent', 'utilities', 'marketing', 'insurance', etc.
    category VARCHAR(50), -- Maps to budget categories
    cost_center_id INT REFERENCES cost_centers(cost_center_id),
    amount DECIMAL(12,2) NOT NULL,
    vendor VARCHAR(100),
    description TEXT,
    is_recurring BOOLEAN DEFAULT false,
    recurrence_frequency VARCHAR(20), -- 'monthly', 'quarterly', 'yearly'
    approved_by INT REFERENCES employees(employee_id),
    approval_date DATE,
    status VARCHAR(20) DEFAULT 'pending' 
        CHECK (status IN ('pending', 'approved', 'rejected', 'paid', 'cancelled')),
    payment_date DATE,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_expenses_type ON expenses(expense_type);
CREATE INDEX idx_expenses_cost_center ON expenses(cost_center_id);
CREATE INDEX idx_expenses_status ON expenses(status);
CREATE INDEX idx_expenses_recurring ON expenses(is_recurring);

-- =====================================================
-- 9. ROLLING FORECASTS
-- =====================================================
-- Continuous rolling forecast tracking
DROP TABLE IF EXISTS rolling_forecasts CASCADE;
CREATE TABLE rolling_forecasts (
    rolling_forecast_id SERIAL PRIMARY KEY,
    forecast_period DATE NOT NULL, -- Month/Quarter being forecasted
    category VARCHAR(50) NOT NULL,
    subcategory VARCHAR(100),
    department VARCHAR(50),
    forecasted_value DECIMAL(12,2) NOT NULL,
    actual_value DECIMAL(12,2),
    variance DECIMAL(12,2), -- actual - forecast
    variance_percentage DECIMAL(5,2), -- (actual - forecast) / forecast * 100
    forecast_created_date TIMESTAMP NOT NULL,
    actual_recorded_date TIMESTAMP,
    notes TEXT,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rolling_forecasts_period ON rolling_forecasts(forecast_period);
CREATE INDEX idx_rolling_forecasts_category ON rolling_forecasts(category);
CREATE INDEX idx_rolling_forecasts_created ON rolling_forecasts(forecast_created_date);

-- =====================================================
-- 10. FINANCIAL ASSUMPTIONS
-- =====================================================
-- Key planning assumptions (growth rates, inflation, etc.)
DROP TABLE IF EXISTS financial_assumptions CASCADE;
CREATE TABLE financial_assumptions (
    assumption_id SERIAL PRIMARY KEY,
    fiscal_year INT NOT NULL,
    assumption_name VARCHAR(100) NOT NULL,
    assumption_value DECIMAL(12,4) NOT NULL,
    assumption_type VARCHAR(50) NOT NULL, -- 'growth_rate', 'inflation', 'discount_rate', 'interest_rate', etc.
    description TEXT,
    source VARCHAR(200), -- Where the assumption came from
    confidence_level VARCHAR(20) DEFAULT 'medium' 
        CHECK (confidence_level IN ('high', 'medium', 'low')),
    scenario_id INT REFERENCES forecast_scenarios(scenario_id), -- Link to specific scenarios
    created_by INT REFERENCES employees(employee_id),
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_assumptions_fiscal_year ON financial_assumptions(fiscal_year);
CREATE INDEX idx_assumptions_type ON financial_assumptions(assumption_type);
CREATE INDEX idx_assumptions_scenario ON financial_assumptions(scenario_id);

-- =====================================================
-- 11. VARIANCE COMMENTS
-- =====================================================
-- Commentary and analysis on budget variances
DROP TABLE IF EXISTS variance_comments CASCADE;
CREATE TABLE variance_comments (
    comment_id SERIAL PRIMARY KEY,
    fiscal_year INT NOT NULL,
    fiscal_month INT NOT NULL,
    category VARCHAR(50) NOT NULL,
    subcategory VARCHAR(100),
    variance_amount DECIMAL(12,2),
    variance_percentage DECIMAL(5,2),
    explanation TEXT NOT NULL,
    action_plan TEXT,
    status VARCHAR(20) DEFAULT 'open' 
        CHECK (status IN ('open', 'monitoring', 'resolved', 'no_action_needed')),
    priority VARCHAR(20) DEFAULT 'medium' 
        CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    created_by INT REFERENCES employees(employee_id),
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_date TIMESTAMP
);

CREATE INDEX idx_variance_comments_period ON variance_comments(fiscal_year, fiscal_month);
CREATE INDEX idx_variance_comments_category ON variance_comments(category);
CREATE INDEX idx_variance_comments_status ON variance_comments(status);
CREATE INDEX idx_variance_comments_priority ON variance_comments(priority);

-- =====================================================
-- 12. BUDGET VERSIONS
-- =====================================================
-- Track budget revisions and changes
DROP TABLE IF EXISTS budget_versions CASCADE;
CREATE TABLE budget_versions (
    version_id SERIAL PRIMARY KEY,
    fiscal_year INT NOT NULL,
    version_number INT NOT NULL,
    version_name VARCHAR(100) NOT NULL, -- 'Initial Budget', 'Revised Q2', etc.
    description TEXT,
    is_current BOOLEAN DEFAULT false,
    created_by INT REFERENCES employees(employee_id),
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_by INT REFERENCES employees(employee_id),
    approval_date TIMESTAMP,
    UNIQUE(fiscal_year, version_number)
);

CREATE INDEX idx_budget_versions_year ON budget_versions(fiscal_year);
CREATE INDEX idx_budget_versions_current ON budget_versions(is_current);

-- Add budget_version_id to budgets table
ALTER TABLE budgets ADD COLUMN budget_version_id INT REFERENCES budget_versions(version_id);
CREATE INDEX idx_budgets_version ON budgets(budget_version_id);

-- =====================================================
-- HELPER VIEWS
-- =====================================================

-- View: Budget vs Actual by Month
CREATE OR REPLACE VIEW vw_budget_vs_actual_monthly AS
SELECT 
    b.fiscal_year,
    b.fiscal_month,
    b.category,
    b.subcategory,
    b.department,
    SUM(b.budgeted_amount) as budgeted_amount,
    COALESCE(SUM(a.actual_amount), 0) as actual_amount,
    COALESCE(SUM(a.actual_amount), 0) - SUM(b.budgeted_amount) as variance,
    CASE 
        WHEN SUM(b.budgeted_amount) != 0 
        THEN ((COALESCE(SUM(a.actual_amount), 0) - SUM(b.budgeted_amount)) / SUM(b.budgeted_amount) * 100)
        ELSE 0 
    END as variance_percentage
FROM budgets b
LEFT JOIN actuals a ON 
    b.fiscal_year = a.fiscal_year AND 
    b.fiscal_month = a.fiscal_month AND 
    b.category = a.category AND 
    COALESCE(b.subcategory, '') = COALESCE(a.subcategory, '') AND
    COALESCE(b.department, '') = COALESCE(a.department, '')
WHERE b.status = 'approved'
GROUP BY b.fiscal_year, b.fiscal_month, b.category, b.subcategory, b.department;

-- View: KPI Performance Summary
CREATE OR REPLACE VIEW vw_kpi_performance_summary AS
SELECT 
    kd.kpi_id,
    kd.kpi_name,
    kd.kpi_code,
    kd.category,
    kd.unit,
    ka.period_start,
    ka.period_end,
    ka.actual_value,
    kd.target_value,
    ka.variance,
    ka.variance_percentage,
    ka.status,
    CASE 
        WHEN ka.actual_value >= kd.threshold_green THEN 'green'
        WHEN ka.actual_value >= kd.threshold_yellow THEN 'yellow'
        ELSE 'red'
    END as performance_indicator
FROM kpi_definitions kd
LEFT JOIN kpi_actuals ka ON kd.kpi_id = ka.kpi_id
WHERE kd.is_active = true;

-- View: Rolling Forecast Accuracy
CREATE OR REPLACE VIEW vw_forecast_accuracy AS
SELECT 
    rf.forecast_period,
    rf.category,
    COUNT(*) as forecast_count,
    AVG(ABS(rf.variance_percentage)) as avg_variance_percentage,
    SUM(CASE WHEN ABS(rf.variance_percentage) <= 5 THEN 1 ELSE 0 END)::DECIMAL / COUNT(*) * 100 as accuracy_within_5pct
FROM rolling_forecasts rf
WHERE rf.actual_value IS NOT NULL
GROUP BY rf.forecast_period, rf.category;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE cost_centers IS 'Organizational units for budget allocation and expense tracking';
COMMENT ON TABLE budgets IS 'Budget planning and allocation by fiscal period and category';
COMMENT ON TABLE actuals IS 'Actual financial transactions for variance analysis against budget';
COMMENT ON TABLE forecast_scenarios IS 'Multiple forecast scenarios for scenario planning and what-if analysis';
COMMENT ON TABLE forecast_data IS 'Forecasted financial values by scenario and period';
COMMENT ON TABLE kpi_definitions IS 'Key Performance Indicators with targets and threshold definitions';
COMMENT ON TABLE kpi_actuals IS 'Actual KPI performance values over time';
COMMENT ON TABLE expenses IS 'Operating expenses and overhead tracking';
COMMENT ON TABLE rolling_forecasts IS 'Continuous rolling forecast for forward-looking projections';
COMMENT ON TABLE financial_assumptions IS 'Key planning assumptions used in budgets and forecasts';
COMMENT ON TABLE variance_comments IS 'Explanatory comments and action plans for significant variances';
COMMENT ON TABLE budget_versions IS 'Version control for budget changes and revisions';

-- =====================================================
-- END OF FP&A SCHEMA
-- =====================================================
