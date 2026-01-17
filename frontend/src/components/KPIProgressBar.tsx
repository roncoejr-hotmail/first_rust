import { Box, Typography, LinearProgress } from '@mui/material';
import type { KPIDetail } from '../api/kpi';

interface Props {
  kpi: KPIDetail;
}

export default function KPIProgressBar({ kpi }: Props) {
  const getColor = () => {
    if (kpi.status === 'on-track') return 'success';
    if (kpi.status === 'at-risk') return 'warning';
    return 'error';
  };

  const formatValue = (value: number) => {
    if (kpi.unit === '%') return `${value.toFixed(1)}%`;
    if (kpi.unit === '$') return `$${value.toLocaleString()}`;
    return `${value.toLocaleString()} ${kpi.unit}`;
  };

  const clampedAchievement = Math.max(0, Math.min(150, kpi.achievement_percentage));

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
          {kpi.kpi_name}
        </Typography>
        <Typography variant="body2" sx={{ 
          fontWeight: 'bold',
          color: kpi.status === 'on-track' ? '#4caf50' : kpi.status === 'at-risk' ? '#ff9800' : '#f44336'
        }}>
          {kpi.achievement_percentage.toFixed(0)}%
        </Typography>
      </Box>
      
      <LinearProgress 
        variant="determinate" 
        value={clampedAchievement} 
        color={getColor()}
        sx={{ 
          height: 10, 
          borderRadius: 5,
          backgroundColor: '#e0e0e0',
          '& .MuiLinearProgress-bar': {
            borderRadius: 5,
          }
        }}
      />
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          Current: {formatValue(kpi.current_value)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Target: {formatValue(kpi.target_value)}
        </Typography>
      </Box>
      
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
        {kpi.description}
      </Typography>
    </Box>
  );
}
