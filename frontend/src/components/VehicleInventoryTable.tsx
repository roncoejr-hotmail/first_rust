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
import type { VehicleDetail } from '../api/inventory';

interface Props {
  vehicles: VehicleDetail[];
}

export default function VehicleInventoryTable({ vehicles }: Props) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatMileage = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  return (
    <TableContainer component={Paper} sx={{ maxHeight: 500 }}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell><Typography variant="subtitle2" fontWeight="bold">VIN</Typography></TableCell>
            <TableCell><Typography variant="subtitle2" fontWeight="bold">Make/Model</Typography></TableCell>
            <TableCell><Typography variant="subtitle2" fontWeight="bold">Year</Typography></TableCell>
            <TableCell><Typography variant="subtitle2" fontWeight="bold">Type</Typography></TableCell>
            <TableCell><Typography variant="subtitle2" fontWeight="bold">Color</Typography></TableCell>
            <TableCell align="right"><Typography variant="subtitle2" fontWeight="bold">Mileage</Typography></TableCell>
            <TableCell align="right"><Typography variant="subtitle2" fontWeight="bold">Cost</Typography></TableCell>
            <TableCell align="center"><Typography variant="subtitle2" fontWeight="bold">Status</Typography></TableCell>
            <TableCell align="right"><Typography variant="subtitle2" fontWeight="bold">Days</Typography></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {vehicles.map((vehicle) => (
            <TableRow
              key={vehicle.vehicle_id}
              sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
            >
              <TableCell>
                <Typography variant="body2" fontFamily="monospace">
                  {vehicle.vin}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {vehicle.make} {vehicle.model}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">{vehicle.year}</Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">{vehicle.vehicle_type}</Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">{vehicle.color}</Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2">{formatMileage(vehicle.mileage)}</Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2">{formatCurrency(vehicle.cost_price)}</Typography>
              </TableCell>
              <TableCell align="center">
                <Chip
                  label={vehicle.status}
                  color={vehicle.status === 'Available' ? 'success' : 'default'}
                  size="small"
                  sx={{ fontWeight: 'medium' }}
                />
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2">{vehicle.days_in_inventory}</Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
