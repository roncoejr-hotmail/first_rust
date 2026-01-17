import { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  CircularProgress,
  Box,
  Alert,
  Paper,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import KPICard from '../components/KPICard';
import SalesLeaderboard from '../components/SalesLeaderboard';
import MonthlySalesChart from '../components/MonthlySalesChart';
import { fetchSalesPerformance } from '../api/salesPerformance';
import type { SalesPerformance } from '../api/salesPerformance';

export default function SalesPerformanceDashboard() {
  const [data, setData] = useState<SalesPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const performance = await fetchSalesPerformance();
        setData(performance);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    loadData();
    // Refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!data) return null;

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
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
        Sales Performance Dashboard
      </Typography>

      {/* KPI Cards */}
      <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
        <Box sx={{ flex: '1 1 250px', minWidth: '250px' }}>
          <KPICard
            title="Total Sales"
            value={data.total_sales_count}
            subtitle={formatCurrency(data.total_revenue)}
            icon={<ShoppingCartIcon sx={{ fontSize: 40 }} />}
          />
        </Box>
        <Box sx={{ flex: '1 1 250px', minWidth: '250px' }}>
          <KPICard
            title="Average Deal Size"
            value={formatCurrency(data.average_deal_size)}
            icon={<TrendingUpIcon sx={{ fontSize: 40 }} />}
          />
        </Box>
        <Box sx={{ flex: '1 1 250px', minWidth: '250px' }}>
          <KPICard
            title="Total Revenue"
            value={formatCurrency(data.total_revenue)}
            icon={<AttachMoneyIcon sx={{ fontSize: 40 }} />}
          />
        </Box>
        <Box sx={{ flex: '1 1 250px', minWidth: '250px' }}>
          <KPICard
            title="Commission Paid"
            value={formatCurrency(data.total_commission_paid)}
            icon={<AccountBalanceWalletIcon sx={{ fontSize: 40 }} />}
          />
        </Box>
      </Box>

      {/* Charts Row */}
      <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
        <Box sx={{ flex: '1 1 500px', minWidth: '300px' }}>
          <MonthlySalesChart data={data.sales_by_month} />
        </Box>
        <Box sx={{ flex: '1 1 400px', minWidth: '300px' }}>
          <SalesLeaderboard performers={data.top_performers} />
        </Box>
      </Box>

      {/* Breakdown Tables */}
      <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
        {/* Payment Method Breakdown */}
        <Box sx={{ flex: '1 1 400px' }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Sales by Payment Method
            </Typography>
            <Box sx={{ mt: 2 }}>
              {data.sales_by_payment_method.map((method) => (
                <Box
                  key={method.method}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 2,
                    mb: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                  }}
                >
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                      {method.method}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {method.count} sales ({method.percentage.toFixed(1)}%)
                    </Typography>
                  </Box>
                  <Typography variant="h6" color="primary">
                    {formatCurrency(method.total_value)}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Box>

        {/* Vehicle Type Breakdown */}
        <Box sx={{ flex: '1 1 400px' }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Sales by Vehicle Type
            </Typography>
            <Box sx={{ mt: 2 }}>
              {data.sales_by_vehicle_type.map((type) => (
                <Box
                  key={type.vehicle_type}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 2,
                    mb: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                  }}
                >
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                      {type.vehicle_type}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {type.count} sold • Avg: {formatCurrency(type.average_price)}
                    </Typography>
                  </Box>
                  <Typography variant="h6" color="primary">
                    {formatCurrency(type.total_revenue)}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Box>
      </Box>
    </Container>
  );
}
