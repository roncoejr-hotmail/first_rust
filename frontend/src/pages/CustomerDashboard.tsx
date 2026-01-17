import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Divider
} from '@mui/material';
import { fetchCustomerAnalytics } from '../api/customers';
import type { CustomerAnalytics } from '../api/customers';
import KPICard from '../components/KPICard';
import StateDistributionChart from '../components/StateDistributionChart';
import CreditScoreChart from '../components/CreditScoreChart';
import AcquisitionTrendChart from '../components/AcquisitionTrendChart';
import TopCustomersTable from '../components/TopCustomersTable';
import PeopleIcon from '@mui/icons-material/People';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import RepeatIcon from '@mui/icons-material/Repeat';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import StarIcon from '@mui/icons-material/Star';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

export default function CustomerDashboard() {
  const [data, setData] = useState<CustomerAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const result = await fetchCustomerAnalytics();
        setData(result);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box p={3}>
        <Alert severity="info">No data available</Alert>
      </Box>
    );
  }

  const activePercentage = data.total_customers > 0
    ? ((data.active_customers / data.total_customers) * 100).toFixed(1)
    : '0';

  const repeatPercentage = data.total_customers > 0
    ? ((data.repeat_customers / data.total_customers) * 100).toFixed(1)
    : '0';

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom fontWeight="bold" color="primary">
        Customer Analytics Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Comprehensive customer demographics and behavior insights
      </Typography>

      {/* KPI Cards */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          mb: 4
        }}
      >
        <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
          <KPICard
            title="Total Customers"
            value={data.total_customers.toString()}
            icon={<PeopleIcon />}
            color="#2196f3"
          />
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
          <KPICard
            title="Active Customers"
            value={`${data.active_customers} (${activePercentage}%)`}
            icon={<PersonAddIcon />}
            color="#4caf50"
          />
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
          <KPICard
            title="Repeat Customers"
            value={`${data.repeat_customers} (${repeatPercentage}%)`}
            icon={<RepeatIcon />}
            color="#9c27b0"
          />
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
          <KPICard
            title="Avg Credit Score"
            value={data.average_credit_score.toFixed(0)}
            icon={<StarIcon />}
            color="#ff9800"
          />
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
          <KPICard
            title="Total CLV"
            value={formatCurrency(data.total_customer_lifetime_value)}
            icon={<AttachMoneyIcon />}
            color="#00bcd4"
          />
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
          <KPICard
            title="Avg Customer Value"
            value={formatCurrency(data.average_customer_value)}
            icon={<TrendingUpIcon />}
            color="#8bc34a"
          />
        </Box>
      </Box>

      {/* Customer Acquisition Trend */}
      <Paper elevation={2} sx={{ p: 2, mb: 4 }}>
        <Typography variant="h6" gutterBottom fontWeight="bold">
          Customer Acquisition Trend
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          New customer growth over the last 12 months
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <AcquisitionTrendChart data={data.customer_acquisition_trend} />
      </Paper>

      {/* Charts Section */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 3,
          mb: 4
        }}
      >
        {/* Customers by State */}
        <Paper
          elevation={2}
          sx={{ flex: '1 1 500px', minWidth: '300px', p: 2 }}
        >
          <Typography variant="h6" gutterBottom fontWeight="bold">
            Customers by State (Top 15)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Geographic distribution of customer base
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <StateDistributionChart data={data.customers_by_state} />
        </Paper>

        {/* Credit Score Distribution */}
        <Paper
          elevation={2}
          sx={{ flex: '1 1 500px', minWidth: '300px', p: 2 }}
        >
          <Typography variant="h6" gutterBottom fontWeight="bold">
            Credit Score Distribution
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Customer creditworthiness breakdown
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <CreditScoreChart data={data.credit_score_distribution} />
        </Paper>
      </Box>

      {/* Age Demographics */}
      {data.age_demographics.length > 0 && (
        <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            Age Demographics
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Customer age distribution and credit score by age group
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: 'center' }}>
            {data.age_demographics.map((demo) => (
              <Box
                key={demo.age_range}
                sx={{
                  p: 2,
                  border: '1px solid #e0e0e0',
                  borderRadius: 2,
                  minWidth: 150,
                  textAlign: 'center'
                }}
              >
                <Typography variant="h6" fontWeight="bold" color="primary">
                  {demo.age_range}
                </Typography>
                <Typography variant="h4" fontWeight="bold" sx={{ my: 1 }}>
                  {demo.count}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {demo.percentage.toFixed(1)}% of customers
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Avg Credit: <strong>{demo.avg_credit_score.toFixed(0)}</strong>
                </Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      )}

      {/* Top Customers Table */}
      <Paper elevation={2} sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom fontWeight="bold">
          Top Customers by Lifetime Value
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Most valuable customers ranked by total purchase amount
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <TopCustomersTable customers={data.top_customers} />
      </Paper>
    </Box>
  );
}
