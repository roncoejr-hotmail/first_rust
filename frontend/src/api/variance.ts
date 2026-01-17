// Variance Analysis API types and functions

export interface VarianceAnalysisOverview {
  fiscal_year: number;
  total_budget: number;
  total_actual: number;
  total_variance: number;
  variance_percentage: number;
  waterfall_data: WaterfallItem[];
  variance_by_category: CategoryVariance[];
  variance_trend: MonthlyVariance[];
  top_favorable_variances: VarianceItem[];
  top_unfavorable_variances: VarianceItem[];
  variance_by_department: DepartmentVariance[];
}

export interface WaterfallItem {
  label: string;
  value: number;
  cumulative: number;
  item_type: string; // 'start', 'increase', 'decrease', 'total'
}

export interface CategoryVariance {
  category: string;
  budgeted: number;
  actual: number;
  variance: number;
  variance_percentage: number;
  is_favorable: boolean;
}

export interface MonthlyVariance {
  month: string;
  budgeted: number;
  actual: number;
  variance: number;
  cumulative_variance: number;
}

export interface VarianceItem {
  category: string;
  subcategory: string;
  department: string;
  month: string;
  budgeted: number;
  actual: number;
  variance: number;
  variance_percentage: number;
}

export interface DepartmentVariance {
  department: string;
  budgeted: number;
  actual: number;
  variance: number;
  variance_percentage: number;
}

const API_BASE_URL = 'http://localhost:3000';

export async function fetchVarianceAnalysis(): Promise<VarianceAnalysisOverview> {
  const response = await fetch(`${API_BASE_URL}/api/fpa/variance-analysis`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch variance analysis data: ${response.statusText}`);
  }
  
  return response.json();
}
