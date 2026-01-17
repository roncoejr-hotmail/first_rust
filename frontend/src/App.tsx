import { ThemeProvider, createTheme, CssBaseline, AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/Dashboard';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import ExecutiveDashboard from './pages/ExecutiveDashboard';
import SalesPerformanceDashboard from './pages/SalesPerformanceDashboard';
import InventoryDashboard from './pages/InventoryDashboard';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

function Navigation() {
  const location = useLocation();

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Automotive Sales Analytics
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            color="inherit"
            component={Link}
            to="/"
            startIcon={<DashboardIcon />}
            sx={{
              backgroundColor: location.pathname === '/' ? 'rgba(255,255,255,0.2)' : 'transparent',
            }}
          >
            Executive
          </Button>
          <Button
            color="inherit"
            component={Link}
            to="/sales-performance"
            startIcon={<TrendingUpIcon />}
            sx={{
              backgroundColor: location.pathname === '/sales-performance' ? 'rgba(255,255,255,0.2)' : 'transparent',
            }}
          >
            Sales Performance
          </Button>
          <Button
            color="inherit"
            component={Link}
            to="/inventory"
            startIcon={<DirectionsCarIcon />}
            sx={{
              backgroundColor: location.pathname === '/inventory' ? 'rgba(255,255,255,0.2)' : 'transparent',
            }}
          >
            Inventory
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Navigation />
        <Routes>
          <Route path="/" element={<ExecutiveDashboard />} />
          <Route path="/sales-performance" element={<SalesPerformanceDashboard />} />
          <Route path="/inventory" element={<InventoryDashboard />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
