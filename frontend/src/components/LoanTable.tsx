import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Typography,
  LinearProgress,
  Box
} from '@mui/material';
import type { LoanDetail } from '../api/finance';

interface Props {
  loans: LoanDetail[];
}

export default function LoanTable({ loans }: Props) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getProgressPercentage = (remaining: number, total: number) => {
    if (total === 0) return 0;
    const paid = total - remaining;
    return (paid / total) * 100;
  };

  const getStatusColor = (status: string): "success" | "info" | "default" | "error" | "warning" => {
    const statusMap: { [key: string]: "success" | "info" | "default" | "error" | "warning" } = {
      'active': 'success',
      'approved': 'info',
      'paid_off': 'default',
      'defaulted': 'error',
      'refinanced': 'warning'
    };
    return statusMap[status] || 'default';
  };

  return (
    <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell><Typography variant="subtitle2" fontWeight="bold">Loan ID</Typography></TableCell>
            <TableCell><Typography variant="subtitle2" fontWeight="bold">Customer</Typography></TableCell>
            <TableCell><Typography variant="subtitle2" fontWeight="bold">Vehicle</Typography></TableCell>
            <TableCell align="right"><Typography variant="subtitle2" fontWeight="bold">Loan Amount</Typography></TableCell>
            <TableCell align="right"><Typography variant="subtitle2" fontWeight="bold">Balance</Typography></TableCell>
            <TableCell><Typography variant="subtitle2" fontWeight="bold">Progress</Typography></TableCell>
            <TableCell align="right"><Typography variant="subtitle2" fontWeight="bold">Rate</Typography></TableCell>
            <TableCell align="right"><Typography variant="subtitle2" fontWeight="bold">Payment</Typography></TableCell>
            <TableCell align="center"><Typography variant="subtitle2" fontWeight="bold">Status</Typography></TableCell>
            <TableCell align="right"><Typography variant="subtitle2" fontWeight="bold">Days Active</Typography></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loans.map((loan) => {
            const progress = getProgressPercentage(loan.remaining_balance, loan.loan_amount);
            return (
              <TableRow
                key={loan.loan_id}
                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
              >
                <TableCell>
                  <Typography variant="body2" fontFamily="monospace">
                    #{loan.loan_id}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{loan.customer_name}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{loan.vehicle_info}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2">{formatCurrency(loan.loan_amount)}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight="bold">
                    {formatCurrency(loan.remaining_balance)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ width: 100 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={progress} 
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {progress.toFixed(0)}% paid
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2">{loan.interest_rate.toFixed(2)}%</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2">{formatCurrency(loan.monthly_payment)}</Typography>
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={loan.loan_status.charAt(0).toUpperCase() + loan.loan_status.slice(1)}
                    color={getStatusColor(loan.loan_status)}
                    size="small"
                    sx={{ fontWeight: 'medium' }}
                  />
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2">{loan.days_active}</Typography>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
