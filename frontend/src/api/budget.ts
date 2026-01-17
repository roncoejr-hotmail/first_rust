// Budget Management API types and functions

export interface BudgetManagementOverview {
  fiscal_year: number;
  total_budget: number;
  total_actual: number;
  total_variance: number;
  variance_percentage: number;
  budget_by_category: BudgetCategory[];
  budget_by_department: BudgetDepartment[];
  monthly_budget_trend: MonthlyBudgetTrend[];
  budget_utilization: BudgetUtilization[];
  top_variances: VarianceDetail[];
}

export interface BudgetCategory {
  category: string;
  budgeted: number;
  actual: number;
  variance: number;
  variance_percentage: number;
  status: string; // 'over', 'under', 'on-track'
}

export interface BudgetDepartment {
  department: string;
  budgeted: number;
  actual: number;
  variance: number;
  variance_percentage: number;
}

export interface MonthlyBudgetTrend {
  month: string;
  budgeted: number;
  actual: number;
  variance: number;
}

export interface BudgetUtilization {
  category: string;
  department: string;
  budgeted: number;
  actual: number;
  utilized_percentage: number;
}

export interface VarianceDetail {
  category: string;
  subcategory: string;
  department: string;
  month: string;
  budgeted: number;
  actual: number;
  variance: number;
  variance_percentage: number;
}

const API_BASE_URL = 'http://localhost:3000';

export async function fetchBudgetManagement(): Promise<BudgetManagementOverview> {
  const response = await fetch(`${API_BASE_URL}/api/fpa/budget-management`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch budget management data: ${response.statusText}`);
  }
  
  return response.json();
}
