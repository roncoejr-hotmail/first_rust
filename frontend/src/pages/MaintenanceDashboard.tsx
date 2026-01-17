import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Divider
} from '@mui/material';
import { fetchMaintenanceAnalytics } from '../api/maintenance';
import type { MaintenanceAnalytics } from '../api/maintenance';
import KPICard from '../components/KPICard';
import MaintenanceByTypeChart from '../components/MaintenanceByTypeChart';
import MaintenanceCostTrendChart from '../components/MaintenanceCostTrendChart';
import MaintenanceRecordsTable from '../components/MaintenanceRecordsTable';
import BuildIcon from '@mui/icons-material/Build';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CategoryIcon from '@mui/icons-material/Category';

export default function MaintenanceDashboard() {
  const [data, setData] = useState<MaintenanceAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const result = await fetchMaintenanceAnalytics();
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
        Vehicle Maintenance Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Comprehensive maintenance tracking and service cost analysis
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
            title="Total Services"
            value={data.total_maintenance_records.toString()}
            icon={<BuildIcon />}
            color="#ff9800"
          />
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
          <KPICard
            title="Total Cost"
            value={formatCurrency(data.total_maintenance_cost)}
            icon={<AttachMoneyIcon />}
            color="#f44336"
          />
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
          <KPICard
            title="Avg Service Cost"
            value={formatCurrency(data.average_maintenance_cost)}
            icon={<TrendingUpIcon />}
            color="#2196f3"
          />
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
          <KPICard
            title="Vehicles Serviced"
            value={data.vehicles_serviced.toString()}
            icon={<DirectionsCarIcon />}
            color="#4caf50"
          />
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
          <KPICard
            title="Most Common Service"
            value={data.most_common_service}
            icon={<CategoryIcon />}
            color="#9c27b0"
          />
        </Box>
      </Box>

      {/* Cost Trend Chart */}
      <Paper elevation={2} sx={{ p: 2, mb: 4 }}>
        <Typography variant="h6" gutterBottom fontWeight="bold">
          Maintenance Cost Trend
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Historical maintenance spending over time
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <MaintenanceCostTrendChart data={data.maintenance_cost_trend} />
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
        {/* Maintenance by Type */}
        <Paper
          elevation={2}
          sx={{ flex: '1 1 500px', minWidth: '300px', p: 2 }}
        >
          <Typography variant="h6" gutterBottom fontWeight="bold">
            Services by Type
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Distribution of maintenance services performed
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <MaintenanceByTypeChart data={data.maintenance_by_type} />
        </Paper>

        {/* Top Vehicles by Cost */}
        <Paper
          elevation={2}
          sx={{ flex: '1 1 400px', minWidth: '300px', p: 2 }}
        >
          <Typography variant="h6" gutterBottom fontWeight="bold">
            Top Vehicles by Maintenance Cost
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Vehicles requiring the most maintenance investment
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
            {data.top_vehicles_by_cost.map((vehicle, index) => (
              <Box
                key={vehicle.vehicle_id}
                sx={{
                  p: 2,
                  mb: 1,
                  border: '1px solid #e0e0e0',
                  borderRadius: 1,
                  backgroundColor: index < 3 ? '#fff3e0' : 'transparent'
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      {vehicle.vehicle_info}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      VIN: {vehicle.vin} • {vehicle.service_count} services
                    </Typography>
                  </Box>
                  <Typography variant="h6" fontWeight="bold" color="error.main">
                    {formatCurrency(vehicle.total_maintenance_cost)}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Last Service: {vehicle.last_service_type} on {new Date(vehicle.last_service_date).toLocaleDateString()}
                </Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      </Box>

      {/* Service Provider Stats */}
      {data.service_provider_stats.length > 0 && (
        <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            Service Provider Statistics
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Top service providers by total maintenance cost
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
            {data.service_provider_stats.map((provider) => (
              <Box
                key={provider.service_provider}
                sx={{
                  p: 2,
                  border: '1px solid #e0e0e0',
                  borderRadius: 2,
                  minWidth: 200,
                  textAlign: 'center'
                }}
              >
                <Typography variant="body2" fontWeight="bold" color="primary">
                  {provider.service_provider}
                </Typography>
                <Typography variant="h5" fontWeight="bold" sx={{ my: 1 }}>
                  {formatCurrency(provider.total_cost)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {provider.service_count} services
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="caption" color="text.secondary">
                  Avg: {formatCurrency(provider.average_cost)}
                </Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      )}

      {/* Recent Maintenance Records */}
      <Paper elevation={2} sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom fontWeight="bold">
          Recent Maintenance Records
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Latest service history across all vehicles
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <MaintenanceRecordsTable records={data.recent_maintenance} />
      </Paper>
    </Box>
  );
}
