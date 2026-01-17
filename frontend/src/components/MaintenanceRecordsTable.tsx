import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography
} from '@mui/material';
import type { MaintenanceRecord } from '../api/maintenance';

interface Props {
  records: MaintenanceRecord[];
}

export default function MaintenanceRecordsTable({ records }: Props) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatMileage = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  return (
    <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell><Typography variant="subtitle2" fontWeight="bold">Service Date</Typography></TableCell>
            <TableCell><Typography variant="subtitle2" fontWeight="bold">Vehicle</Typography></TableCell>
            <TableCell><Typography variant="subtitle2" fontWeight="bold">Service Type</Typography></TableCell>
            <TableCell align="right"><Typography variant="subtitle2" fontWeight="bold">Mileage</Typography></TableCell>
            <TableCell><Typography variant="subtitle2" fontWeight="bold">Provider</Typography></TableCell>
            <TableCell align="right"><Typography variant="subtitle2" fontWeight="bold">Cost</Typography></TableCell>
            <TableCell><Typography variant="subtitle2" fontWeight="bold">Description</Typography></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {records.map((record) => (
            <TableRow
              key={record.maintenance_id}
              sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
            >
              <TableCell>
                <Typography variant="body2">
                  {formatDate(record.service_date)}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" fontWeight="medium">
                  {record.vehicle_info}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">{record.service_type}</Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2">{formatMileage(record.mileage_at_service)}</Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                  {record.service_provider}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2" fontWeight="bold" color="error.main">
                  {formatCurrency(record.cost)}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" sx={{ fontSize: '0.85rem', maxWidth: 200 }} noWrap>
                  {record.description || '-'}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
