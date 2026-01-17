import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip
} from '@mui/material';
import type { VarianceDetail } from '../api/budget';

interface Props {
  data: VarianceDetail[];
}

export default function VarianceTable({ data }: Props) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getVarianceColor = (variance: number) => {
    if (Math.abs(variance) < 1000) return 'success';
    if (variance > 0) return 'error'; // Over budget
    return 'warning'; // Under budget
  };

  return (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
            <TableCell sx={{ fontWeight: 'bold' }}>Month</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Category</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Subcategory</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Department</TableCell>
            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Budgeted</TableCell>
            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actual</TableCell>
            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Variance</TableCell>
            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Variance %</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row, index) => (
            <TableRow key={index} hover>
              <TableCell>{row.month}</TableCell>
              <TableCell sx={{ textTransform: 'capitalize' }}>{row.category}</TableCell>
              <TableCell sx={{ textTransform: 'capitalize' }}>{row.subcategory}</TableCell>
              <TableCell>{row.department}</TableCell>
              <TableCell align="right">{formatCurrency(row.budgeted)}</TableCell>
              <TableCell align="right">{formatCurrency(row.actual)}</TableCell>
              <TableCell align="right">
                <Chip 
                  label={formatCurrency(row.variance)}
                  color={getVarianceColor(row.variance)}
                  size="small"
                />
              </TableCell>
              <TableCell align="right">
                <span style={{ 
                  color: row.variance > 0 ? '#f44336' : row.variance < 0 ? '#ff9800' : '#4caf50',
                  fontWeight: 'bold'
                }}>
                  {row.variance > 0 ? '+' : ''}{row.variance_percentage.toFixed(1)}%
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
