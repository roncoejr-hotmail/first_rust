import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Divider
} from '@mui/material';
import { fetchFinanceOverview } from '../api/finance';
import type { FinanceOverview } from '../api/finance';
import KPICard from '../components/KPICard';
import MonthlyPaymentChart from '../components/MonthlyPaymentChart';
import LoanStatusChart from '../components/LoanStatusChart';
import LoanTable from '../components/LoanTable';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PercentIcon from '@mui/icons-material/Percent';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';

export default function FinanceDashboard() {
  const [data, setData] = useState<FinanceOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const result = await fetchFinanceOverview();
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

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom fontWeight="bold" color="primary">
        Finance & Loan Management Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Comprehensive loan portfolio tracking and payment analysis
      </Typography>

      {/* Top KPI Cards */}
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
            title="Total Loans"
            value={`${data.total_loans} (${data.active_loans} active)`}
            icon={<AccountBalanceIcon />}
            color="#2196f3"
          />
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
          <KPICard
            title="Outstanding Balance"
            value={formatCurrency(data.outstanding_balance)}
            icon={<AttachMoneyIcon />}
            color="#ff9800"
          />
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
          <KPICard
            title="Interest Revenue"
            value={formatCurrency(data.total_interest_revenue)}
            icon={<TrendingUpIcon />}
            color="#4caf50"
          />
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
          <KPICard
            title="Avg Interest Rate"
            value={`${data.average_interest_rate.toFixed(2)}%`}
            icon={<PercentIcon />}
            color="#9c27b0"
          />
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
          <KPICard
            title="Collection Rate"
            value={`${data.payment_collection_rate.toFixed(1)}%`}
            icon={<CheckCircleIcon />}
            color="#00bcd4"
          />
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
          <KPICard
            title="Late Payments"
            value={`${data.late_payment_analysis.total_late_payments} (${formatCurrency(data.late_payment_analysis.total_late_fees)} fees)`}
            icon={<WarningIcon />}
            color="#f44336"
          />
        </Box>
      </Box>

      {/* Charts Section */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 3,
          mb: 4
        }}
      >
        {/* Monthly Payment Trends */}
        <Paper
          elevation={2}
          sx={{ flex: '1 1 500px', minWidth: '300px', p: 2 }}
        >
          <Typography variant="h6" gutterBottom fontWeight="bold">
            Monthly Payment Trends
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Principal and interest payments over the last 6 months
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <MonthlyPaymentChart data={data.monthly_payment_trends} />
        </Paper>

        {/* Loan Status Breakdown */}
        <Paper
          elevation={2}
          sx={{ flex: '1 1 400px', minWidth: '300px', p: 2 }}
        >
          <Typography variant="h6" gutterBottom fontWeight="bold">
            Loan Portfolio Status
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Distribution of loans by current status
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <LoanStatusChart data={data.loans_by_status} />
        </Paper>
      </Box>

      {/* Risk Analysis Card */}
      {data.late_payment_analysis.loans_at_risk > 0 && (
        <Paper
          elevation={2}
          sx={{ p: 3, mb: 4, borderLeft: '4px solid #f44336' }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <WarningIcon sx={{ color: '#f44336', fontSize: 32 }} />
            <Box>
              <Typography variant="h6" fontWeight="bold" color="error">
                Risk Alert
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Loans requiring attention due to late payments
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Loans at Risk
              </Typography>
              <Typography variant="h5" fontWeight="bold" color="error">
                {data.late_payment_analysis.loans_at_risk}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Total Late Payments
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                {data.late_payment_analysis.total_late_payments}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Late Fees Collected
              </Typography>
              <Typography variant="h5" fontWeight="bold" color="success.main">
                {formatCurrency(data.late_payment_analysis.total_late_fees)}
              </Typography>
            </Box>
          </Box>
        </Paper>
      )}

      {/* Top Loans Table */}
      <Paper elevation={2} sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom fontWeight="bold">
          Top Active Loans by Balance
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Largest outstanding loan balances requiring monitoring
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <LoanTable loans={data.top_loans_by_balance} />
      </Paper>
    </Box>
  );
}
