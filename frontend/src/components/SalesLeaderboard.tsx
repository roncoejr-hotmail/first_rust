import { Card, CardContent, Typography, Box, Avatar, Chip } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import type { SalespersonPerformance } from '../api/salesPerformance';

interface SalesLeaderboardProps {
  performers: SalespersonPerformance[];
}

export default function SalesLeaderboard({ performers }: SalesLeaderboardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getMedalColor = (index: number) => {
    if (index === 0) return '#FFD700'; // Gold
    if (index === 1) return '#C0C0C0'; // Silver
    if (index === 2) return '#CD7F32'; // Bronze
    return 'transparent';
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EmojiEventsIcon color="primary" />
          Sales Leaderboard
        </Typography>
        <Box sx={{ mt: 2 }}>
          {performers.map((performer, index) => (
            <Box
              key={performer.employee_id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 2,
                mb: 1,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                backgroundColor: index < 3 ? 'action.hover' : 'transparent',
                transition: 'all 0.2s',
                '&:hover': {
                  backgroundColor: 'action.selected',
                  transform: 'translateX(4px)',
                },
              }}
            >
              <Box sx={{ minWidth: 40, textAlign: 'center' }}>
                {index < 3 ? (
                  <Avatar sx={{ bgcolor: getMedalColor(index), width: 32, height: 32, fontSize: '1rem', fontWeight: 'bold', color: '#000' }}>
                    {index + 1}
                  </Avatar>
                ) : (
                  <Typography variant="h6" color="text.secondary">
                    {index + 1}
                  </Typography>
                )}
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                  {performer.name}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                  <Chip label={performer.role} size="small" variant="outlined" />
                  <Chip label={`${performer.total_sales} sales`} size="small" color="primary" />
                </Box>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="h6" color="primary">
                  {formatCurrency(performer.total_revenue)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Commission: {formatCurrency(performer.commission_earned)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Avg: {formatCurrency(performer.average_sale_price)}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}
