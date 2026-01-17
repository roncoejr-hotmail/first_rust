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

export interface InventoryFilterParams {
  start_date?: string;
  end_date?: string;
  vehicle_type?: string;
  status?: string;
  search?: string;
}

export async function fetchInventoryOverview(params?: InventoryFilterParams): Promise<InventoryOverview> {
  let url = `${API_BASE_URL}/api/dashboard/inventory`;
  
  if (params) {
    const queryParams = new URLSearchParams();
    if (params.start_date) queryParams.append('start_date', params.start_date);
    if (params.end_date) queryParams.append('end_date', params.end_date);
    if (params.vehicle_type) queryParams.append('vehicle_type', params.vehicle_type);
    if (params.status) queryParams.append('status', params.status);
    if (params.search) queryParams.append('search', params.search);
    
    if (queryParams.toString()) {
      url += `?${queryParams.toString()}`;
    }
  }
  
  const response = await fetch(`${url}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch inventory overview: ${response.statusText}`);
  }
  
  return response.json();
}
