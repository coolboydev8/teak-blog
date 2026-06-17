import { createTheme } from '@mui/material/styles';

const nordicTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#3AA8C1',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#2A3439',
    },
    background: {
      default: '#F8F8FF',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#2A3439',
      secondary: '#64748B',
    },
  },
  typography: {
    fontFamily: '"DM Sans", "Inter", system-ui, sans-serif',
    h1: { fontFamily: '"Inter", sans-serif', fontWeight: 700 },
    h2: { fontFamily: '"Inter", sans-serif', fontWeight: 700 },
    h3: { fontFamily: '"Inter", sans-serif', fontWeight: 700 },
    h4: { fontFamily: '"Inter", sans-serif', fontWeight: 700 },
    h5: { fontFamily: '"Inter", sans-serif', fontWeight: 700 },
    h6: { fontFamily: '"Inter", sans-serif', fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 9999,
          padding: '8px 24px',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 24,
        },
      },
    },
  },
});

export default nordicTheme;
