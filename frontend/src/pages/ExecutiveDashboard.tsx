import { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  CircularProgress,
  Box,
  Alert,
  Paper,
} from '@mui/material';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import PeopleIcon from '@mui/icons-material/People';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import KPICard from '../components/KPICard';
import RevenueChart from '../components/RevenueChart';
import PaymentMethodChart from '../components/PaymentMethodChart';
import DateRangePicker from '../components/DateRangePicker';
import { fetchExecutiveOverview } from '../api/dashboard';
import type { ExecutiveOverview } from '../api/dashboard';

export default function ExecutiveDashboard() {
  const [data, setData] = useState<ExecutiveOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Set default date range to all time
  const getDefaultEndDate = () => new Date().toISOString().split('T')[0];
  const getDefaultStartDate = () => '2010-01-01';
  
  const [startDate, setStartDate] = useState(getDefaultStartDate());
  const [endDate, setEndDate] = useState(getDefaultEndDate());

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const overview = await fetchExecutiveOverview({ start_date: startDate, end_date: endDate });
      setData(overview);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

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

  const handleDateChange = (newStartDate: string, newEndDate: string) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
        Executive Dashboard
      </Typography>

      {/* Date Range Filter */}
      <Paper sx={{ p: 2, mb: 3, backgroundColor: '#f5f5f5' }}>
        <DateRangePicker 
          startDate={startDate} 
          endDate={endDate} 
          onDateChange={handleDateChange} 
        />
      </Paper>

      {/* KPI Cards */}
      <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
        <Box sx={{ flex: '1 1 250px', minWidth: '250px' }}>
          <KPICard
            title="Total Revenue"
            value={formatCurrency(data.total_revenue)}
            subtitle={`${data.total_sales} sales`}
            icon={<AttachMoneyIcon sx={{ fontSize: 40 }} />}
          />
        </Box>
        <Box sx={{ flex: '1 1 250px', minWidth: '250px' }}>
          <KPICard
            title="Average Sale Price"
            value={formatCurrency(data.average_sale_price)}
            icon={<ShoppingCartIcon sx={{ fontSize: 40 }} />}
          />
        </Box>
        <Box sx={{ flex: '1 1 250px', minWidth: '250px' }}>
          <KPICard
            title="Inventory"
            value={data.total_vehicles}
            subtitle={`${data.available_vehicles} available`}
            icon={<DirectionsCarIcon sx={{ fontSize: 40 }} />}
          />
        </Box>
        <Box sx={{ flex: '1 1 250px', minWidth: '250px' }}>
          <KPICard
            title="Active Loans"
            value={data.active_loans}
            subtitle={formatCurrency(data.loan_portfolio_value)}
            icon={<AccountBalanceIcon sx={{ fontSize: 40 }} />}
          />
        </Box>
      </Box>

      {/* Charts */}
      <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
        <Box sx={{ flex: '2 1 600px', minWidth: '300px' }}>
          <RevenueChart data={data.revenue_by_month} />
        </Box>
        <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
          <PaymentMethodChart data={data.sales_by_payment_method} />
        </Box>
      </Box>

      {/* Top Selling Types */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Top Selling Vehicle Types
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {data.top_selling_types.map((type) => (
            <Box key={type.vehicle_type} sx={{ flex: '1 1 300px', minWidth: '250px' }}>
              <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                  {type.vehicle_type}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {type.count} sold
                </Typography>
                <Typography variant="h6" color="primary">
                  {formatCurrency(type.total_revenue)}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Paper>

      {/* Footer Stats */}
      <Box sx={{ display: 'flex', gap: 3, mt: 3, flexWrap: 'wrap' }}>
        <Box sx={{ flex: '1 1 300px' }}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <PeopleIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
            <Typography variant="h4">{data.total_customers}</Typography>
            <Typography variant="body2" color="text.secondary">
              Total Customers
            </Typography>
          </Paper>
        </Box>
        <Box sx={{ flex: '1 1 300px' }}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <PeopleIcon sx={{ fontSize: 40, color: 'secondary.main', mb: 1 }} />
            <Typography variant="h4">{data.total_employees}</Typography>
            <Typography variant="body2" color="text.secondary">
              Total Employees
            </Typography>
          </Paper>
        </Box>
      </Box>
    </Container>
  );
}
