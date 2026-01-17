import { Card, CardContent, Typography, Box } from '@mui/material';
import { green, red } from '@mui/material/colors';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number; // Percentage change
  icon?: React.ReactNode;
}

export default function KPICard({ title, value, subtitle, trend, icon }: KPICardProps) {
  const trendColor = trend && trend > 0 ? green[600] : red[600];
  const TrendIcon = trend && trend > 0 ? TrendingUpIcon : TrendingDownIcon;

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', my: 1 }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
            {trend !== undefined && (
              <Box display="flex" alignItems="center" mt={1}>
                <TrendIcon sx={{ fontSize: 16, color: trendColor, mr: 0.5 }} />
                <Typography variant="body2" sx={{ color: trendColor }}>
                  {Math.abs(trend).toFixed(1)}%
                </Typography>
              </Box>
            )}
          </Box>
          {icon && (
            <Box sx={{ color: 'primary.main', opacity: 0.8 }}>
              {icon}
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
