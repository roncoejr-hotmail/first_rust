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

export interface SalesFilterParams {
  start_date?: string;
  end_date?: string;
  vehicle_type?: string;
  employee_id?: number;
}

export async function fetchSalesPerformance(params?: SalesFilterParams): Promise<SalesPerformance> {
  let url = `${API_BASE_URL}/api/dashboard/sales-performance`;
  
  if (params) {
    const queryParams = new URLSearchParams();
    if (params.start_date) queryParams.append('start_date', params.start_date);
    if (params.end_date) queryParams.append('end_date', params.end_date);
    if (params.vehicle_type) queryParams.append('vehicle_type', params.vehicle_type);
    if (params.employee_id && params.employee_id > 0) queryParams.append('employee_id', params.employee_id.toString());
    
    if (queryParams.toString()) {
      url += `?${queryParams.toString()}`;
    }
  }
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch data: ${response.statusText}`);
  }
  return response.json();
}
