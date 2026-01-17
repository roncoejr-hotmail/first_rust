// Maintenance Analytics API types and functions

export interface MaintenanceAnalytics {
  total_maintenance_records: number;
  total_maintenance_cost: number;
  average_maintenance_cost: number;
  vehicles_serviced: number;
  most_common_service: string;
  maintenance_by_type: MaintenanceByType[];
  maintenance_cost_trend: MaintenanceCostTrend[];
  top_vehicles_by_cost: VehicleMaintenanceSummary[];
  recent_maintenance: MaintenanceRecord[];
  service_provider_stats: ServiceProviderStat[];
}

export interface MaintenanceByType {
  service_type: string;
  count: number;
  total_cost: number;
  average_cost: number;
  percentage: number;
}

export interface MaintenanceCostTrend {
  month: string;
  total_cost: number;
  service_count: number;
  average_cost: number;
}

export interface VehicleMaintenanceSummary {
  vehicle_id: number;
  vin: string;
  vehicle_info: string;
  total_maintenance_cost: number;
  service_count: number;
  last_service_date: string;
  last_service_type: string;
}

export interface MaintenanceRecord {
  maintenance_id: number;
  vehicle_id: number;
  vehicle_info: string;
  service_date: string;
  service_type: string;
  mileage_at_service: number;
  service_provider: string;
  cost: number;
  description: string;
}

export interface ServiceProviderStat {
  service_provider: string;
  service_count: number;
  total_cost: number;
  average_cost: number;
}

const API_BASE_URL = 'http://localhost:3000';

export async function fetchMaintenanceAnalytics(): Promise<MaintenanceAnalytics> {
  const response = await fetch(`${API_BASE_URL}/api/dashboard/maintenance`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch maintenance analytics: ${response.statusText}`);
  }
  
  return response.json();
}
