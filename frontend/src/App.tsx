import { useState } from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  Collapse
} from '@mui/material';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import DashboardIcon from '@mui/icons-material/Dashboard';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import PeopleIcon from '@mui/icons-material/People';
import BuildIcon from '@mui/icons-material/Build';
import BadgeIcon from '@mui/icons-material/Badge';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import BusinessIcon from '@mui/icons-material/Business';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import ExecutiveDashboard from './pages/ExecutiveDashboard';
import SalesPerformanceDashboard from './pages/SalesPerformanceDashboard';
import InventoryDashboard from './pages/InventoryDashboard';
import FinanceDashboard from './pages/FinanceDashboard';
import CustomerDashboard from './pages/CustomerDashboard';
import MaintenanceDashboard from './pages/MaintenanceDashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import ForecastingDashboard from './pages/ForecastingDashboard';
import BudgetManagementDashboard from './pages/BudgetManagementDashboard';

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

const drawerWidth = 280;

interface NavItem {
  label: string;
  path: string;
  icon: JSX.Element;
}

interface NavSection {
  title: string;
  icon: JSX.Element;
  items: NavItem[];
}

const navigationSections: NavSection[] = [
  {
    title: 'Operations',
    icon: <BusinessIcon />,
    items: [
      { label: 'Executive Overview', path: '/', icon: <DashboardIcon /> },
      { label: 'Sales Performance', path: '/sales-performance', icon: <TrendingUpIcon /> },
      { label: 'Inventory', path: '/inventory', icon: <DirectionsCarIcon /> },
      { label: 'Customers', path: '/customers', icon: <PeopleIcon /> },
      { label: 'Employees', path: '/employees', icon: <BadgeIcon /> },
      { label: 'Maintenance', path: '/maintenance', icon: <BuildIcon /> },
    ],
  },
  {
    title: 'Finance & Analytics',
    icon: <AnalyticsIcon />,
    items: [
      { label: 'Finance & Loans', path: '/finance', icon: <AccountBalanceIcon /> },
      { label: 'Forecasting', path: '/forecasting', icon: <ShowChartIcon /> },
    ],
  },
  {
    title: 'FP&A',
    icon: <AttachMoneyIcon />,
    items: [
      { label: 'Budget Management', path: '/fpa/budget', icon: <AttachMoneyIcon /> },
    ],
  },
];

function Navigation() {
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [expandedSections, setExpandedSections] = useState<string[]>(['Operations', 'Finance & Analytics', 'FP&A']);

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };

  return (
    <>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="toggle drawer"
            onClick={toggleDrawer}
            edge="start"
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            🚗 Automotive Sales Analytics
          </Typography>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="persistent"
        anchor="left"
        open={drawerOpen}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
      >
        <Toolbar>
          <IconButton onClick={toggleDrawer}>
            <ChevronLeftIcon />
          </IconButton>
        </Toolbar>
        <Divider />

        <List sx={{ pt: 0 }}>
          {navigationSections.map((section) => (
            <Box key={section.title}>
              <ListItemButton
                onClick={() => toggleSection(section.title)}
                sx={{
                  backgroundColor: '#f5f5f5',
                  '&:hover': { backgroundColor: '#e0e0e0' },
                }}
              >
                <ListItemIcon sx={{ color: '#1976d2' }}>{section.icon}</ListItemIcon>
                <ListItemText
                  primary={section.title}
                  primaryTypographyProps={{ fontWeight: 'bold', fontSize: '0.9rem' }}
                />
                {expandedSections.includes(section.title) ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>

              <Collapse in={expandedSections.includes(section.title)} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  {section.items.map((item) => (
                    <ListItem key={item.path} disablePadding>
                      <ListItemButton
                        component={Link}
                        to={item.path}
                        selected={location.pathname === item.path}
                        sx={{
                          pl: 4,
                          '&.Mui-selected': {
                            backgroundColor: '#e3f2fd',
                            borderLeft: '4px solid #1976d2',
                            '&:hover': {
                              backgroundColor: '#bbdefb',
                            },
                          },
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 40, color: location.pathname === item.path ? '#1976d2' : 'inherit' }}>
                          {item.icon}
                        </ListItemIcon>
                        <ListItemText
                          primary={item.label}
                          primaryTypographyProps={{
                            fontSize: '0.875rem',
                            fontWeight: location.pathname === item.path ? 600 : 400,
                          }}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </Collapse>
              <Divider />
            </Box>
          ))}
        </List>
      </Drawer>
    </>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ display: 'flex' }}>
          <Navigation />
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              p: 3,
              mt: 8,
              width: '100%',
              minHeight: '100vh',
              backgroundColor: '#fafafa',
            }}
          >
            <Routes>
              <Route path="/" element={<ExecutiveDashboard />} />
              <Route path="/sales-performance" element={<SalesPerformanceDashboard />} />
              <Route path="/inventory" element={<InventoryDashboard />} />
              <Route path="/finance" element={<FinanceDashboard />} />
              <Route path="/customers" element={<CustomerDashboard />} />
              <Route path="/maintenance" element={<MaintenanceDashboard />} />
              <Route path="/employees" element={<EmployeeDashboard />} />
              <Route path="/forecasting" element={<ForecastingDashboard />} />
              <Route path="/fpa/budget" element={<BudgetManagementDashboard />} />
            </Routes>
          </Box>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;
