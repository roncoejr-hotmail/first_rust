import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Divider
} from '@mui/material';
import { fetchInventoryOverview } from '../api/inventory';
import type { InventoryOverview } from '../api/inventory';
import KPICard from '../components/KPICard';
import InventoryByTypeChart from '../components/InventoryByTypeChart';
import MarkupAnalysisChart from '../components/MarkupAnalysisChart';
import VehicleInventoryTable from '../components/VehicleInventoryTable';
import DateRangePicker from '../components/DateRangePicker';
import FilterPanel from '../components/FilterPanel';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

export default function InventoryDashboard() {
  const [data, setData] = useState<InventoryOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states - show all time by default for inventory
  const getDefaultEndDate = () => new Date().toISOString().split('T')[0];
  const getDefaultStartDate = () => '2010-01-01';
  
  const [startDate, setStartDate] = useState(getDefaultStartDate());
  const [endDate, setEndDate] = useState(getDefaultEndDate());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVehicleTypes, setSelectedVehicleTypes] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await fetchInventoryOverview({
        start_date: startDate,
        end_date: endDate,
        vehicle_type: selectedVehicleTypes.length === 1 ? selectedVehicleTypes[0] : undefined,
        status: selectedStatuses.length === 1 ? selectedStatuses[0] : undefined,
        search: searchQuery || undefined,
      });
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [startDate, endDate, searchQuery, selectedVehicleTypes, selectedStatuses]);

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

  const availablePercentage = data.total_vehicles > 0 
    ? ((data.available_vehicles / data.total_vehicles) * 100).toFixed(1)
    : '0';

  const handleDateChange = (newStartDate: string, newEndDate: string) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
  };

  const vehicleTypes = ['Sedan', 'SUV', 'Truck', 'Coupe', 'Hatchback'];
  const statuses = ['Available', 'Sold'];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom fontWeight="bold" color="primary">
        Inventory Management Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Real-time vehicle inventory tracking and analysis
      </Typography>

      {/* Date Range Filter */}
      <Paper sx={{ p: 2, mb: 3, backgroundColor: '#f5f5f5' }}>
        <DateRangePicker 
          startDate={startDate} 
          endDate={endDate} 
          onDateChange={handleDateChange} 
        />
      </Paper>

      {/* Advanced Filters */}
      <FilterPanel
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        vehicleTypes={vehicleTypes}
        selectedVehicleTypes={selectedVehicleTypes}
        onVehicleTypeChange={setSelectedVehicleTypes}
        statuses={statuses}
        selectedStatuses={selectedStatuses}
        onStatusChange={setSelectedStatuses}
      />

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
            title="Total Vehicles"
            value={data.total_vehicles.toString()}
            icon={<DirectionsCarIcon />}
            color="#2196f3"
          />
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
          <KPICard
            title="Available"
            value={`${data.available_vehicles} (${availablePercentage}%)`}
            icon={<CheckCircleIcon />}
            color="#4caf50"
          />
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
          <KPICard
            title="Sold"
            value={data.sold_vehicles.toString()}
            icon={<ShoppingCartIcon />}
            color="#9e9e9e"
          />
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
          <KPICard
            title="Inventory Value"
            value={formatCurrency(data.total_inventory_value)}
            icon={<AttachMoneyIcon />}
            color="#ff9800"
          />
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
          <KPICard
            title="Avg Days to Sell"
            value={data.average_days_in_inventory.toFixed(0)}
            icon={<AccessTimeIcon />}
            color="#9c27b0"
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
        {/* Inventory by Type Chart */}
        <Paper
          elevation={2}
          sx={{ flex: '1 1 500px', minWidth: '300px', p: 2 }}
        >
          <Typography variant="h6" gutterBottom fontWeight="bold">
            Inventory by Vehicle Type
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Available vs Sold vehicles by type
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <InventoryByTypeChart data={data.vehicles_by_type} />
        </Paper>

        {/* Markup Analysis Chart */}
        <Paper
          elevation={2}
          sx={{ flex: '1 1 500px', minWidth: '300px', p: 2 }}
        >
          <Typography variant="h6" gutterBottom fontWeight="bold">
            Cost vs Sale Price Analysis
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Average cost, sale price, and markup percentage by vehicle type
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <MarkupAnalysisChart data={data.cost_vs_price_analysis} />
        </Paper>
      </Box>

      {/* Vehicle Inventory Table */}
      <Paper elevation={2} sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom fontWeight="bold">
          Recent Vehicle Inventory
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Latest vehicles in inventory (showing available first)
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <VehicleInventoryTable vehicles={data.recent_vehicles} />
      </Paper>
    </Box>
  );
}
