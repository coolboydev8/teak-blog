import { Provider } from 'react-redux';
import { createBrowserRouter, RouterProvider, Outlet, Link, NavLink } from 'react-router-dom';
import { store } from './store';
import { Box, Typography, Button, Stack } from '@mui/material';
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import HomeFeed from './pages/HomeFeed';
import PostDetail from './pages/PostDetail';
import AuthorDashboard from './pages/AuthorDashboard';
import PostEditor from './pages/PostEditor';
import Management from './pages/Management';
import Subscriptions from './pages/Subscriptions';

const NavItem = ({ to, label }: { to: string; label: string }) => (
  <NavLink to={to} style={{ textDecoration: 'none' }}>
    {({ isActive }) => (
      <Typography
        sx={{
          fontSize: '0.7rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.25em',
          color: isActive ? '#3AA8C1' : 'rgba(42,52,57,0.45)',
          position: 'relative',
          transition: 'color 0.2s',
          pb: 0.5,
          '&:hover': { color: '#2A3439' },
          ...(isActive ? { borderBottom: '2px solid #3AA8C1' } : {}),
        }}
      >
        {label}
      </Typography>
    )}
  </NavLink>
);

const Layout = () => (
  <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
    {/* Navbar */}
    <Box
      component="nav"
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        bgcolor: 'rgba(248,248,255,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(42,52,57,0.05)',
        px: { xs: 3, md: '5vw' },
        py: 2.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 4,
      }}
    >
      {/* Logo */}
      <Box
        component={Link}
        to="/"
        sx={{ display: 'flex', alignItems: 'center', gap: 1.5, textDecoration: 'none', flexShrink: 0 }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            bgcolor: '#3AA8C1',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(58,168,193,0.25)',
            flexShrink: 0,
          }}
        >
          <Typography sx={{ color: 'white', fontFamily: '"Inter", sans-serif', fontWeight: 900, fontSize: '1rem' }}>T</Typography>
        </Box>
        <Typography sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.04em', color: '#2A3439' }}>
          Nordic Trust
        </Typography>
      </Box>

      {/* Nav links */}
      <Stack direction="row" spacing={5} sx={{ display: { xs: 'none', lg: 'flex' } }}>
        <NavItem to="/" label="Insights" />
        <NavItem to="/dashboard" label="Authoring" />
        <NavItem to="/management" label="Moderation" />
        <NavItem to="/subscriptions" label="Settings" />
      </Stack>

      {/* CTA */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
        <Button
          component={Link}
          to="/auth/login"
          variant="text"
          sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(42,52,57,0.4)', textTransform: 'uppercase', letterSpacing: '0.2em', display: { xs: 'none', md: 'inline-flex' } }}
        >
          Log In
        </Button>
        <Button
          component={Link}
          to="/auth/register"
          variant="contained"
          sx={{
            borderRadius: '999px',
            px: 3.5,
            py: 1.2,
            bgcolor: '#3AA8C1',
            fontWeight: 700,
            fontSize: '0.7rem',
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            boxShadow: '0 8px 20px rgba(58,168,193,0.25)',
            position: 'relative',
            overflow: 'hidden',
            '&::after': { content: '""', position: 'absolute', inset: 0, bgcolor: '#2A3439', opacity: 0, transition: 'opacity 0.3s' },
            '&:hover::after': { opacity: 1 },
            '& span': { position: 'relative', zIndex: 1 },
          }}
        >
          <span>Join the Circle</span>
        </Button>
      </Box>
    </Box>

    <Box component="main" sx={{ flexGrow: 1 }}>
      <Outlet />
    </Box>
  </Box>
);

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomeFeed /> },
      { path: 'posts/:slug', element: <PostDetail /> },
      { path: 'dashboard', element: <AuthorDashboard /> },
      { path: 'management', element: <Management /> },
      { path: 'subscriptions', element: <Subscriptions /> },
    ],
  },
  { path: 'editor', element: <PostEditor /> },
  { path: 'editor/:slug', element: <PostEditor /> },
  { path: 'auth/login', element: <LoginPage /> },
  { path: 'auth/register', element: <RegisterPage /> },
]);

function App() {
  return (
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  );
}

export default App;
