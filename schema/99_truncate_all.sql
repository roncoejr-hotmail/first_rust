-- Truncate all tables and reset sequences
-- Run this to clear all data and start fresh

-- Truncate tables in reverse dependency order
-- Using CASCADE to handle foreign key constraints
TRUNCATE TABLE payments CASCADE;
TRUNCATE TABLE loans CASCADE;
TRUNCATE TABLE maintenance_history CASCADE;
TRUNCATE TABLE trade_ins CASCADE;
TRUNCATE TABLE sales CASCADE;
TRUNCATE TABLE vehicles CASCADE;
TRUNCATE TABLE customers CASCADE;
TRUNCATE TABLE employees CASCADE;

-- Reset sequences to start from 1
ALTER SEQUENCE vehicles_vehicle_id_seq RESTART WITH 1;
ALTER SEQUENCE customers_customer_id_seq RESTART WITH 1;
ALTER SEQUENCE employees_employee_id_seq RESTART WITH 1;
ALTER SEQUENCE sales_sale_id_seq RESTART WITH 1;
ALTER SEQUENCE trade_ins_trade_in_id_seq RESTART WITH 1;
ALTER SEQUENCE loans_loan_id_seq RESTART WITH 1;
ALTER SEQUENCE payments_payment_id_seq RESTART WITH 1;
ALTER SEQUENCE maintenance_history_service_id_seq RESTART WITH 1;
