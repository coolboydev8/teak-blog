import { useState } from 'react';
import { Box, Typography, Button, Stack } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import { useLoginMutation } from '../../store/apiSlice';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../../store/authSlice';
import { Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

const NeuInput = ({ label, placeholder, type = 'text', value, onChange, endAdornment }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6 }}
  >
    <Box>
      <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.25em', color: 'rgba(42,52,57,0.5)', mb: 1, ml: 1 }}>
        {label}
      </Typography>
      <Box
        sx={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          bgcolor: '#F8F8FF',
          borderRadius: '20px',
          boxShadow: 'inset 4px 4px 8px rgba(0,0,0,0.02), inset -4px -4px 8px rgba(255,255,255,0.8)',
          px: 3,
          '&:focus-within': { boxShadow: 'inset 4px 4px 8px rgba(0,0,0,0.02), inset -4px -4px 8px rgba(255,255,255,0.8), 0 0 0 2px rgba(58,168,193,0.3)' },
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
            py: 2,
            background: 'none',
            border: 'none',
            outline: 'none',
            fontSize: '0.95rem',
            fontWeight: 500,
            color: '#2A3439',
            fontFamily: 'inherit',
            '&::placeholder': { color: 'rgba(42,52,57,0.35)' },
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
      dispatch(setCredentials({ user: { username }, access: result.access, refresh: result.refresh }));
      navigate('/');
    } catch (err) {
      console.error('Failed to login:', err);
    }
  };

  return (
    <AuthLayout>
      {/* Icon */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 5 }}>
        <Box
          sx={{
            width: 80,
            height: 80,
            bgcolor: '#F8F8FF',
            borderRadius: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'inset 8px 8px 16px rgba(0,0,0,0.03), inset -8px -8px 16px rgba(255,255,255,1)',
            mb: 3,
          }}
        >
          <Box
            component="svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#3AA8C1"
            strokeWidth="1.5"
            sx={{ width: 36, height: 36, opacity: 0.8 }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </Box>
        </Box>
        <Typography variant="h5" sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 700, letterSpacing: '-0.02em', mb: 0.75 }}>
          Portal Login
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.5, textAlign: 'center', maxWidth: '28ch', lineHeight: 1.6 }}>
          Secure authentication for Nordic Trust Partners.
        </Typography>
      </Box>

      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={3} sx={{ mb: 4 }}>
          <NeuInput
            label="Partner Identity"
            placeholder="Email or Username"
            value={username}
            onChange={(e: any) => setUsername(e.target.value)}
          />
          <NeuInput
            label="Secret Key"
            placeholder="••••••••••••"
            type={showPwd ? 'text' : 'password'}
            value={password}
            onChange={(e: any) => setPassword(e.target.value)}
            endAdornment={
              <Box
                onClick={() => setShowPwd(!showPwd)}
                sx={{ cursor: 'pointer', color: 'rgba(42,52,57,0.4)', display: 'flex', '&:hover': { color: '#3AA8C1' } }}
              >
                {showPwd ? <Eye size={18} /> : <EyeOff size={18} />}
              </Box>
            }
          />
        </Stack>

        {error && (
          <Typography variant="caption" color="error" sx={{ display: 'block', mb: 2, textAlign: 'center' }}>
            Invalid credentials. Please try again.
          </Typography>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Button variant="text" sx={{ fontSize: '0.8rem', fontWeight: 700, color: 'rgba(42,52,57,0.5)', p: 0 }}>
            Trouble logging in?
          </Button>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant="text" sx={{ fontSize: '0.8rem', fontWeight: 700, color: 'rgba(42,52,57,0.5)', p: 0 }} component={RouterLink} to="/">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isLoading}
              sx={{
                px: 5,
                py: 1.5,
                borderRadius: '999px',
                bgcolor: '#3AA8C1',
                fontWeight: 700,
                fontSize: '0.875rem',
                boxShadow: '0 12px 28px rgba(58,168,193,0.3)',
                transition: 'all 0.3s',
                '&:hover': { bgcolor: '#2e8da3', transform: 'translateY(-2px)', boxShadow: '0 16px 32px rgba(58,168,193,0.35)' },
              }}
            >
              Sign In
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Footer */}
      <Box sx={{ mt: 5, pt: 4, borderTop: '1px solid #F8F8FF', textAlign: 'center' }}>
        <Typography variant="body2" sx={{ opacity: 0.55 }}>
          New to Nordic Trust?{' '}
          <Box component={RouterLink} to="/auth/register" sx={{ color: '#3AA8C1', fontWeight: 700, textDecoration: 'none', '&:hover': { color: '#2A3439' } }}>
            Request a Partner ID
          </Box>
        </Typography>
        <Stack direction="row" spacing={3} sx={{ justifyContent: 'center', mt: 2 }}>
          {['Privacy', 'Security', 'Help'].map((l) => (
            <Box key={l} component="a" href="#" sx={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(42,52,57,0.4)', textDecoration: 'none', '&:hover': { color: '#2A3439' } }}>
              {l}
            </Box>
          ))}
        </Stack>
      </Box>
    </AuthLayout>
  );
}
