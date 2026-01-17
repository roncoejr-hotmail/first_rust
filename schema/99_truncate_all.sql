-- Truncate all tables and reset sequences
-- Run this to clear all data and start fresh
-- WARNING: This will delete ALL data from the database

-- Truncate FP&A tables first (if they exist)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'variance_comments') THEN
        TRUNCATE TABLE variance_comments, kpi_actuals, kpi_definitions, rolling_forecasts, 
                       forecast_data, forecast_scenarios, actuals, budgets, budget_versions, 
                       expenses, financial_assumptions, cost_centers CASCADE;
    END IF;
END $$;

-- Truncate core operational tables in reverse dependency order
-- Using CASCADE to handle foreign key constraints
TRUNCATE TABLE payments CASCADE;
TRUNCATE TABLE loans CASCADE;
TRUNCATE TABLE maintenance_history CASCADE;
TRUNCATE TABLE trade_ins CASCADE;
TRUNCATE TABLE sales CASCADE;
TRUNCATE TABLE vehicles CASCADE;
TRUNCATE TABLE customers CASCADE;
TRUNCATE TABLE employees CASCADE;

-- Reset core sequences to start from 1
ALTER SEQUENCE vehicles_vehicle_id_seq RESTART WITH 1;
ALTER SEQUENCE customers_customer_id_seq RESTART WITH 1;
ALTER SEQUENCE employees_employee_id_seq RESTART WITH 1;
ALTER SEQUENCE sales_sale_id_seq RESTART WITH 1;
ALTER SEQUENCE trade_ins_trade_in_id_seq RESTART WITH 1;
ALTER SEQUENCE loans_loan_id_seq RESTART WITH 1;
ALTER SEQUENCE payments_payment_id_seq RESTART WITH 1;
ALTER SEQUENCE maintenance_history_service_id_seq RESTART WITH 1;

-- Reset FP&A sequences (if they exist)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'cost_centers_cost_center_id_seq') THEN
        ALTER SEQUENCE cost_centers_cost_center_id_seq RESTART WITH 1;
        ALTER SEQUENCE budgets_budget_id_seq RESTART WITH 1;
        ALTER SEQUENCE budget_versions_version_id_seq RESTART WITH 1;
        ALTER SEQUENCE actuals_actual_id_seq RESTART WITH 1;
        ALTER SEQUENCE forecast_scenarios_scenario_id_seq RESTART WITH 1;
        ALTER SEQUENCE forecast_data_forecast_id_seq RESTART WITH 1;
        ALTER SEQUENCE kpi_definitions_kpi_id_seq RESTART WITH 1;
        ALTER SEQUENCE kpi_actuals_kpi_actual_id_seq RESTART WITH 1;
        ALTER SEQUENCE expenses_expense_id_seq RESTART WITH 1;
        ALTER SEQUENCE rolling_forecasts_rolling_forecast_id_seq RESTART WITH 1;
        ALTER SEQUENCE financial_assumptions_assumption_id_seq RESTART WITH 1;
        ALTER SEQUENCE variance_comments_comment_id_seq RESTART WITH 1;
    END IF;
END $$;
