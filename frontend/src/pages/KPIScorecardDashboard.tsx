import { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  CircularProgress,
  Alert,
  Box,
  Paper,
  Divider,
  Chip,
  Tabs,
  Tab
} from '@mui/material';
import { fetchKPIScorecard } from '../api/kpi';
import type { KPIScorecardOverview, KPIDetail } from '../api/kpi';
import KPICard from '../components/KPICard';
import KPIGauge from '../components/KPIGauge';
import KPIProgressBar from '../components/KPIProgressBar';
import KPITrendChart from '../components/KPITrendChart';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

export default function KPIScorecardDashboard() {
  const [data, setData] = useState<KPIScorecardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const kpiData = await fetchKPIScorecard();
      setData(kpiData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!data) {
    return null;
  }

  const categories = ['All', ...Array.from(new Set(data.kpi_details.map(k => k.category)))];
  
  const filteredKPIs = selectedCategory === 'All' 
    ? data.kpi_details 
    : data.kpi_details.filter(k => k.category === selectedCategory);

  const groupedByCategory = data.kpi_details.reduce((acc, kpi) => {
    if (!acc[kpi.category]) {
      acc[kpi.category] = [];
    }
    acc[kpi.category].push(kpi);
    return acc;
  }, {} as Record<string, KPIDetail[]>);

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#1976d2' }}>
        🎯 KPI Scorecard Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Track performance against key performance indicators
      </Typography>

      {/* Summary KPI Cards */}
      <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: 'wrap' }}>
        <KPICard
          title="Total KPIs"
          value={data.total_kpis.toString()}
          icon={<TrendingUpIcon />}
          color="#2196f3"
        />
        <KPICard
          title="On Track"
          value={data.kpis_on_track.toString()}
          icon={<CheckCircleIcon />}
          color="#4caf50"
        />
        <KPICard
          title="At Risk"
          value={data.kpis_at_risk.toString()}
          icon={<WarningIcon />}
          color="#ff9800"
        />
        <KPICard
          title="Off Track"
          value={data.kpis_off_track.toString()}
          icon={<ErrorIcon />}
          color="#f44336"
        />
        <KPICard
          title="Overall Score"
          value={`${data.overall_score.toFixed(0)}%`}
          icon={<TrendingUpIcon />}
          color={data.overall_score >= 90 ? '#4caf50' : data.overall_score >= 75 ? '#ff9800' : '#f44336'}
        />
      </Box>

      {/* Overall Score Gauge */}
      <Paper sx={{ p: 3, mb: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
          Overall Performance Score
        </Typography>
        <KPIGauge 
          value={data.overall_score} 
          label="Overall" 
          status={data.overall_score >= 90 ? 'on-track' : data.overall_score >= 75 ? 'at-risk' : 'off-track'}
          size={200}
        />
      </Paper>

      {/* Category Summary */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
          Performance by Category
        </Typography>
        <Divider sx={{ mb: 3 }} />
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: 'center' }}>
          {data.kpis_by_category.map((cat, idx) => (
            <Box key={idx} sx={{ 
              p: 2, 
              border: '2px solid #e0e0e0',
              borderRadius: 2,
              minWidth: 200,
              textAlign: 'center'
            }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, textTransform: 'capitalize' }}>
                {cat.category}
              </Typography>
              <KPIGauge 
                value={cat.average_achievement} 
                label={`${cat.total_kpis} KPIs`}
                status={cat.average_achievement >= 90 ? 'on-track' : cat.average_achievement >= 75 ? 'at-risk' : 'off-track'}
                size={140}
              />
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mt: 2, flexWrap: 'wrap' }}>
                <Chip label={`✓ ${cat.on_track}`} size="small" color="success" />
                <Chip label={`⚠ ${cat.at_risk}`} size="small" color="warning" />
                <Chip label={`✗ ${cat.off_track}`} size="small" color="error" />
              </Box>
            </Box>
          ))}
        </Box>
      </Paper>

      {/* Category Tabs */}
      <Paper sx={{ mb: 4 }}>
        <Tabs 
          value={selectedCategory} 
          onChange={(_, newValue) => setSelectedCategory(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {categories.map(cat => (
            <Tab key={cat} label={cat} value={cat} />
          ))}
        </Tabs>
      </Paper>

      {/* KPI Details by Category */}
      {selectedCategory === 'All' ? (
        Object.entries(groupedByCategory).map(([category, kpis]) => (
          <Paper key={category} sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', textTransform: 'capitalize' }}>
              {category} KPIs
            </Typography>
            <Divider sx={{ mb: 3 }} />
            {kpis.map((kpi, idx) => (
              <KPIProgressBar key={idx} kpi={kpi} />
            ))}
          </Paper>
        ))
      ) : (
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', textTransform: 'capitalize' }}>
            {selectedCategory} KPIs
          </Typography>
          <Divider sx={{ mb: 3 }} />
          {filteredKPIs.map((kpi, idx) => (
            <KPIProgressBar key={idx} kpi={kpi} />
          ))}
        </Paper>
      )}

      {/* KPI Trends */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
          📈 KPI Trends (Last 12 Months)
        </Typography>
        <Divider sx={{ mb: 3 }} />
        {Array.from(new Set(data.kpi_trends.map(t => t.kpi_id))).map(kpiId => {
          const kpiTrends = data.kpi_trends.filter(t => t.kpi_id === kpiId);
          if (kpiTrends.length === 0) return null;
          
          const kpiName = kpiTrends[0].kpi_name;
          
          return (
            <Box key={kpiId} sx={{ mb: 4 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
                {kpiName}
              </Typography>
              <KPITrendChart data={kpiTrends} kpiName={kpiName} />
            </Box>
          );
        })}
      </Paper>
    </Container>
  );
}
