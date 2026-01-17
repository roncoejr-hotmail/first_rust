// Finance & Loan Management API types and functions

export interface FinanceOverview {
  total_loans: number;
  active_loans: number;
  total_loan_value: number;
  outstanding_balance: number;
  total_interest_revenue: number;
  average_interest_rate: number;
  payment_collection_rate: number;
  loans_by_status: LoanStatusStat[];
  monthly_payment_trends: MonthlyPaymentTrend[];
  top_loans_by_balance: LoanDetail[];
  late_payment_analysis: LatePaymentStats;
}

export interface LoanStatusStat {
  status: string;
  count: number;
  total_value: number;
  percentage: number;
}

export interface MonthlyPaymentTrend {
  month: string;
  total_payments: number;
  payment_count: number;
  principal_paid: number;
  interest_paid: number;
}

export interface LoanDetail {
  loan_id: number;
  customer_name: string;
  vehicle_info: string;
  loan_amount: number;
  remaining_balance: number;
  interest_rate: number;
  monthly_payment: number;
  term_months: number;
  loan_status: string;
  loan_start_date: string;
  days_active: number;
}

export interface LatePaymentStats {
  total_late_payments: number;
  total_late_fees: number;
  loans_at_risk: number;
  average_days_late: number;
}

const API_BASE_URL = 'http://localhost:3000';

export async function fetchFinanceOverview(): Promise<FinanceOverview> {
  const response = await fetch(`${API_BASE_URL}/api/dashboard/finance`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch finance overview: ${response.statusText}`);
  }
  
  return response.json();
}
