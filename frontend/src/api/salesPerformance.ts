// Sales Performance API types
export interface SalespersonPerformance {
  employee_id: number;
  name: string;
  role: string;
  total_sales: number;
  total_revenue: number;
  commission_earned: number;
  average_sale_price: number;
}

export interface MonthlySalesPerformance {
  month: string;
  sales_count: number;
  revenue: number;
  average_deal_size: number;
}

export interface PaymentMethodBreakdown {
  method: string;
  count: number;
  total_value: number;
  percentage: number;
}

export interface VehicleTypeBreakdown {
  vehicle_type: string;
  count: number;
  total_revenue: number;
  average_price: number;
}

export interface SalesPerformance {
  total_sales_count: number;
  total_revenue: number;
  total_commission_paid: number;
  average_deal_size: number;
  top_performers: SalespersonPerformance[];
  sales_by_month: MonthlySalesPerformance[];
  sales_by_payment_method: PaymentMethodBreakdown[];
  sales_by_vehicle_type: VehicleTypeBreakdown[];
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function fetchSalesPerformance(): Promise<SalesPerformance> {
  const response = await fetch(`${API_BASE_URL}/api/dashboard/sales-performance`);
  if (!response.ok) {
    throw new Error(`Failed to fetch data: ${response.statusText}`);
  }
  return response.json();
}
