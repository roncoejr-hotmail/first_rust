import { Box, TextField, Button, ButtonGroup } from '@mui/material';
import { useState } from 'react';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onDateChange: (startDate: string, endDate: string) => void;
}

export default function DateRangePicker({ startDate, endDate, onDateChange }: DateRangePickerProps) {
  const [localStartDate, setLocalStartDate] = useState(startDate);
  const [localEndDate, setLocalEndDate] = useState(endDate);

  const handleApply = () => {
    onDateChange(localStartDate, localEndDate);
  };

  const setPresetRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    
    const endStr = end.toISOString().split('T')[0];
    const startStr = start.toISOString().split('T')[0];
    
    setLocalStartDate(startStr);
    setLocalEndDate(endStr);
    onDateChange(startStr, endStr);
  };

  const setPresetQuarter = () => {
    const end = new Date();
    const start = new Date();
    start.setMonth(end.getMonth() - 3);
    
    const endStr = end.toISOString().split('T')[0];
    const startStr = start.toISOString().split('T')[0];
    
    setLocalStartDate(startStr);
    setLocalEndDate(endStr);
    onDateChange(startStr, endStr);
  };

  const setPresetYear = () => {
    const end = new Date();
    const start = new Date();
    start.setFullYear(end.getFullYear() - 1);
    
    const endStr = end.toISOString().split('T')[0];
    const startStr = start.toISOString().split('T')[0];
    
    setLocalStartDate(startStr);
    setLocalEndDate(endStr);
    onDateChange(startStr, endStr);
  };

  const setAllTime = () => {
    setLocalStartDate('2010-01-01');
    setLocalEndDate(new Date().toISOString().split('T')[0]);
    onDateChange('2010-01-01', new Date().toISOString().split('T')[0]);
  };

  return (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
      <TextField
        label="Start Date"
        type="date"
        value={localStartDate}
        onChange={(e) => setLocalStartDate(e.target.value)}
        InputLabelProps={{ shrink: true }}
        size="small"
      />
      <TextField
        label="End Date"
        type="date"
        value={localEndDate}
        onChange={(e) => setLocalEndDate(e.target.value)}
        InputLabelProps={{ shrink: true }}
        size="small"
      />
      <Button variant="contained" size="small" onClick={handleApply}>
        Apply
      </Button>
      
      <Box sx={{ ml: 2 }}>
        <ButtonGroup size="small" variant="outlined">
          <Button onClick={() => setPresetRange(7)}>Last 7D</Button>
          <Button onClick={() => setPresetRange(30)}>Last 30D</Button>
          <Button onClick={setPresetQuarter}>Last Quarter</Button>
          <Button onClick={setPresetYear}>Last Year</Button>
          <Button onClick={setAllTime}>All Time</Button>
        </ButtonGroup>
      </Box>
    </Box>
  );
}
