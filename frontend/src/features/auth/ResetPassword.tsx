import { useState } from 'react';
import { Box, Typography, Button, Stack } from '@mui/material';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import { useConfirmPasswordResetMutation } from '../../store/apiSlice';
import { getApiErrorMessage } from '../../store/apiError';
import { KeyRound, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const NeuInput = ({ label, placeholder, type = 'text', value, onChange, endAdornment }: any) => (
  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
    <Box>
      <Typography sx={{ fontSize: '0.625rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.25em', color: 'rgba(42,52,57,0.6)', mb: 1.25, ml: 2 }}>
        {label}
      </Typography>
      <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', bgcolor: '#F8F8FF', borderRadius: '24px', boxShadow: 'inset 4px 4px 8px rgba(0,0,0,0.02), inset -4px -4px 8px rgba(255,255,255,0.8)', px: 3.5, '&:focus-within': { boxShadow: 'inset 4px 4px 8px rgba(0,0,0,0.02), inset -4px -4px 8px rgba(255,255,255,0.8), 0 0 0 2px rgba(58,168,193,0.3)', bgcolor: '#ffffff' } }}>
        <Box component="input" type={type} placeholder={placeholder} value={value} onChange={onChange} sx={{ flex: 1, py: 2.25, background: 'none', border: 'none', outline: 'none', fontSize: '1rem', fontWeight: 500, color: '#2A3439', fontFamily: 'inherit', '&::placeholder': { color: 'rgba(42,52,57,0.4)' } }} />
        {endAdornment}
      </Box>
    </Box>
  </motion.div>
);

export default function ResetPassword() {
  const [params] = useSearchParams();
  const uid = params.get('uid') || '';
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [confirmReset, { isLoading }] = useConfirmPasswordResetMutation();

  const linkValid = Boolean(uid && token);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    try {
      await confirmReset({ uid, token, new_password: password }).unwrap();
      toast.success('Password updated', {
        description: 'You can now sign in with your new password.',
        icon: <CheckCircle2 size={18} color="#3AA8C1" />,
      });
      navigate('/auth/login');
    } catch (err) {
      toast.error('Could not reset password', { description: getApiErrorMessage(err, 'Your reset link may have expired.') });
    }
  };

  return (
    <AuthLayout>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 6 }}>
        <Box sx={{ width: 80, height: 80, bgcolor: '#F8F8FF', borderRadius: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 8px 8px 16px rgba(0,0,0,0.03), inset -8px -8px 16px rgba(255,255,255,1)', mb: 4 }}>
          <KeyRound size={36} color="#3AA8C1" style={{ opacity: 0.8 }} />
        </Box>
        <Typography variant="h4" sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 800, letterSpacing: '-0.02em', mb: 1.5, color: '#2A3439' }}>
          Set New Password
        </Typography>
        <Typography sx={{ color: 'rgba(42,52,57,0.6)', textAlign: 'center', maxWidth: '32ch', lineHeight: 1.6 }}>
          Choose a strong new secret key for your account.
        </Typography>
      </Box>

      {linkValid ? (
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={4} sx={{ mb: 5 }}>
            <NeuInput
              label="New Secret Key"
              placeholder="••••••••••••"
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={(e: any) => setPassword(e.target.value)}
              endAdornment={
                <Box onClick={() => setShowPwd(!showPwd)} sx={{ cursor: 'pointer', color: 'rgba(42,52,57,0.4)', display: 'flex', '&:hover': { color: '#3AA8C1' } }}>
                  {showPwd ? <Eye size={18} /> : <EyeOff size={18} />}
                </Box>
              }
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={isLoading}
              sx={{ py: 2, borderRadius: '999px', bgcolor: '#3AA8C1', color: 'white', fontWeight: 800, fontSize: '0.875rem', textTransform: 'none', boxShadow: '0 12px 28px rgba(58,168,193,0.3)', '&:hover': { bgcolor: '#2e8da3', transform: 'translateY(-2px)' } }}
            >
              {isLoading ? 'Updating…' : 'Reset Password'}
            </Button>
          </Stack>
        </Box>
      ) : (
        <Typography sx={{ textAlign: 'center', color: 'rgba(42,52,57,0.6)', mb: 4 }}>
          This reset link is invalid or incomplete.{' '}
          <Box component={RouterLink} to="/auth/forgot-password" sx={{ color: '#3AA8C1', fontWeight: 700, textDecoration: 'none' }}>
            Request a new one
          </Box>
          .
        </Typography>
      )}

      <Box sx={{ textAlign: 'center' }}>
        <Box component={RouterLink} to="/auth/login" sx={{ fontSize: '0.85rem', fontWeight: 700, color: 'rgba(42,52,57,0.5)', textDecoration: 'none', '&:hover': { color: '#2A3439' } }}>
          Return to Portal Login
        </Box>
      </Box>
    </AuthLayout>
  );
}
