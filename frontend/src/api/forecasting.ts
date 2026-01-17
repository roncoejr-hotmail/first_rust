// Financial Forecasting API types and functions

export interface FinancialForecast {
  total_revenue: number;
  total_profit: number;
  profit_margin: number;
  average_monthly_revenue: number;
  month_over_month_growth: number;
  year_over_year_growth: number;
  monthly_trends: MonthlyFinancialTrend[];
  profitability_by_vehicle_type: VehicleProfitability[];
  quarterly_summary: QuarterlySummary[];
  revenue_forecast: ForecastProjection[];
  cash_flow_analysis: CashFlowAnalysis;
}

export interface MonthlyFinancialTrend {
  month: string;
  revenue: number;
  cost: number;
  profit: number;
  profit_margin: number;
  sales_count: number;
}

export interface VehicleProfitability {
  vehicle_type: string;
  total_revenue: number;
  total_cost: number;
  total_profit: number;
  profit_margin: number;
  units_sold: number;
  avg_profit_per_unit: number;
}

export interface QuarterlySummary {
  quarter: string;
  revenue: number;
  profit: number;
  sales_count: number;
  average_sale_price: number;
}

export interface ForecastProjection {
  month: string;
  projected_revenue: number;
  confidence_level: string;
}

export interface CashFlowAnalysis {
  total_inflow: number;
  total_outflow: number;
  net_cash_flow: number;
  loan_payments_received: number;
  maintenance_expenses: number;
  inventory_investment: number;
}

const API_BASE_URL = 'http://localhost:3000';

export async function fetchFinancialForecast(): Promise<FinancialForecast> {
  const response = await fetch(`${API_BASE_URL}/api/dashboard/forecasting`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch financial forecast: ${response.statusText}`);
  }
  
  return response.json();
}
