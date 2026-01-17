import { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  CircularProgress,
  Alert,
  Box,
  Paper,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip
} from '@mui/material';
import { fetchRollingForecast } from '../api/rolling';
import type { RollingForecastOverview } from '../api/rolling';
import KPICard from '../components/KPICard';
import RollingForecastTrendChart from '../components/RollingForecastTrendChart';
import ForecastAccuracyChart from '../components/ForecastAccuracyChart';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

export default function RollingForecastDashboard() {
  const [data, setData] = useState<RollingForecastOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const rollingData = await fetchRollingForecast();
      setData(rollingData);
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
        📅 Rolling Forecast Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        12-Month Rolling Forecast - Latest Update: {data.latest_forecast_date}
      </Typography>

      {/* Summary KPI Cards */}
      <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: 'wrap' }}>
        <KPICard
          title="Total Forecasted"
          value={formatCurrency(data.total_forecasted)}
          icon={<TrendingUpIcon />}
          color="#2196f3"
        />
        <KPICard
          title="Total Actual"
          value={formatCurrency(data.total_actual)}
          icon={<CheckCircleIcon />}
          color="#4caf50"
        />
        <KPICard
          title="Total Variance"
          value={formatCurrency(data.total_variance)}
          icon={data.total_variance >= 0 ? <TrendingUpIcon /> : <WarningIcon />}
          color={Math.abs(data.total_variance) < data.total_forecasted * 0.1 ? '#4caf50' : '#f44336'}
        />
        <KPICard
          title="Forecast Accuracy"
          value={`${data.forecast_accuracy.toFixed(1)}%`}
          icon={data.forecast_accuracy >= 90 ? <CheckCircleIcon /> : <WarningIcon />}
          color={data.forecast_accuracy >= 90 ? '#4caf50' : data.forecast_accuracy >= 75 ? '#ff9800' : '#f44336'}
        />
      </Box>

      {/* Rolling Forecast Trend */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
          📈 12-Month Rolling Forecast Trend
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Forecasted vs Actual values over the next 12 months (dashed line = forecast, solid line = actual)
        </Typography>
        <RollingForecastTrendChart data={data.rolling_forecast_trend} />
      </Paper>

      {/* Forecast Accuracy by Category */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
          🎯 Forecast Accuracy by Category
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          How accurate our forecasts have been for each category
        </Typography>
        <ForecastAccuracyChart data={data.forecast_accuracy_by_category} />
        
        {/* Accuracy Details Table */}
        <Box sx={{ mt: 3 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>Category</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Forecasted</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actual</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Accuracy</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Avg Variance %</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.forecast_accuracy_by_category.map((cat, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell sx={{ textTransform: 'capitalize', fontWeight: 'bold' }}>{cat.category}</TableCell>
                    <TableCell align="right">{formatCurrency(cat.total_forecasted)}</TableCell>
                    <TableCell align="right">{formatCurrency(cat.total_actual)}</TableCell>
                    <TableCell align="right">
                      <Chip 
                        label={`${cat.accuracy_percentage.toFixed(0)}%`}
                        size="small"
                        color={cat.accuracy_percentage >= 90 ? 'success' : cat.accuracy_percentage >= 75 ? 'warning' : 'error'}
                      />
                    </TableCell>
                    <TableCell align="right">{cat.avg_variance_percentage.toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Paper>

      {/* Category Forecast Summary */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
          📊 Category Forecast Summary
        </Typography>
        <Divider sx={{ mb: 3 }} />
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>Category</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Current Month</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Next 3 Months</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Next 6 Months</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Next 12 Months</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.category_forecast.map((cat, idx) => (
                <TableRow key={idx} hover>
                  <TableCell sx={{ textTransform: 'capitalize', fontWeight: 'bold' }}>{cat.category}</TableCell>
                  <TableCell align="right">{formatCurrency(cat.current_month)}</TableCell>
                  <TableCell align="right">{formatCurrency(cat.next_3_months)}</TableCell>
                  <TableCell align="right">{formatCurrency(cat.next_6_months)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>{formatCurrency(cat.next_12_months)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Forecast vs Actual Details */}
      {data.forecast_vs_actual.length > 0 && (
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
            🔍 Forecast vs Actual Details
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Detailed comparison for periods with actual data
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>Period</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Category</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Forecasted</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actual</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Variance %</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.forecast_vs_actual.slice(0, 20).map((item, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell>{item.period}</TableCell>
                    <TableCell sx={{ textTransform: 'capitalize' }}>{item.category}</TableCell>
                    <TableCell align="right">{formatCurrency(item.forecasted)}</TableCell>
                    <TableCell align="right">{formatCurrency(item.actual)}</TableCell>
                    <TableCell align="right">
                      <span style={{ 
                        color: Math.abs(item.variance_percentage) < 10 ? '#4caf50' : '#f44336',
                        fontWeight: 'bold'
                      }}>
                        {item.variance_percentage > 0 ? '+' : ''}{item.variance_percentage.toFixed(1)}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Insights */}
      <Paper sx={{ p: 3, mb: 4, backgroundColor: '#f5f5f5' }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
          💡 Key Insights
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <CalendarTodayIcon sx={{ color: '#2196f3', mt: 0.5 }} />
            <Typography variant="body2">
              <strong>Latest Forecast:</strong> Created on {data.latest_forecast_date}, projecting the next 12 months forward.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            {data.forecast_accuracy >= 90 ? (
              <CheckCircleIcon sx={{ color: '#4caf50', mt: 0.5 }} />
            ) : (
              <WarningIcon sx={{ color: '#ff9800', mt: 0.5 }} />
            )}
            <Typography variant="body2">
              <strong>Overall Accuracy:</strong> {data.forecast_accuracy.toFixed(1)}% - 
              {data.forecast_accuracy >= 90 ? ' Excellent forecast accuracy!' : 
               data.forecast_accuracy >= 75 ? ' Good accuracy, minor adjustments needed.' : 
               ' Forecast accuracy needs improvement.'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <TrendingUpIcon sx={{ color: '#2196f3', mt: 0.5 }} />
            <Typography variant="body2">
              <strong>Total Variance:</strong> {formatCurrency(data.total_variance)} 
              ({((data.total_variance / data.total_forecasted) * 100).toFixed(1)}% of forecast)
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
