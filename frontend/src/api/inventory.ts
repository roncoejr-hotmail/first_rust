// Inventory API types and functions

export interface InventoryOverview {
  total_vehicles: number;
  available_vehicles: number;
  sold_vehicles: number;
  total_inventory_value: number;
  average_days_in_inventory: number;
  vehicles_by_type: InventoryByType[];
  cost_vs_price_analysis: CostPriceAnalysis[];
  recent_vehicles: VehicleDetail[];
}

export interface InventoryByType {
  vehicle_type: string;
  available: number;
  sold: number;
  total: number;
  total_value: number;
}

export interface CostPriceAnalysis {
  vehicle_type: string;
  avg_cost: number;
  avg_sale_price: number;
  avg_markup_percentage: number;
  count: number;
}

export interface VehicleDetail {
  vehicle_id: number;
  vin: string;
  make: string;
  model: string;
  year: number;
  vehicle_type: string;
  color: string;
  mileage: number;
  cost_price: number;
  status: string;
  days_in_inventory: number;
}

const API_BASE_URL = 'http://localhost:3000';

export async function fetchInventoryOverview(): Promise<InventoryOverview> {
  const response = await fetch(`${API_BASE_URL}/api/dashboard/inventory`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch inventory overview: ${response.statusText}`);
  }
  
  return response.json();
}
