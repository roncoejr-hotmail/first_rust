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
import type { VarianceItem } from '../api/variance';

interface Props {
  data: VarianceItem[];
  title: string;
  type: 'favorable' | 'unfavorable';
}

export default function VarianceItemsTable({ data, title, type }: Props) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (data.length === 0) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          No variances found
        </Typography>
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Typography variant="h6" sx={{ p: 2, fontWeight: 'bold' }}>
        {title}
      </Typography>
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
            <TableCell align="right" sx={{ fontWeight: 'bold' }}>%</TableCell>
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
                  color={type === 'favorable' ? 'success' : 'error'}
                  size="small"
                />
              </TableCell>
              <TableCell align="right">
                <span style={{ 
                  color: type === 'favorable' ? '#4caf50' : '#f44336',
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
