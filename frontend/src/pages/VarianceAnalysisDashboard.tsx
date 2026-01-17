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
import { fetchVarianceAnalysis } from '../api/variance';
import type { VarianceAnalysisOverview } from '../api/variance';
import KPICard from '../components/KPICard';
import WaterfallChart from '../components/WaterfallChart';
import VarianceTrendChart from '../components/VarianceTrendChart';
import VarianceItemsTable from '../components/VarianceItemsTable';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import WarningIcon from '@mui/icons-material/Warning';

export default function VarianceAnalysisDashboard() {
  const [data, setData] = useState<VarianceAnalysisOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const variance = await fetchVarianceAnalysis();
      setData(variance);
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
        📊 Variance Analysis Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Fiscal Year {data.fiscal_year} - Deep-Dive Budget Variance Analysis
      </Typography>

      {/* KPI Cards */}
      <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: 'wrap' }}>
        <KPICard
          title="Total Budget"
          value={formatCurrency(data.total_budget)}
          icon={<AttachMoneyIcon />}
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
          color={data.total_variance >= 0 ? '#f44336' : '#4caf50'}
        />
        <KPICard
          title="Variance %"
          value={`${data.total_variance >= 0 ? '+' : ''}${data.variance_percentage.toFixed(2)}%`}
          icon={<WarningIcon />}
          color={Math.abs(data.variance_percentage) <= 5 ? '#4caf50' : '#f44336'}
        />
      </Box>

      {/* Waterfall Chart */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
          🌊 Waterfall Analysis: Budget to Actual
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Visual breakdown showing how budget translates to actual spending by category
        </Typography>
        <WaterfallChart data={data.waterfall_data} />
      </Paper>

      {/* Variance by Category */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
          Variance by Category
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {data.variance_by_category.map((cat, idx) => (
            <Box key={idx} sx={{ 
              p: 2, 
              border: '2px solid',
              borderColor: cat.is_favorable ? '#4caf50' : '#f44336',
              borderRadius: 2,
              minWidth: 220,
              backgroundColor: cat.is_favorable ? '#e8f5e9' : '#ffebee'
            }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', textTransform: 'capitalize' }}>
                {cat.category}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Budget: {formatCurrency(cat.budgeted)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Actual: {formatCurrency(cat.actual)}
              </Typography>
              <Typography variant="h6" sx={{ 
                mt: 1,
                fontWeight: 'bold',
                color: cat.is_favorable ? '#4caf50' : '#f44336'
              }}>
                {cat.variance >= 0 ? '+' : ''}{formatCurrency(cat.variance)}
              </Typography>
              <Typography variant="caption" sx={{ 
                color: cat.is_favorable ? '#4caf50' : '#f44336',
                fontWeight: 'bold'
              }}>
                {cat.variance >= 0 ? '+' : ''}{cat.variance_percentage.toFixed(1)}%
                {cat.is_favorable ? ' (Favorable)' : ' (Unfavorable)'}
              </Typography>
            </Box>
          ))}
        </Box>
      </Paper>

      {/* Monthly Variance Trend */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
          📈 Monthly Variance Trend
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Monthly variance (bars) and cumulative variance (line) over the fiscal year
        </Typography>
        <VarianceTrendChart data={data.variance_trend} />
      </Paper>

      {/* Variance by Department */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
          Department Variance Summary
        </Typography>
        <Divider sx={{ mb: 2 }} />
        {data.variance_by_department.map((dept, idx) => (
          <Box key={idx} sx={{ 
            mb: 2, 
            pb: 2, 
            borderBottom: idx < data.variance_by_department.length - 1 ? '1px solid #e0e0e0' : 'none' 
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                {dept.department}
              </Typography>
              <Typography variant="h6" sx={{ 
                fontWeight: 'bold',
                color: dept.variance >= 0 ? '#f44336' : '#4caf50'
              }}>
                {dept.variance >= 0 ? '+' : ''}{formatCurrency(dept.variance)}
                <Typography component="span" variant="body2" sx={{ ml: 1 }}>
                  ({dept.variance >= 0 ? '+' : ''}{dept.variance_percentage.toFixed(1)}%)
                </Typography>
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 3, mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Budget: {formatCurrency(dept.budgeted)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Actual: {formatCurrency(dept.actual)}
              </Typography>
            </Box>
          </Box>
        ))}
      </Paper>

      {/* Top Favorable Variances */}
      <Box sx={{ mb: 4 }}>
        <VarianceItemsTable 
          data={data.top_favorable_variances}
          title="✅ Top Favorable Variances (Under Budget)"
          type="favorable"
        />
      </Box>

      {/* Top Unfavorable Variances */}
      <Box sx={{ mb: 4 }}>
        <VarianceItemsTable 
          data={data.top_unfavorable_variances}
          title="⚠️ Top Unfavorable Variances (Over Budget)"
          type="unfavorable"
        />
      </Box>
    </Container>
  );
}
