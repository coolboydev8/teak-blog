import { useState, useEffect } from 'react';
import { Box, Typography, Stack, Avatar, Button, TextField, IconButton, Paper, Divider } from '@mui/material';
import { useGetMeQuery, useUpdateProfileMutation } from '../store/apiSlice';
import { motion } from 'framer-motion';
import { Camera, Mail, User, Shield, Key, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function EditProfile() {
  const { data: me, isLoading } = useGetMeQuery({});
  const [updateProfile, { isLoading: isUpdating }] = useUpdateProfileMutation();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    title: '',
    domain: '',
    avatar: '',
  });

  useEffect(() => {
    if (me) {
      setFormData({
        username: me.username || '',
        email: me.email || '',
        title: me.title || '',
        domain: me.domain || '',
        avatar: me.avatar || '',
      });
    }
  }, [me]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile(formData).unwrap();
      toast.success('Profile updated successfully', {
        description: 'Your administrative records have been synchronized.',
        icon: <CheckCircle2 size={18} color="#3AA8C1" />,
      });
    } catch (err) {
      toast.error('Failed to update profile', {
        description: 'A technical error occurred during synchronization.',
      });
    }
  };

  if (isLoading) return (
    <Box sx={{ bgcolor: '#F8F8FF', minHeight: 'calc(100vh - 80px)', py: 8 }}>
      <Box sx={{ maxWidth: 800, mx: 'auto', px: 3 }}>
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: '24px', mb: 4 }} />
        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: '24px' }} />
      </Box>
    </Box>
  );

  return (
    <Box component={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} sx={{ bgcolor: '#F8F8FF', minHeight: 'calc(100vh - 80px)', py: { xs: 4, md: 8 } }}>
      <Box sx={{ maxWidth: 800, mx: 'auto', px: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 6, display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate(-1)} sx={{ bgcolor: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <ArrowLeft size={20} />
          </IconButton>
          <Box>
            <Typography variant="h4" sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 900, letterSpacing: '-0.04em' }}>
              Profile Management
            </Typography>
            <Typography sx={{ fontSize: '0.875rem', opacity: 0.45 }}>
              Security-cleared administrative adjustments for your Partner Identity.
            </Typography>
          </Box>
        </Box>

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '300px 1fr' }, gap: 4 }}>
          {/* Left: Avatar & Identity */}
          <Stack spacing={3}>
            <Paper sx={{ p: 4, borderRadius: '24px', textAlign: 'center', border: '1px solid rgba(42,52,57,0.05)', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
              <Box sx={{ position: 'relative', display: 'inline-block', mb: 3 }}>
                <Avatar
                  src={formData.avatar || `https://pravatar.cc/150?u=${formData.username}`}
                  sx={{ width: 120, height: 120, border: '6px solid #F8F8FF', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
                />
                <IconButton
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    bgcolor: '#3AA8C1',
                    color: 'white',
                    boxShadow: '0 4px 12px rgba(58,168,193,0.3)',
                    '&:hover': { bgcolor: '#2A3439' },
                  }}
                >
                  <Camera size={18} />
                </IconButton>
              </Box>
              <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', mb: 0.5 }}>{formData.username}</Typography>
              <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#3AA8C1' }}>
                {formData.title || 'Institutional Partner'}
              </Typography>
            </Paper>

            <Paper sx={{ p: 3, borderRadius: '20px', border: '1px solid rgba(42,52,57,0.05)', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
              <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(42,52,57,0.4)', mb: 2 }}>
                Security Tier
              </Typography>
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Shield size={16} color="#3AA8C1" />
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>L4 - High Trust</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Key size={16} color="#3AA8C1" />
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>Multi-factor Active</Typography>
                </Box>
              </Stack>
            </Paper>
          </Stack>

          {/* Right: Form Fields */}
          <Paper sx={{ p: { xs: 3, md: 5 }, borderRadius: '24px', border: '1px solid rgba(42,52,57,0.05)', boxShadow: '0 4px 24px rgba(0,0,0,0.03)' }}>
            <Stack spacing={4}>
              <Box>
                <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.25em', color: 'rgba(42,52,57,0.5)', mb: 2 }}>
                  Official Identity
                </Typography>
                <Stack spacing={3}>
                  <TextField
                    fullWidth
                    label="Username"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    variant="standard"
                    slotProps={{ input: { startAdornment: <User size={18} style={{ marginRight: 12, opacity: 0.3 }} /> } }}
                  />
                  <TextField
                    fullWidth
                    label="Email Address"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    variant="standard"
                    slotProps={{ input: { startAdornment: <Mail size={18} style={{ marginRight: 12, opacity: 0.3 }} /> } }}
                  />
                </Stack>
              </Box>

              <Divider sx={{ opacity: 0.05 }} />

              <Box>
                <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.25em', color: 'rgba(42,52,57,0.5)', mb: 2 }}>
                  Professional Context
                </Typography>
                <Stack spacing={3}>
                  <TextField
                    fullWidth
                    label="Title / Position"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="e.g. Systems Principal"
                    variant="standard"
                  />
                  <TextField
                    fullWidth
                    label="Technical Domain"
                    name="domain"
                    value={formData.domain}
                    onChange={handleChange}
                    placeholder="e.g. Distributed Infrastructure"
                    variant="standard"
                  />
                </Stack>
              </Box>

              <Box sx={{ pt: 2, display: 'flex', gap: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isUpdating}
                  sx={{
                    px: 6,
                    py: 1.5,
                    borderRadius: '999px',
                    bgcolor: '#3AA8C1',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.15em',
                    boxShadow: '0 8px 24px rgba(58,168,193,0.3)',
                    '&:hover': { bgcolor: '#2A3439' },
                  }}
                >
                  {isUpdating ? 'Synchronizing...' : 'Save Changes'}
                </Button>
                <Button
                  variant="text"
                  sx={{ px: 4, borderRadius: '999px', fontWeight: 700, color: 'rgba(42,52,57,0.4)', textTransform: 'uppercase', letterSpacing: '0.15em' }}
                >
                  Reset
                </Button>
              </Box>
            </Stack>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}
