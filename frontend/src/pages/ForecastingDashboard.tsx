import { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Box,
  Divider
} from '@mui/material';
import { fetchFinancialForecast } from '../api/forecasting';
import type { FinancialForecast } from '../api/forecasting';
import KPICard from '../components/KPICard';
import ProfitTrendChart from '../components/ProfitTrendChart';
import ProfitabilityChart from '../components/ProfitabilityChart';
import RevenueForecastChart from '../components/RevenueForecastChart';
import QuarterlyPerformanceChart from '../components/QuarterlyPerformanceChart';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';

export default function ForecastingDashboard() {
  const [data, setData] = useState<FinancialForecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const forecast = await fetchFinancialForecast();
      setData(forecast);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#1976d2' }}>
        📈 Financial Forecasting Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Revenue projections, growth analysis, and profitability insights
      </Typography>

      {/* KPI Cards */}
      <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: 'wrap' }}>
        <KPICard
          title="Total Revenue"
          value={`$${data.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<AttachMoneyIcon />}
          color="#2196f3"
        />
        <KPICard
          title="Total Profit"
          value={`$${data.total_profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<TrendingUpIcon />}
          color="#4caf50"
        />
        <KPICard
          title="Profit Margin"
          value={`${data.profit_margin.toFixed(2)}%`}
          icon={<ShowChartIcon />}
          color="#ff9800"
        />
        <KPICard
          title="Avg Monthly Revenue"
          value={`$${data.average_monthly_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<AttachMoneyIcon />}
          color="#9c27b0"
        />
      </Box>

      {/* Growth Metrics */}
      <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: 'wrap' }}>
        <KPICard
          title="Month-over-Month Growth"
          value={`${data.month_over_month_growth >= 0 ? '+' : ''}${data.month_over_month_growth.toFixed(2)}%`}
          icon={data.month_over_month_growth >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
          color={data.month_over_month_growth >= 0 ? '#4caf50' : '#f44336'}
        />
        <KPICard
          title="Year-over-Year Growth"
          value={data.year_over_year_growth !== 0 ? `${data.year_over_year_growth >= 0 ? '+' : ''}${data.year_over_year_growth.toFixed(2)}%` : 'N/A'}
          icon={data.year_over_year_growth >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
          color={data.year_over_year_growth >= 0 ? '#4caf50' : '#f44336'}
        />
        <KPICard
          title="Net Cash Flow"
          value={`$${data.cash_flow_analysis.net_cash_flow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<AccountBalanceIcon />}
          color={data.cash_flow_analysis.net_cash_flow >= 0 ? '#4caf50' : '#f44336'}
        />
      </Box>

      {/* Revenue & Profit Trend */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
          Revenue & Profit Trends
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Historical monthly performance showing revenue and profit over time
        </Typography>
        <ProfitTrendChart data={data.monthly_trends} />
      </Paper>

      {/* Revenue Forecast */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
          Revenue Forecast
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          3-month revenue projection based on historical trends
        </Typography>
        <RevenueForecastChart historical={data.monthly_trends} forecast={data.revenue_forecast} />
        
        {/* Forecast Details */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
            Projected Revenue:
          </Typography>
          {data.revenue_forecast.map((proj, idx) => (
            <Typography key={idx} variant="body2" color="text.secondary" sx={{ ml: 2 }}>
              • {proj.month}: ${proj.projected_revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })} 
              <span style={{ 
                marginLeft: '10px',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                backgroundColor: proj.confidence_level === 'High' ? '#4caf5020' : proj.confidence_level === 'Medium' ? '#ff980020' : '#f4433620',
                color: proj.confidence_level === 'High' ? '#4caf50' : proj.confidence_level === 'Medium' ? '#ff9800' : '#f44336'
              }}>
                {proj.confidence_level} Confidence
              </span>
            </Typography>
          ))}
        </Box>
      </Paper>

      {/* Two Column Layout */}
      <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: 'wrap' }}>
        {/* Profitability by Vehicle Type */}
        <Paper sx={{ p: 3, flex: 1, minWidth: '300px' }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
            Profitability by Vehicle Type
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Total profit and margin by vehicle category
          </Typography>
          <ProfitabilityChart data={data.profitability_by_vehicle_type} />
          
          {/* Details Table */}
          <Divider sx={{ my: 2 }} />
          <Box>
            {data.profitability_by_vehicle_type.map((item, idx) => (
              <Box key={idx} sx={{ mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  {item.vehicle_type}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Units Sold: {item.units_sold} | Avg Profit: ${item.avg_profit_per_unit.toLocaleString(undefined, { maximumFractionDigits: 0 })} | Margin: {item.profit_margin.toFixed(1)}%
                </Typography>
              </Box>
            ))}
          </Box>
        </Paper>

        {/* Quarterly Performance */}
        <Paper sx={{ p: 3, flex: 1, minWidth: '300px' }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
            Quarterly Performance
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Revenue and profit by quarter
          </Typography>
          <QuarterlyPerformanceChart data={data.quarterly_summary} />
        </Paper>
      </Box>

      {/* Cash Flow Analysis */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
          💰 Cash Flow Analysis
        </Typography>
        <Box sx={{ display: 'flex', gap: 4, mt: 2, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="body2" color="text.secondary">Total Inflow</Typography>
            <Typography variant="h6" sx={{ color: '#4caf50' }}>
              ${data.cash_flow_analysis.total_inflow.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Total Outflow</Typography>
            <Typography variant="h6" sx={{ color: '#f44336' }}>
              ${data.cash_flow_analysis.total_outflow.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Loan Payments Received</Typography>
            <Typography variant="h6">
              ${data.cash_flow_analysis.loan_payments_received.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Inventory Investment</Typography>
            <Typography variant="h6">
              ${data.cash_flow_analysis.inventory_investment.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Maintenance Expenses</Typography>
            <Typography variant="h6">
              ${data.cash_flow_analysis.maintenance_expenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Net Cash Flow</Typography>
            <Typography variant="h6" sx={{ color: data.cash_flow_analysis.net_cash_flow >= 0 ? '#4caf50' : '#f44336' }}>
              ${data.cash_flow_analysis.net_cash_flow.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
