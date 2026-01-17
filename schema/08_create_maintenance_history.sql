-- Maintenance History Table
CREATE TABLE IF NOT EXISTS maintenance_history (
    maintenance_id SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(vehicle_id),
    service_date DATE NOT NULL,
    service_type VARCHAR(50),
    mileage_at_service INTEGER,
    service_provider VARCHAR(100),
    cost DECIMAL(10, 2),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle ON maintenance_history(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_date ON maintenance_history(service_date);
