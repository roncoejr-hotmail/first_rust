import { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  CircularProgress,
  Alert,
  Box,
  Paper,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip
} from '@mui/material';
import { fetchScenarioPlanning } from '../api/scenario';
import type { ScenarioPlanningOverview } from '../api/scenario';
import KPICard from '../components/KPICard';
import ScenarioComparisonChart from '../components/ScenarioComparisonChart';
import CategoryScenarioChart from '../components/CategoryScenarioChart';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';

export default function ScenarioPlanningDashboard() {
  const [data, setData] = useState<ScenarioPlanningOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const scenarioData = await fetchScenarioPlanning();
      setData(scenarioData);
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

  if (!data || data.scenarios.length === 0) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Alert severity="info">No scenario data available. Please generate forecast scenarios first.</Alert>
      </Container>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getScenarioColor = (type: string) => {
    switch (type) {
      case 'best_case': return '#4caf50';
      case 'most_likely': return '#2196f3';
      case 'worst_case': return '#f44336';
      default: return '#757575';
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#1976d2' }}>
        🔮 Scenario Planning Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Fiscal Year {data.fiscal_year} - Compare Best, Most Likely, and Worst Case Scenarios
      </Typography>

      {/* Scenario Summary Cards */}
      <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
        {data.scenarios.map((scenario) => (
          <Paper key={scenario.scenario_id} sx={{ 
            p: 3, 
            minWidth: 280,
            border: `3px solid ${getScenarioColor(scenario.scenario_type)}`,
            borderRadius: 2
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Chip 
                label={scenario.scenario_name}
                sx={{ 
                  backgroundColor: getScenarioColor(scenario.scenario_type),
                  color: 'white',
                  fontWeight: 'bold'
                }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {scenario.description}
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Revenue:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  {formatCurrency(scenario.total_revenue)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Expenses:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  {formatCurrency(scenario.total_expenses)}
                </Typography>
              </Box>
              <Divider />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Net Income:</Typography>
                <Typography variant="h6" sx={{ 
                  fontWeight: 'bold',
                  color: scenario.net_income >= 0 ? '#4caf50' : '#f44336'
                }}>
                  {formatCurrency(scenario.net_income)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Profit Margin:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  {scenario.profit_margin.toFixed(1)}%
                </Typography>
              </Box>
            </Box>
          </Paper>
        ))}
      </Box>

      {/* Key Metrics Comparison */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
          📊 Key Metrics Comparison
        </Typography>
        <Divider sx={{ mb: 3 }} />
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>Metric</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', color: '#4caf50' }}>Best Case</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', color: '#2196f3' }}>Most Likely</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', color: '#f44336' }}>Worst Case</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Variance Range</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.scenario_comparison.map((comp, idx) => (
                <TableRow key={idx} hover>
                  <TableCell sx={{ fontWeight: 'bold' }}>{comp.metric}</TableCell>
                  <TableCell align="right">
                    {comp.metric.includes('%') ? `${comp.best_case.toFixed(1)}%` : formatCurrency(comp.best_case)}
                  </TableCell>
                  <TableCell align="right">
                    {comp.metric.includes('%') ? `${comp.most_likely.toFixed(1)}%` : formatCurrency(comp.most_likely)}
                  </TableCell>
                  <TableCell align="right">
                    {comp.metric.includes('%') ? `${comp.worst_case.toFixed(1)}%` : formatCurrency(comp.worst_case)}
                  </TableCell>
                  <TableCell align="right">
                    <Chip 
                      label={comp.metric.includes('%') ? `${comp.variance_best_to_worst.toFixed(1)}%` : formatCurrency(comp.variance_best_to_worst)}
                      size="small"
                      color={comp.variance_best_to_worst > 0 ? 'success' : 'default'}
                      icon={comp.variance_best_to_worst > 0 ? <TrendingUpIcon /> : <CompareArrowsIcon />}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Monthly Scenario Comparison */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
          📈 Monthly Net Income Comparison
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Compare monthly net income across all three scenarios
        </Typography>
        <ScenarioComparisonChart data={data.monthly_comparison} />
      </Paper>

      {/* Category Breakdown */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
          📋 Category Breakdown by Scenario
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Compare forecasted amounts by category across scenarios
        </Typography>
        <CategoryScenarioChart data={data.category_breakdown} />
      </Paper>

      {/* Insights */}
      <Paper sx={{ p: 3, mb: 4, backgroundColor: '#f5f5f5' }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
          💡 Key Insights
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {data.scenarios.length >= 3 && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <TrendingUpIcon sx={{ color: '#4caf50', mt: 0.5 }} />
                <Typography variant="body2">
                  <strong>Best Case Scenario:</strong> Projects net income of {formatCurrency(data.scenarios[0].net_income)} 
                  with a {data.scenarios[0].profit_margin.toFixed(1)}% profit margin.
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <CompareArrowsIcon sx={{ color: '#2196f3', mt: 0.5 }} />
                <Typography variant="body2">
                  <strong>Most Likely Scenario:</strong> Projects net income of {formatCurrency(data.scenarios[1].net_income)} 
                  with a {data.scenarios[1].profit_margin.toFixed(1)}% profit margin.
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <TrendingDownIcon sx={{ color: '#f44336', mt: 0.5 }} />
                <Typography variant="body2">
                  <strong>Worst Case Scenario:</strong> Projects net income of {formatCurrency(data.scenarios[2].net_income)} 
                  with a {data.scenarios[2].profit_margin.toFixed(1)}% profit margin.
                </Typography>
              </Box>
              <Divider />
              <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                The variance range between best and worst case scenarios is {formatCurrency(data.scenario_comparison[2]?.variance_best_to_worst || 0)}, 
                highlighting the importance of risk mitigation strategies.
              </Typography>
            </>
          )}
        </Box>
      </Paper>
    </Container>
  );
}
