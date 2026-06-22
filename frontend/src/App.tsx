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
import Subscriptions from './pages/Subscriptions';
import Library from './pages/Library';
import EditProfile from './pages/EditProfile';
import { User, LogOut } from 'lucide-react';
import { useState } from 'react';
import avatarDefault from './assets/Avatars/avatar.png';

const NavItem = ({ to, label }: { to: string; label: string }) => (
  <NavLink to={to} style={{ textDecoration: 'none' }}>
    {({ isActive }) => (
      <Typography
        sx={{
          fontSize: '11px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.25em',
          color: isActive ? '#3AA8C1' : 'rgba(42,52,57,0.5)',
          position: 'relative',
          transition: 'all 0.3s ease',
          pb: 1,
          '&:hover': { opacity: 1, color: '#2A3439' },
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: isActive ? '100%' : 0,
            height: 2,
            bgcolor: '#3AA8C1',
            transition: 'width 0.3s cubic-bezier(0.23, 1, 0.32, 1)',
          },
          '&:hover::after': { width: '100%' },
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
        id="navbar"
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          bgcolor: 'rgba(248,248,255,0.85)',
          backdropFilter: 'blur(16px)',
          px: { xs: 3, md: '10vw' }, // Matched design vast-space
          py: { xs: 1.5, md: 2 }, // Further reduced navbar padding
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 4,
          transition: 'all 0.5s ease',
          borderBottom: '1px solid rgba(42,52,57,0.02)',
        }}
      >
        {/* Logo */}
        <Box
          component={RouterLink}
          to="/"
          sx={{ display: 'flex', alignItems: 'center', gap: 3, textDecoration: 'none', flexShrink: 0 }}
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              bgcolor: '#3AA8C1',
              borderRadius: '2px', // Matched design rounded-xs
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(58,168,193,0.2)',
              flexShrink: 0,
            }}
          >
            <Typography sx={{ color: '#F8F8FF', fontFamily: '"Inter", sans-serif', fontWeight: 900, fontSize: '1.25rem' }}>T</Typography>
          </Box>
          <Typography sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 900, fontSize: '1.5rem', letterSpacing: '-0.04em', color: '#2A3439' }}>
            Nordic Trust
          </Typography>
        </Box>

        {/* Nav links */}
        <Stack direction="row" spacing={7} sx={{ display: { xs: 'none', lg: 'flex' } }}>
          <NavItem to="/" label="Insights" />
          <NavItem to="/library" label="Library" />
        </Stack>

        {/* CTA / User Profile */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
          {user ? (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Box sx={{ textAlign: 'right', display: { xs: 'none', md: 'block' } }}>
                  <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: '#2A3439' }}>
                    {user.username}
                  </Typography>
                  <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: 'rgba(42,52,57,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    {user.title || 'Senior Software Engineer'}
                  </Typography>
                </Box>
                <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                  <Avatar
                    src={user.avatar || avatarDefault}
                    sx={{
                      width: 44,
                      height: 44,
                      border: '2px solid white',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
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
                      minWidth: 220,
                      boxShadow: '0 24px 48px rgba(42,52,57,0.15)',
                      border: '1px solid rgba(42,52,57,0.05)',
                      '& .MuiMenuItem-root': {
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: 'rgba(42,52,57,0.8)',
                        px: 3,
                        py: 1.5,
                        gap: 2,
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
                to="/auth/register"
                sx={{
                  borderRadius: '999px',
                  px: 6,
                  py: 1.75,
                  bgcolor: '#3AA8C1',
                  color: 'white',
                  fontWeight: 800,
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                  boxShadow: '0 12px 24px rgba(58,168,193,0.25)',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)',
                  '&:hover': { bgcolor: '#3AA8C1', boxShadow: 'none', transform: 'translateY(1px)', color: 'white' },
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    inset: 0,
                    bgcolor: '#2A3439',
                    transform: 'translateY(100%)',
                    transition: 'transform 0.4s cubic-bezier(0.23, 1, 0.32, 1)',
                    zIndex: 0,
                  },
                  '&:hover::before': { transform: 'translateY(0)' },
                }}
              >
                <span style={{ position: 'relative', zIndex: 1 }}>Join the Circle</span>
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
      { path: 'dashboard/:slug', element: <RequireAuth><AuthorDashboard /></RequireAuth> },
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
