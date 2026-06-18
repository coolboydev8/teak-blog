import { useState } from 'react';
import { Box, Typography, Button, Stack } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import { useLoginMutation } from '../../store/apiSlice';
import { getApiErrorMessage } from '../../store/apiError';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../../store/authSlice';
import { Eye, EyeOff, CheckCircle2, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const NeuInput = ({ label, placeholder, type = 'text', value, onChange, endAdornment }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6 }}
  >
    <Box>
      <Typography sx={{ fontSize: '0.625rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.25em', color: 'rgba(42,52,57,0.6)', mb: 1.25, ml: 2 }}>
        {label}
      </Typography>
      <Box
        sx={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          bgcolor: '#F8F8FF',
          borderRadius: '24px',
          boxShadow: 'inset 4px 4px 8px rgba(0,0,0,0.02), inset -4px -4px 8px rgba(255,255,255,0.8)',
          px: 3.5,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:focus-within': { 
            boxShadow: 'inset 4px 4px 8px rgba(0,0,0,0.02), inset -4px -4px 8px rgba(255,255,255,0.8), 0 0 0 2px rgba(58,168,193,0.3)',
            bgcolor: '#ffffff' 
          },
        }}
      >
        <Box
          component="input"
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          sx={{
            flex: 1,
            py: 2.25,
            background: 'none',
            border: 'none',
            outline: 'none',
            fontSize: '1rem',
            fontWeight: 500,
            color: '#2A3439',
            fontFamily: 'inherit',
            '&::placeholder': { color: 'rgba(42,52,57,0.5)' },
          }}
        />
        {endAdornment}
      </Box>
    </Box>
  </motion.div>
);

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [login, { isLoading, error }] = useLoginMutation();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await login({ username, password }).unwrap();
      dispatch(setCredentials({ user: result.user, access: result.access, refresh: result.refresh }));
      toast.success('Access Granted', {
        description: `Welcome back, ${result.user.username}. Secure session established.`,
        icon: <CheckCircle2 size={18} color="#3AA8C1" />,
      });
      navigate('/');
    } catch (err) {
      console.error('Failed to login:', err);
    }
  };

  return (
    <AuthLayout>
      {/* Icon & Header */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 6 }}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "backOut" }}
        >
          <Box
            sx={{
              width: 80,
              height: 80,
              bgcolor: '#F8F8FF',
              borderRadius: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'inset 8px 8px 16px rgba(0,0,0,0.03), inset -8px -8px 16px rgba(255,255,255,1)',
              mb: 4,
            }}
          >
            <Shield size={36} color="#3AA8C1" style={{ opacity: 0.8 }} />
          </Box>
        </motion.div>
        
        <Typography variant="h4" sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 800, letterSpacing: '-0.02em', mb: 1.5, color: '#2A3439' }}>
          Portal Login
        </Typography>
        <Typography sx={{ color: 'rgba(42,52,57,0.6)', textAlign: 'center', maxWidth: '32ch', lineHeight: 1.6, fontSize: '1rem', fontWeight: 400 }}>
          Secure authentication for Nordic Trust Partners.
        </Typography>
      </Box>

      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={3} sx={{ mb: 5 }}>
          <NeuInput
            label="Partner Identity"
            placeholder="Email or Username"
            value={username}
            onChange={(e: any) => setUsername(e.target.value)}
          />
          <NeuInput
            label="Password"
            placeholder="••••••••••••"
            type={showPwd ? 'text' : 'password'}
            value={password}
            onChange={(e: any) => setPassword(e.target.value)}
            endAdornment={
              <Box
                onClick={() => setShowPwd(!showPwd)}
                sx={{ cursor: 'pointer', color: 'rgba(42,52,57,0.5)', display: 'flex', transition: 'color 0.2s', '&:hover': { color: '#3AA8C1' } }}
              >
                {showPwd ? <Eye size={20} /> : <EyeOff size={20} />}
              </Box>
            }
          />
        </Stack>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <Typography variant="caption" color="error" sx={{ display: 'block', mb: 3, textAlign: 'center', fontWeight: 600, letterSpacing: '0.01em' }}>
                {getApiErrorMessage(error, 'Invalid credentials. Please try again.')}
              </Typography>
            </motion.div>
          )}
        </AnimatePresence>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 1 }}>
          <Button 
            component={RouterLink}
            to="/auth/forgot-password"
            variant="text" 
            sx={{ fontSize: '0.85rem', fontWeight: 700, color: 'rgba(42,52,57,0.6)', p: 0, '&:hover': { color: '#3AA8C1', bgcolor: 'transparent' } }}
          >
            Forget password?
          </Button>
          <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
            <Button 
              variant="text" 
              sx={{ fontSize: '0.85rem', fontWeight: 700, color: 'rgba(42,52,57,0.6)', p: 0, '&:hover': { color: '#2A3439', bgcolor: 'transparent' } }} 
              component={RouterLink} 
              to="/"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isLoading}
              sx={{
                px: 6,
                py: 1.75,
                borderRadius: '999px',
                bgcolor: '#3AA8C1',
                color: 'white',
                fontWeight: 800,
                fontSize: '0.875rem',
                textTransform: 'none',
                boxShadow: '0 12px 28px rgba(58,168,193,0.3)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': { bgcolor: '#2e8da3', transform: 'translateY(-2px)', boxShadow: '0 16px 32px rgba(58,168,193,0.35)' },
                '&:active': { transform: 'translateY(0) scale(0.98)' },
                minWidth: 140,
              }}
            >
              {isLoading ? 'Verifying...' : 'Sign In'}
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Footer */}
      <Box sx={{ mt: 8, pt: 6, borderTop: '1px solid #F8F8FF', textAlign: 'center' }}>
        <Typography sx={{ fontSize: '0.9rem', color: 'rgba(42,52,57,0.6)', fontWeight: 500 }}>
          New to Nordic Trust?{' '}
          <Box component={RouterLink} to="/auth/register" sx={{ color: '#3AA8C1', fontWeight: 700, textDecoration: 'none', '&:hover': { color: '#2A3439' }, transition: 'color 0.2s' }}>
            Request a Partner ID
          </Box>
        </Typography>
        <Stack direction="row" spacing={4} sx={{ justifyContent: 'center', mt: 3 }}>
          {['Privacy', 'Security', 'Help'].map((l) => (
            <Box key={l} component="a" href="#" sx={{ fontSize: '0.625rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.25em', color: 'rgba(42,52,57,0.4)', textDecoration: 'none', transition: 'color 0.2s', '&:hover': { color: '#2A3439' } }}>
              {l}
            </Box>
          ))}
        </Stack>
      </Box>
    </AuthLayout>
  );
}
