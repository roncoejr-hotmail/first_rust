// Employee Performance API types and functions

export interface EmployeePerformance {
  total_employees: number;
  active_employees: number;
  total_commission_paid: number;
  average_commission_rate: number;
  top_performers: EmployeeStats[];
  performance_by_role: RolePerformance[];
  monthly_performance: MonthlyEmployeePerformance[];
  employee_list: EmployeeDetail[];
}

export interface EmployeeStats {
  employee_id: number;
  employee_name: string;
  role: string;
  total_sales: number;
  total_revenue: number;
  commission_earned: number;
  average_deal_size: number;
  commission_rate: number;
}

export interface RolePerformance {
  role: string;
  employee_count: number;
  total_sales: number;
  total_revenue: number;
  average_revenue_per_employee: number;
}

export interface MonthlyEmployeePerformance {
  month: string;
  total_sales: number;
  total_revenue: number;
  total_commission: number;
  active_employees: number;
}

export interface EmployeeDetail {
  employee_id: number;
  employee_name: string;
  email: string;
  role: string;
  hire_date: string;
  commission_rate: number;
  is_active: boolean;
  total_sales: number;
  total_revenue: number;
  days_employed: number;
}

const API_BASE_URL = 'http://localhost:3000';

export async function fetchEmployeePerformance(): Promise<EmployeePerformance> {
  const response = await fetch(`${API_BASE_URL}/api/dashboard/employees`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch employee performance: ${response.statusText}`);
  }
  
  return response.json();
}
