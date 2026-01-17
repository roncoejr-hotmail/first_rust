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
import type { EmployeeDetail } from '../api/employees';

interface Props {
  employees: EmployeeDetail[];
}

export default function EmployeeTable({ employees }: Props) {
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

  return (
    <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell><Typography variant="subtitle2" fontWeight="bold">Employee</Typography></TableCell>
            <TableCell><Typography variant="subtitle2" fontWeight="bold">Email</Typography></TableCell>
            <TableCell><Typography variant="subtitle2" fontWeight="bold">Role</Typography></TableCell>
            <TableCell><Typography variant="subtitle2" fontWeight="bold">Hire Date</Typography></TableCell>
            <TableCell align="right"><Typography variant="subtitle2" fontWeight="bold">Commission Rate</Typography></TableCell>
            <TableCell align="center"><Typography variant="subtitle2" fontWeight="bold">Total Sales</Typography></TableCell>
            <TableCell align="right"><Typography variant="subtitle2" fontWeight="bold">Total Revenue</Typography></TableCell>
            <TableCell align="center"><Typography variant="subtitle2" fontWeight="bold">Status</Typography></TableCell>
            <TableCell align="right"><Typography variant="subtitle2" fontWeight="bold">Days Employed</Typography></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {employees.map((employee) => (
            <TableRow
              key={employee.employee_id}
              sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
            >
              <TableCell>
                <Typography variant="body2" fontWeight="medium">
                  {employee.employee_name}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                  {employee.email}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">{employee.role}</Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                  {formatDate(employee.hire_date)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2">{employee.commission_rate.toFixed(2)}%</Typography>
              </TableCell>
              <TableCell align="center">
                <Chip 
                  label={employee.total_sales}
                  size="small"
                  color={employee.total_sales > 0 ? 'primary' : 'default'}
                />
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2" fontWeight="bold" color="primary">
                  {formatCurrency(employee.total_revenue)}
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Chip
                  label={employee.is_active ? 'Active' : 'Inactive'}
                  size="small"
                  color={employee.is_active ? 'success' : 'default'}
                  sx={{ fontWeight: 'medium' }}
                />
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2">{employee.days_employed}</Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
