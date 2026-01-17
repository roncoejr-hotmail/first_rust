// Customer Analytics API types and functions

export interface CustomerAnalytics {
  total_customers: number;
  active_customers: number;
  repeat_customers: number;
  average_credit_score: number;
  total_customer_lifetime_value: number;
  average_customer_value: number;
  customers_by_state: StateDistribution[];
  credit_score_distribution: CreditScoreBucket[];
  top_customers: TopCustomer[];
  customer_acquisition_trend: AcquisitionTrend[];
  age_demographics: AgeDemographic[];
}

export interface StateDistribution {
  state: string;
  customer_count: number;
  total_purchases: number;
  average_credit_score: number;
}

export interface CreditScoreBucket {
  score_range: string;
  count: number;
  percentage: number;
  avg_purchase_value: number;
}

export interface TopCustomer {
  customer_id: number;
  customer_name: string;
  email: string;
  state: string;
  total_purchases: number;
  purchase_count: number;
  credit_score: number;
  first_purchase_date: string;
  last_purchase_date: string;
}

export interface AcquisitionTrend {
  month: string;
  new_customers: number;
  total_purchases: number;
}

export interface AgeDemographic {
  age_range: string;
  count: number;
  percentage: number;
  avg_credit_score: number;
}

const API_BASE_URL = 'http://localhost:3000';

export async function fetchCustomerAnalytics(): Promise<CustomerAnalytics> {
  const response = await fetch(`${API_BASE_URL}/api/dashboard/customers`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch customer analytics: ${response.statusText}`);
  }
  
  return response.json();
}
