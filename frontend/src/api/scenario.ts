// Scenario Planning API types and functions

export interface ScenarioPlanningOverview {
  fiscal_year: number;
  scenarios: ScenarioSummary[];
  scenario_comparison: ScenarioComparison[];
  monthly_comparison: MonthlyScenarioData[];
  category_breakdown: CategoryScenarioBreakdown[];
}

export interface ScenarioSummary {
  scenario_id: number;
  scenario_name: string;
  scenario_type: string;
  description: string;
  total_revenue: number;
  total_expenses: number;
  net_income: number;
  profit_margin: number;
}

export interface ScenarioComparison {
  metric: string;
  best_case: number;
  most_likely: number;
  worst_case: number;
  variance_best_to_worst: number;
}

export interface MonthlyScenarioData {
  period: string;
  best_case: number;
  most_likely: number;
  worst_case: number;
}

export interface CategoryScenarioBreakdown {
  category: string;
  best_case: number;
  most_likely: number;
  worst_case: number;
}

const API_BASE_URL = 'http://localhost:3000';

export async function fetchScenarioPlanning(): Promise<ScenarioPlanningOverview> {
  const response = await fetch(`${API_BASE_URL}/api/fpa/scenario-planning`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch scenario planning data: ${response.statusText}`);
  }
  
  return response.json();
}
