import { Provider, useSelector, useDispatch } from 'react-redux';
import { createBrowserRouter, RouterProvider, Outlet, Link as RouterLink, NavLink, useNavigate, Navigate } from 'react-router-dom';
import { store } from './store';
import type { RootState } from './store';
import { Box, Typography, Button, Stack, Avatar, Menu, MenuItem, IconButton } from '@mui/material';
import { Toaster, toast } from 'sonner';
import { logOut } from './store/authSlice';
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import ForgotPassword from './features/auth/ForgotPassword';
import ResetPassword from './features/auth/ResetPassword';
import HomeFeed from './pages/HomeFeed';
import PostDetail from './pages/PostDetail';
import AuthorDashboard from './pages/AuthorDashboard';
import PostEditor from './pages/PostEditor';
import Management from './pages/Management';
import Subscriptions from './pages/Subscriptions';
import Library from './pages/Library';
import EditProfile from './pages/EditProfile';
import { User, LogOut, Settings as SettingsIcon } from 'lucide-react';
import { useState } from 'react';

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

const Layout = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    dispatch(logOut());
    toast.success('Successfully signed out');
    navigate('/auth/login');
    handleCloseUserMenu();
  };

  return (
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
          height: 80,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 4,
        }}
      >
        {/* Logo */}
        <Box
          component={RouterLink}
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
          {user && (
            <>
              <NavItem to="/library" label="Library" />
              <NavItem to="/dashboard" label="Authoring" />
              <NavItem to="/management" label="Moderation" />
              <NavItem to="/subscriptions" label="Settings" />
            </>
          )}
        </Stack>

        {/* CTA / User Profile */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
          {user ? (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ textAlign: 'right', display: { xs: 'none', md: 'block' } }}>
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#2A3439' }}>
                    {user.username}
                  </Typography>
                  <Typography sx={{ fontSize: '0.6rem', fontWeight: 500, color: 'rgba(42,52,57,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    {user.title || 'Partner'}
                  </Typography>
                </Box>
                <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                  <Avatar
                    src={user.avatar || `https://i.pravatar.cc/100?u=${user.username}`}
                    sx={{
                      width: 40,
                      height: 40,
                      border: '2px solid white',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      transition: 'transform 0.2s',
                      '&:hover': { transform: 'scale(1.05)' },
                    }}
                  />
                </IconButton>
              </Box>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleCloseUserMenu}
                onClick={handleCloseUserMenu}
                slotProps={{
                  paper: {
                    sx: {
                      mt: 1.5,
                      borderRadius: '16px',
                      minWidth: 200,
                      boxShadow: '0 12px 32px rgba(42,52,57,0.12)',
                      border: '1px solid rgba(42,52,57,0.05)',
                      '& .MuiMenuItem-root': {
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: 'rgba(42,52,57,0.7)',
                        px: 2,
                        py: 1.2,
                        gap: 1.5,
                        '&:hover': { bgcolor: '#F8F8FF', color: '#3AA8C1' },
                      },
                    },
                  },
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              >
                <MenuItem component={RouterLink} to="/settings/profile">
                  <User size={18} /> Edit Profile
                </MenuItem>
                <MenuItem component={RouterLink} to="/subscriptions">
                  <SettingsIcon size={18} /> Settings
                </MenuItem>
                <Box sx={{ my: 1, borderTop: '1px solid rgba(42,52,57,0.05)' }} />
                <MenuItem onClick={handleLogout} sx={{ color: '#f43f5e !important' }}>
                  <LogOut size={18} /> Sign Out
                </MenuItem>
              </Menu>
            </>
          ) : (
            <>
              <Button
                component={RouterLink}
                to="/auth/login"
                variant="text"
                sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(42,52,57,0.45)', textTransform: 'uppercase', letterSpacing: '0.2em', display: { xs: 'none', md: 'inline-flex' }, '&:hover': { color: '#2A3439' } }}
              >
                Log In
              </Button>
              <Button
                component={RouterLink}
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
            </>
          )}
        </Box>
      </Box>

      <Box component="main" sx={{ flexGrow: 1 }}>
        <Outlet />
      </Box>
    </Box>
  );
};

const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const token = useSelector((s: RootState) => s.auth.token);
  if (!token) return <Navigate to="/auth/login" replace />;
  return <>{children}</>;
};

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      // Public
      { index: true, element: <HomeFeed /> },
      { path: 'posts/:slug', element: <PostDetail /> },
      // Authenticated only
      { path: 'library', element: <RequireAuth><Library /></RequireAuth> },
      { path: 'dashboard', element: <RequireAuth><AuthorDashboard /></RequireAuth> },
      { path: 'management', element: <RequireAuth><Management /></RequireAuth> },
      { path: 'subscriptions', element: <RequireAuth><Subscriptions /></RequireAuth> },
      { path: 'settings/profile', element: <RequireAuth><EditProfile /></RequireAuth> },
    ],
  },
  { path: 'editor', element: <RequireAuth><PostEditor /></RequireAuth> },
  { path: 'editor/:slug', element: <RequireAuth><PostEditor /></RequireAuth> },
  { path: 'auth/login', element: <LoginPage /> },
  { path: 'auth/register', element: <RegisterPage /> },
  { path: 'auth/forgot-password', element: <ForgotPassword /> },
  { path: 'auth/reset-password', element: <ResetPassword /> },
]);

function App() {
  return (
    <Provider store={store}>
      <Toaster position="top-right" richColors expand={true} closeButton />
      <RouterProvider router={router} />
    </Provider>
  );
}

export default App;
