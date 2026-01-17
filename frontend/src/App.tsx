import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import ExecutiveDashboard from './pages/ExecutiveDashboard';

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

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ExecutiveDashboard />
    </ThemeProvider>
  );
}

export default App;
