import { useState } from 'react';
import { Box, Typography, Button, Stack } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import { useRequestPasswordResetMutation } from '../../store/apiSlice';
import { getApiErrorMessage } from '../../store/apiError';
import { KeyRound, UserCheck, Shield, Unlock, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const NeuInput = ({ label, placeholder, type = 'text', value, onChange }: any) => (
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
            '&::placeholder': { color: 'rgba(42,52,57,0.4)' },
          }}
        />
      </Box>
    </Box>
  </motion.div>
);

const ProtocolStep = ({ icon: Icon, label, active = false }: any) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, opacity: active ? 1 : 0.3 }}>
    <Box
      sx={{
        width: 32,
        height: 32,
        borderRadius: '10px',
        bgcolor: active ? 'rgba(58,168,193,0.1)' : 'rgba(42,52,57,0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: active ? '#3AA8C1' : '#2A3439',
      }}
    >
      <Icon size={16} />
    </Box>
    <Typography sx={{ fontSize: '0.5rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(42,52,57,0.6)' }}>
      {label}
    </Typography>
  </Box>
);

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [requestReset, { isLoading }] = useRequestPasswordResetMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    try {
      const result = await requestReset({ email }).unwrap();
      setIsSent(true);
      setResetUrl(result?.reset_url ?? null); // present only in dev
      toast.success('Check your email', {
        description: `If an account exists for ${email}, a reset link is on its way.`,
        icon: <CheckCircle2 size={18} color="#3AA8C1" />,
      });
    } catch (err) {
      toast.error('Could not send reset link', { description: getApiErrorMessage(err, 'Please try again.') });
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
            <KeyRound size={36} color="#3AA8C1" style={{ opacity: 0.8 }} />
          </Box>
        </motion.div>
        
        <Typography variant="h4" sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 800, letterSpacing: '-0.02em', mb: 1.5, color: '#2A3439' }}>
          Reset Password
        </Typography>
        <Typography sx={{ color: 'rgba(42,52,57,0.6)', textAlign: 'center', maxWidth: '32ch', lineHeight: 1.6, fontSize: '1rem', fontWeight: 400 }}>
          Authorized personnel recovery sequence.
        </Typography>
      </Box>

      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={4} sx={{ mb: 6 }}>
          <NeuInput
            label="Email"
            placeholder="identity@nordictrust.io"
            type="email"
            value={email}
            onChange={(e: any) => setEmail(e.target.value)}
          />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={isLoading}
              sx={{
                py: 2,
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
              }}
            >
              {isLoading ? 'Sending…' : isSent ? 'Resend Link' : 'Send Reset Link'}
            </Button>

            {isSent && (
              <Box sx={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 1.75 }}>
                {resetUrl ? (
                  <>
                    <Typography sx={{ fontSize: '0.8rem', color: 'rgba(42,52,57,0.6)', lineHeight: 1.6 }}>
                      Email delivery isn’t configured in this environment, so use your secure link to continue:
                    </Typography>
                    <Button
                      component={RouterLink}
                      to={resetUrl.replace(/^https?:\/\/[^/]+/, '')}
                      variant="outlined"
                      fullWidth
                      sx={{ borderRadius: '999px', py: 1.4, borderColor: '#3AA8C1', color: '#3AA8C1', fontWeight: 800, textTransform: 'none', '&:hover': { bgcolor: 'rgba(58,168,193,0.08)', borderColor: '#3AA8C1' } }}
                    >
                      Reset your password →
                    </Button>
                  </>
                ) : (
                  <Typography sx={{ fontSize: '0.8rem', color: 'rgba(42,52,57,0.6)' }}>
                    Check your inbox for a link to set a new password.
                  </Typography>
                )}
              </Box>
            )}

            <Button
              component={RouterLink}
              to="/auth/login"
              variant="text"
              sx={{ fontSize: '0.85rem', fontWeight: 700, color: 'rgba(42,52,57,0.5)', py: 1, '&:hover': { color: '#2A3439', bgcolor: 'transparent' } }}
            >
              Return to Portal Login
            </Button>
          </Box>
        </Stack>

        {/* Next Steps Protocol */}
        <Box sx={{ pt: 5, borderTop: '1px solid rgba(42,52,57,0.05)' }}>
          <Typography sx={{ fontSize: '0.625rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(42,52,57,0.4)', textAlign: 'center', mb: 4 }}>
            Next Steps Protocol
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1 }}>
            <ProtocolStep icon={UserCheck} label="Verify" active={true} />
            <Box sx={{ height: '1px', flex: 1, bgcolor: 'rgba(0,0,0,0.03)', mx: 2, mb: 4 }} />
            <ProtocolStep icon={Shield} label="Handshake" active={isSent} />
            <Box sx={{ height: '1px', flex: 1, bgcolor: 'rgba(0,0,0,0.03)', mx: 2, mb: 4 }} />
            <ProtocolStep icon={Unlock} label="Restored" active={false} />
          </Box>
        </Box>
      </Box>
    </AuthLayout>
  );
}
