import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Typography
} from '@mui/material';
import type { TopCustomer } from '../api/customers';

interface Props {
  customers: TopCustomer[];
}

export default function TopCustomersTable({ customers }: Props) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getCreditScoreColor = (score: number): "success" | "warning" | "error" | "default" => {
    if (score >= 740) return 'success';
    if (score >= 670) return 'warning';
    if (score >= 580) return 'error';
    return 'default';
  };

  return (
    <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell><Typography variant="subtitle2" fontWeight="bold">Customer</Typography></TableCell>
            <TableCell><Typography variant="subtitle2" fontWeight="bold">Email</Typography></TableCell>
            <TableCell><Typography variant="subtitle2" fontWeight="bold">State</Typography></TableCell>
            <TableCell align="right"><Typography variant="subtitle2" fontWeight="bold">Total Purchases</Typography></TableCell>
            <TableCell align="center"><Typography variant="subtitle2" fontWeight="bold">Purchase Count</Typography></TableCell>
            <TableCell align="center"><Typography variant="subtitle2" fontWeight="bold">Credit Score</Typography></TableCell>
            <TableCell><Typography variant="subtitle2" fontWeight="bold">First Purchase</Typography></TableCell>
            <TableCell><Typography variant="subtitle2" fontWeight="bold">Last Purchase</Typography></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {customers.map((customer) => (
            <TableRow
              key={customer.customer_id}
              sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
            >
              <TableCell>
                <Typography variant="body2" fontWeight="medium">
                  {customer.customer_name}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                  {customer.email}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">{customer.state}</Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2" fontWeight="bold" color="primary">
                  {formatCurrency(customer.total_purchases)}
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Chip 
                  label={customer.purchase_count}
                  size="small"
                  color={customer.purchase_count > 1 ? 'success' : 'default'}
                />
              </TableCell>
              <TableCell align="center">
                <Chip
                  label={customer.credit_score}
                  size="small"
                  color={getCreditScoreColor(customer.credit_score)}
                  sx={{ fontWeight: 'medium' }}
                />
              </TableCell>
              <TableCell>
                <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                  {formatDate(customer.first_purchase_date)}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                  {formatDate(customer.last_purchase_date)}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
