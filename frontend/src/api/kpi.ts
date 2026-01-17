// KPI Scorecard API types and functions

export interface KPIScorecardOverview {
  total_kpis: number;
  kpis_on_track: number;
  kpis_at_risk: number;
  kpis_off_track: number;
  overall_score: number;
  kpis_by_category: KPICategory[];
  kpi_details: KPIDetail[];
  kpi_trends: KPITrend[];
}

export interface KPICategory {
  category: string;
  total_kpis: number;
  on_track: number;
  at_risk: number;
  off_track: number;
  average_achievement: number;
}

export interface KPIDetail {
  kpi_id: number;
  kpi_name: string;
  category: string;
  description: string;
  unit: string;
  frequency: string;
  target_value: number;
  current_value: number;
  achievement_percentage: number;
  status: string; // 'on-track', 'at-risk', 'off-track'
  is_higher_better: boolean;
}

export interface KPITrend {
  kpi_id: number;
  kpi_name: string;
  period: string;
  target: number;
  actual: number;
  achievement: number;
}

const API_BASE_URL = 'http://localhost:3000';

export async function fetchKPIScorecard(): Promise<KPIScorecardOverview> {
  const response = await fetch(`${API_BASE_URL}/api/fpa/kpi-scorecard`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch KPI scorecard data: ${response.statusText}`);
  }
  
  return response.json();
}
