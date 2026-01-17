import { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  CircularProgress,
  Alert,
  Box,
  Paper,
  Divider
} from '@mui/material';
import { fetchBudgetManagement } from '../api/budget';
import type { BudgetManagementOverview } from '../api/budget';
import KPICard from '../components/KPICard';
import BudgetCategoryChart from '../components/BudgetCategoryChart';
import BudgetTrendChart from '../components/BudgetTrendChart';
import VarianceTable from '../components/VarianceTable';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';

export default function BudgetManagementDashboard() {
  const [data, setData] = useState<BudgetManagementOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const budget = await fetchBudgetManagement();
      setData(budget);
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#1976d2' }}>
        💰 Budget Management Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Fiscal Year {data.fiscal_year} - Budget vs Actual Analysis
      </Typography>

      {/* KPI Cards */}
      <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: 'wrap' }}>
        <KPICard
          title="Total Budget"
          value={formatCurrency(data.total_budget)}
          icon={<AccountBalanceIcon />}
          color="#2196f3"
        />
        <KPICard
          title="Total Actual"
          value={formatCurrency(data.total_actual)}
          icon={<AttachMoneyIcon />}
          color="#4caf50"
        />
        <KPICard
          title="Total Variance"
          value={formatCurrency(data.total_variance)}
          icon={data.total_variance >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
          color={data.total_variance >= 0 ? '#f44336' : '#ff9800'}
        />
        <KPICard
          title="Variance %"
          value={`${data.total_variance >= 0 ? '+' : ''}${data.variance_percentage.toFixed(2)}%`}
          icon={data.variance_percentage >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
          color={Math.abs(data.variance_percentage) <= 5 ? '#4caf50' : '#f44336'}
        />
      </Box>

      {/* Budget by Category Chart */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
          Budget vs Actual by Category
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Comparison of budgeted and actual spending across major categories
        </Typography>
        <BudgetCategoryChart data={data.budget_by_category} />
        
        {/* Category Status Summary */}
        <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {data.budget_by_category.map((cat, idx) => (
            <Box key={idx} sx={{ 
              p: 2, 
              border: '1px solid #e0e0e0', 
              borderRadius: 2,
              minWidth: 200,
              backgroundColor: cat.status === 'on-track' ? '#e8f5e9' : cat.status === 'over' ? '#ffebee' : '#fff3e0'
            }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', textTransform: 'capitalize' }}>
                {cat.category}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Budget: {formatCurrency(cat.budgeted)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Actual: {formatCurrency(cat.actual)}
              </Typography>
              <Typography variant="body2" sx={{ 
                fontWeight: 'bold',
                color: cat.status === 'on-track' ? '#4caf50' : cat.status === 'over' ? '#f44336' : '#ff9800'
              }}>
                {cat.variance >= 0 ? '+' : ''}{formatCurrency(cat.variance)} ({cat.variance_percentage.toFixed(1)}%)
              </Typography>
            </Box>
          ))}
        </Box>
      </Paper>

      {/* Monthly Trend */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
          Monthly Budget Trend
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Month-by-month comparison of budgeted vs actual spending
        </Typography>
        <BudgetTrendChart data={data.monthly_budget_trend} />
      </Paper>

      {/* Two Column Layout */}
      <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: 'wrap' }}>
        {/* Budget by Department */}
        <Paper sx={{ p: 3, flex: 1, minWidth: '300px' }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
            Budget by Department
          </Typography>
          <Divider sx={{ mb: 2 }} />
          {data.budget_by_department.map((dept, idx) => (
            <Box key={idx} sx={{ mb: 2, pb: 2, borderBottom: idx < data.budget_by_department.length - 1 ? '1px solid #e0e0e0' : 'none' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                {dept.department}
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Budget: {formatCurrency(dept.budgeted)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Actual: {formatCurrency(dept.actual)}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ 
                mt: 0.5,
                fontWeight: 'bold',
                color: dept.variance >= 0 ? '#f44336' : '#4caf50'
              }}>
                Variance: {dept.variance >= 0 ? '+' : ''}{formatCurrency(dept.variance)} ({dept.variance_percentage.toFixed(1)}%)
              </Typography>
            </Box>
          ))}
        </Paper>

        {/* Budget Utilization */}
        <Paper sx={{ p: 3, flex: 1, minWidth: '300px' }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
            Top Budget Utilization
          </Typography>
          <Divider sx={{ mb: 2 }} />
          {data.budget_utilization.map((util, idx) => (
            <Box key={idx} sx={{ mb: 2, pb: 2, borderBottom: idx < data.budget_utilization.length - 1 ? '1px solid #e0e0e0' : 'none' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', textTransform: 'capitalize' }}>
                {util.category} - {util.department}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <Box sx={{ 
                  flex: 1, 
                  height: 20, 
                  backgroundColor: '#e0e0e0', 
                  borderRadius: 1,
                  overflow: 'hidden'
                }}>
                  <Box sx={{ 
                    height: '100%', 
                    width: `${Math.min(util.utilized_percentage, 100)}%`,
                    backgroundColor: util.utilized_percentage > 100 ? '#f44336' : util.utilized_percentage > 90 ? '#ff9800' : '#4caf50',
                    transition: 'width 0.3s'
                  }} />
                </Box>
                <Typography variant="body2" sx={{ ml: 2, fontWeight: 'bold', minWidth: 50 }}>
                  {util.utilized_percentage.toFixed(0)}%
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                {formatCurrency(util.actual)} of {formatCurrency(util.budgeted)}
              </Typography>
            </Box>
          ))}
        </Paper>
      </Box>

      {/* Top Variances Table */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
          🔍 Top Budget Variances
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Largest deviations from budget requiring attention
        </Typography>
        <VarianceTable data={data.top_variances} />
      </Paper>
    </Container>
  );
}
