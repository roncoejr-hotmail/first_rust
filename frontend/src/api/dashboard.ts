// API types
export interface MonthlyRevenue {
  month: string;
  revenue: number;
  sales_count: number;
}

export interface PaymentMethodStat {
  method: string;
  count: number;
  total_value: number;
}

export interface VehicleTypeStat {
  vehicle_type: string;
  count: number;
  total_revenue: number;
}

export interface ExecutiveOverview {
  total_revenue: number;
  total_sales: number;
  total_vehicles: number;
  available_vehicles: number;
  total_customers: number;
  total_employees: number;
  active_loans: number;
  loan_portfolio_value: number;
  average_sale_price: number;
  revenue_by_month: MonthlyRevenue[];
  sales_by_payment_method: PaymentMethodStat[];
  top_selling_types: VehicleTypeStat[];
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function fetchExecutiveOverview(): Promise<ExecutiveOverview> {
  const response = await fetch(`${API_BASE_URL}/api/dashboard/executive`);
  if (!response.ok) {
    throw new Error(`Failed to fetch data: ${response.statusText}`);
  }
  return response.json();
}
