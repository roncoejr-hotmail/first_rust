import { 
  Box, 
  TextField, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Chip,
  OutlinedInput,
  Paper,
  Typography,
  IconButton,
  Collapse
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useState } from 'react';

interface FilterPanelProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  vehicleTypes?: string[];
  selectedVehicleTypes?: string[];
  onVehicleTypeChange?: (types: string[]) => void;
  statuses?: string[];
  selectedStatuses?: string[];
  onStatusChange?: (statuses: string[]) => void;
  employees?: Array<{ id: number; name: string }>;
  selectedEmployeeId?: number;
  onEmployeeChange?: (id: number) => void;
}

export default function FilterPanel({
  searchQuery = '',
  onSearchChange,
  vehicleTypes = [],
  selectedVehicleTypes = [],
  onVehicleTypeChange,
  statuses = [],
  selectedStatuses = [],
  onStatusChange,
  employees = [],
  selectedEmployeeId = 0,
  onEmployeeChange,
}: FilterPanelProps) {
  const [expanded, setExpanded] = useState(true);

  const handleVehicleTypeChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    onVehicleTypeChange?.(typeof value === 'string' ? value.split(',') : value);
  };

  const handleStatusChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    onStatusChange?.(typeof value === 'string' ? value.split(',') : value);
  };

  const activeFiltersCount = 
    (searchQuery ? 1 : 0) +
    (selectedVehicleTypes.length > 0 ? 1 : 0) +
    (selectedStatuses.length > 0 ? 1 : 0) +
    (selectedEmployeeId > 0 ? 1 : 0);

  return (
    <Paper sx={{ p: 2, mb: 3, backgroundColor: '#f5f5f5' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: expanded ? 2 : 0 }}>
        <FilterListIcon sx={{ mr: 1, color: '#1976d2' }} />
        <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
          Filters
          {activeFiltersCount > 0 && (
            <Chip 
              label={activeFiltersCount} 
              size="small" 
              color="primary" 
              sx={{ ml: 1 }} 
            />
          )}
        </Typography>
        <IconButton onClick={() => setExpanded(!expanded)} size="small">
          {expanded ? '▲' : '▼'}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {onSearchChange && (
            <TextField
              label="Search"
              placeholder="Search by name, VIN, etc..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              size="small"
              sx={{ minWidth: 250 }}
            />
          )}

          {vehicleTypes.length > 0 && onVehicleTypeChange && (
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Vehicle Type</InputLabel>
              <Select
                multiple
                value={selectedVehicleTypes}
                onChange={handleVehicleTypeChange}
                input={<OutlinedInput label="Vehicle Type" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {vehicleTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {statuses.length > 0 && onStatusChange && (
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Status</InputLabel>
              <Select
                multiple
                value={selectedStatuses}
                onChange={handleStatusChange}
                input={<OutlinedInput label="Status" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {statuses.map((status) => (
                  <MenuItem key={status} value={status}>
                    {status}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {employees.length > 0 && onEmployeeChange && (
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Employee</InputLabel>
              <Select
                value={selectedEmployeeId}
                onChange={(e) => onEmployeeChange(Number(e.target.value))}
                label="Employee"
              >
                <MenuItem value={0}>All Employees</MenuItem>
                {employees.map((emp) => (
                  <MenuItem key={emp.id} value={emp.id}>
                    {emp.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
}
