// Rolling Forecast API types and functions

export interface RollingForecastOverview {
  latest_forecast_date: string;
  total_forecasted: number;
  total_actual: number;
  total_variance: number;
  forecast_accuracy: number;
  rolling_forecast_trend: RollingForecastTrend[];
  forecast_vs_actual: ForecastVsActual[];
  category_forecast: CategoryForecast[];
  forecast_accuracy_by_category: ForecastAccuracy[];
}

export interface RollingForecastTrend {
  period: string;
  forecasted: number;
  actual: number;
  variance: number;
}

export interface ForecastVsActual {
  period: string;
  category: string;
  forecasted: number;
  actual: number;
  variance_percentage: number;
}

export interface CategoryForecast {
  category: string;
  current_month: number;
  next_3_months: number;
  next_6_months: number;
  next_12_months: number;
}

export interface ForecastAccuracy {
  category: string;
  total_forecasted: number;
  total_actual: number;
  accuracy_percentage: number;
  avg_variance_percentage: number;
}

const API_BASE_URL = 'http://localhost:3000';

export async function fetchRollingForecast(): Promise<RollingForecastOverview> {
  const response = await fetch(`${API_BASE_URL}/api/fpa/rolling-forecast`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch rolling forecast data: ${response.statusText}`);
  }
  
  return response.json();
}
