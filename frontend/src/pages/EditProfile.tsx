import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Skeleton,
  Stack,
} from '@mui/material';
import { LeftSidebar } from '../components/LeftSidebar';
import { useGetMeQuery, useUpdateProfileMutation } from '../store/apiSlice';
import { setUser } from '../store/authSlice';
import { getApiErrorMessage } from '../store/apiError';
import { useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Upload, ShieldCheck, UserCog, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

// ─── Avatar asset imports ─────────────────────────────────────────────────────
import avatarDefault from '../assets/Avatars/avatar.png';
import man1 from '../assets/Avatars/man - 1.png';
import man2 from '../assets/Avatars/man - 2.png';
import man3 from '../assets/Avatars/man - 3.png';
import man4 from '../assets/Avatars/man - 4.png';
import woman1 from '../assets/Avatars/woman - 1.png';
import woman2 from '../assets/Avatars/woman - 2.png';
import woman3 from '../assets/Avatars/woman - 3.png';

// ─── Design tokens ────────────────────────────────────────────────────────────
const NT_BG = '#F8F8FF';
const NT_TEXT = '#2A3439';
const NT_ACCENT = '#3AA8C1';
const NT_BORDER = 'rgba(42,52,57,0.06)';

// ─── Avatar options ───────────────────────────────────────────────────────────
const AVATAR_OPTIONS = [man1, man2, man3, man4, woman1, woman2, woman3];

// ─── Section Card ─────────────────────────────────────────────────────────────
const SectionCard = ({ children, sx = {} }: { children: React.ReactNode; sx?: object }) => (
  <Box
    sx={{
      bgcolor: 'white',
      border: `1px solid ${NT_BORDER}`,
      borderRadius: '16px',
      p: { xs: 4, md: 5 },
      ...sx,
    }}
  >
    {children}
  </Box>
);

const SectionHeading = ({ icon: Icon, title }: { icon: React.ElementType; title: string }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 5, pb: 3, borderBottom: `1px solid ${NT_BORDER}` }}>
    <Icon size={22} color={NT_ACCENT} />
    <Typography sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 700, fontSize: '1.1rem', color: NT_TEXT }}>
      {title}
    </Typography>
  </Box>
);

// ─── Input Field ──────────────────────────────────────────────────────────────
const FieldInput = ({
  label,
  name,
  value,
  onChange,
  placeholder = '',
  type = 'text',
  helper = '',
  icon: Icon,
  endAdornment,
  maxLength,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  helper?: string;
  icon?: React.ElementType;
  endAdornment?: React.ReactNode;
  maxLength?: number;
}) => (
  <Box>
    <Typography
      sx={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(42,52,57,0.8)', mb: 1.5, ml: 0.5 }}
    >
      {label}
    </Typography>
    <Box sx={{ position: 'relative' }}>
      {Icon && (
        <Box
          sx={{
            position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
            color: 'rgba(42,52,57,0.4)', display: 'flex', pointerEvents: 'none', zIndex: 1,
          }}
        >
          <Icon size={18} />
        </Box>
      )}
      <Box
        component="input"
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        {...(maxLength ? { maxLength } : {})}
        sx={{
          width: '100%',
          bgcolor: 'white',
          border: `1px solid ${NT_BORDER}`,
          borderRadius: '12px',
          px: 2,
          py: 1.75,
          pl: Icon ? 6 : 2,
          pr: endAdornment ? 6 : 2,
          fontSize: '0.9375rem',
          fontWeight: 500,
          color: NT_TEXT,
          fontFamily: 'inherit',
          outline: 'none',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          '&:focus': {
            borderColor: NT_ACCENT,
            boxShadow: `0 0 0 4px rgba(58,168,193,0.08)`,
          },
        }}
      />
      {endAdornment && (
        <Box sx={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', zIndex: 1 }}>
          {endAdornment}
        </Box>
      )}
    </Box>
    {helper && (
      <Typography sx={{ fontSize: '0.72rem', color: 'rgba(42,52,57,0.55)', ml: 0.5, mt: 1, lineHeight: 1.5 }}>
        {helper}
      </Typography>
    )}
  </Box>
);

// ─── Avatar helpers ───────────────────────────────────────────────────────────
// Avatars are persisted to the backend as self-contained, downscaled data URLs.
// This keeps them small (so they don't bloat author payloads) and portable —
// unlike a bundled asset path, a data URL never 404s after a new frontend build.
const AVATAR_MAX_PX = 256;

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => resolve(ev.target?.result as string);
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.readAsDataURL(file);
  });

const toDownscaledDataUrl = (src: string, max = AVATAR_MAX_PX): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas not supported.'));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => reject(new Error('Could not load image.'));
    img.src = src;
  });

// ─── EditProfile Page ─────────────────────────────────────────────────────────
export default function EditProfile() {
  const { data: me, isLoading } = useGetMeQuery({});
  const [updateProfile, { isLoading: isUpdating }] = useUpdateProfileMutation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [identity, setIdentity] = useState({ username: '', title: '' });
  // `selectedAvatar` is the data URL we'll persist; `selectedPersonaSrc` tracks
  // which persona tile is highlighted; `avatarChanged` gates whether we send it.
  const [selectedAvatar, setSelectedAvatar] = useState<string>('');
  const [previewAvatar, setPreviewAvatar] = useState<string>(avatarDefault);
  const [selectedPersonaSrc, setSelectedPersonaSrc] = useState<string>('');
  const [avatarChanged, setAvatarChanged] = useState(false);

  const [security, setSecurity] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  useEffect(() => {
    if (me) {
      setIdentity({ username: me.username || '', title: me.title || '' });
      // Show the saved avatar (or the bundled default as a placeholder), but do
      // NOT mark it changed — we must never persist the bundled default path.
      setSelectedAvatar(me.avatar || '');
      setPreviewAvatar(me.avatar || avatarDefault);
      setSelectedPersonaSrc('');
      setAvatarChanged(false);
    }
  }, [me]);

  const handleIdentityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setIdentity((prev) => ({ ...prev, [name]: value }));
  };

  const handleSecurityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSecurity((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarSelect = async (src: string) => {
    setSelectedPersonaSrc(src);
    setPreviewAvatar(src); // instant feedback while we encode
    setAvatarChanged(true);
    try {
      const dataUrl = await toDownscaledDataUrl(src);
      setSelectedAvatar(dataUrl);
      setPreviewAvatar(dataUrl);
    } catch {
      // Encoding failed (rare) — fall back to the raw asset reference.
      setSelectedAvatar(src);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File too large', { description: 'Please use a file under 2MB.' });
      input.value = '';
      return;
    }
    try {
      const raw = await readFileAsDataUrl(file);
      const dataUrl = await toDownscaledDataUrl(raw);
      setSelectedPersonaSrc('');
      setSelectedAvatar(dataUrl);
      setPreviewAvatar(dataUrl);
      setAvatarChanged(true);
    } catch {
      toast.error('Image error', { description: 'Could not process that image. Please try another file.' });
    } finally {
      // Allow re-selecting the same file (onChange won't fire otherwise).
      input.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!identity.username.trim()) {
      toast.error('Username required', { description: 'Please enter a username.' });
      return;
    }

    if (security.newPassword) {
      if (!security.currentPassword) {
        toast.error('Current password required', {
          description: 'Enter your current password to set a new one.',
        });
        return;
      }
      if (security.newPassword !== security.confirmPassword) {
        toast.error('Passwords do not match', { description: 'Please ensure both password fields match.' });
        return;
      }
    }

    try {
      const payload: Record<string, string> = {
        username: identity.username.trim(),
        title: identity.title,
      };
      // Only persist the avatar when the user actually picked/uploaded one, and
      // never write the bundled default placeholder back to the profile.
      if (avatarChanged && selectedAvatar && selectedAvatar !== avatarDefault) {
        payload.avatar = selectedAvatar;
      }
      if (security.newPassword) {
        payload.current_password = security.currentPassword;
        payload.new_password = security.newPassword;
      }
      const updated = await updateProfile(payload).unwrap();
      // Keep the navbar / persisted session in sync with the saved profile.
      dispatch(setUser(updated));
      toast.success('Profile updated', { description: 'Your identity records have been synchronized.' });
      setSecurity({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error('Update failed', {
        description: getApiErrorMessage(err, 'A synchronization error occurred. Please try again.'),
      });
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ bgcolor: NT_BG, minHeight: 'calc(100vh - 80px)', display: 'flex' }}>
        <LeftSidebar />
        <Box sx={{ flex: 1, p: { xs: 4, md: 6, lg: 10 } }}>
          <Skeleton variant="rectangular" height={60} sx={{ borderRadius: '16px', mb: 4, maxWidth: 500 }} />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '8fr 4fr' }, gap: 4 }}>
            <Stack spacing={3}>
              <Skeleton variant="rectangular" height={200} sx={{ borderRadius: '16px' }} />
              <Skeleton variant="rectangular" height={200} sx={{ borderRadius: '16px' }} />
            </Stack>
            <Skeleton variant="rectangular" height={420} sx={{ borderRadius: '16px' }} />
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      sx={{ bgcolor: NT_BG, minHeight: 'calc(100vh - 80px)', display: 'flex' }}
    >
      {/* Left Sidebar */}
      <LeftSidebar />

      {/* Main Content */}
      <Box sx={{ flex: 1, p: { xs: 4, md: 6, lg: 10 }, minWidth: 0 }}>
        {/* Page Header */}
        <Box
          sx={{
            mb: 6,
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'flex-start', md: 'flex-end' },
            justifyContent: 'space-between',
            gap: 3,
          }}
        >
          <Box>
            <Typography variant="h3" sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 900, letterSpacing: '-0.04em', color: NT_TEXT, mb: 1 }}>
              Profile Settings
            </Typography>
            <Typography sx={{ fontSize: '0.9rem', color: 'rgba(42,52,57,0.6)', fontWeight: 500 }}>
              Manage your professional identity and security preferences.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              onClick={() => navigate(-1)}
              sx={{ fontSize: '0.85rem', fontWeight: 700, color: 'rgba(42,52,57,0.6)', textTransform: 'none', '&:hover': { color: NT_TEXT, bgcolor: 'transparent' } }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isUpdating}
              variant="contained"
              endIcon={<ArrowRight size={16} />}
              sx={{
                borderRadius: '12px',
                px: 4, py: 1.5,
                bgcolor: NT_ACCENT,
                fontWeight: 700,
                fontSize: '0.875rem',
                textTransform: 'none',
                boxShadow: '0 8px 20px rgba(58,168,193,0.25)',
                '&:hover': { bgcolor: '#2d8ea3', boxShadow: '0 12px 28px rgba(58,168,193,0.3)' },
              }}
            >
              {isUpdating ? 'Updating...' : 'Update Profile'}
            </Button>
          </Box>
        </Box>

        {/* Grid Layout: 8 cols left, 4 cols right */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' },
            gap: 4,
            alignItems: 'start',
          }}
        >
          {/* Left Column */}
          <Stack spacing={4}>
            {/* Avatar Section */}
            <SectionCard>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 6 }}>
                {/* Current Photo */}
                <Box sx={{ flexShrink: 0 }}>
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: NT_TEXT, mb: 3 }}>
                    Current Profile Photo
                  </Typography>
                  <Box sx={{ position: 'relative', width: 'max-content' }}>
                    <Box
                      sx={{
                        width: 128, height: 128,
                        borderRadius: '16px',
                        overflow: 'hidden',
                        border: `1px solid ${NT_BORDER}`,
                        bgcolor: NT_BG,
                      }}
                    >
                      <Box
                        component="img"
                        src={previewAvatar}
                        alt="Current avatar"
                        sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </Box>
                    <Box
                      onClick={() => fileInputRef.current?.click()}
                      sx={{
                        position: 'absolute', bottom: -8, right: -8,
                        width: 40, height: 40,
                        bgcolor: NT_ACCENT,
                        color: 'white',
                        borderRadius: '12px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(58,168,193,0.35)',
                        transition: 'transform 0.15s',
                        '&:hover': { transform: 'scale(1.08)' },
                      }}
                    >
                      <Upload size={18} />
                    </Box>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg"
                      style={{ display: 'none' }}
                      onChange={handleFileUpload}
                    />
                  </Box>
                </Box>

                {/* Persona Grid */}
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: NT_TEXT, mb: 3 }}>
                    Select a Persona
                  </Typography>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(7, 1fr)',
                      gap: 1.5,
                      mb: 4,
                    }}
                  >
                    {AVATAR_OPTIONS.map((src, i) => {
                      const isSelected = selectedPersonaSrc === src;
                      return (
                        <Box
                          key={i}
                          onClick={() => handleAvatarSelect(src)}
                          sx={{
                            aspectRatio: '1',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            border: `2px solid ${isSelected ? NT_ACCENT : NT_BORDER}`,
                            cursor: 'pointer',
                            filter: isSelected ? 'none' : 'grayscale(100%)',
                            boxShadow: isSelected ? `0 0 0 3px rgba(58,168,193,0.2)` : 'none',
                            transition: 'all 0.2s',
                            '&:hover': {
                              filter: 'none',
                              transform: 'scale(1.08)',
                              border: `2px solid ${NT_ACCENT}`,
                            },
                          }}
                        >
                          <Box
                            component="img"
                            src={src}
                            alt={`Avatar option ${i + 1}`}
                            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          />
                        </Box>
                      );
                    })}
                  </Box>

                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3,
                      pt: 3,
                      borderTop: `1px solid ${NT_BORDER}`,
                    }}
                  >
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      startIcon={<Upload size={15} />}
                      sx={{
                        borderRadius: '12px',
                        border: `1px solid rgba(42,52,57,0.1)`,
                        color: NT_TEXT,
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        textTransform: 'none',
                        px: 2.5, py: 1.25,
                        '&:hover': { borderColor: NT_ACCENT, color: NT_ACCENT, bgcolor: 'transparent' },
                      }}
                    >
                      Upload New
                    </Button>
                    <Typography sx={{ fontSize: '0.72rem', color: 'rgba(42,52,57,0.55)', fontWeight: 500 }}>
                      PNG or JPEG up to 2MB.
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </SectionCard>

            {/* Identity Section */}
            <SectionCard>
              <SectionHeading icon={UserCog} title="Identity & Professional Role" />
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 4,
                }}
              >
                <FieldInput
                  label="Username"
                  name="username"
                  value={identity.username}
                  onChange={handleIdentityChange}
                  maxLength={150}
                  helper="Unique identifier used for mentions and collaboration."
                />
                <FieldInput
                  label="Professional Title"
                  name="title"
                  value={identity.title}
                  onChange={handleIdentityChange}
                  placeholder="e.g. Senior Systems Architect"
                  maxLength={120}
                  helper="Your role title shown in the organizational directory."
                />
              </Box>
            </SectionCard>
          </Stack>

          {/* Right Column — Security */}
          <SectionCard sx={{ height: '100%' }}>
            <SectionHeading icon={ShieldCheck} title="Account Security" />
            <Stack spacing={4}>
              <FieldInput
                label="Current Password"
                name="currentPassword"
                value={security.currentPassword}
                onChange={handleSecurityChange}
                type={showCurrentPw ? 'text' : 'password'}
                endAdornment={
                  <Box
                    component="button"
                    type="button"
                    onClick={() => setShowCurrentPw((p) => !p)}
                    sx={{
                      background: 'none', border: 'none', cursor: 'pointer', p: 0,
                      color: 'rgba(42,52,57,0.4)', display: 'flex',
                      '&:hover': { color: NT_ACCENT },
                    }}
                  >
                    {showCurrentPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </Box>
                }
              />
              <FieldInput
                label="New Password"
                name="newPassword"
                value={security.newPassword}
                onChange={handleSecurityChange}
                type={showNewPw ? 'text' : 'password'}
                placeholder="Min. 8 characters"
                endAdornment={
                  <Box
                    component="button"
                    type="button"
                    onClick={() => setShowNewPw((p) => !p)}
                    sx={{
                      background: 'none', border: 'none', cursor: 'pointer', p: 0,
                      color: 'rgba(42,52,57,0.4)', display: 'flex',
                      '&:hover': { color: NT_ACCENT },
                    }}
                  >
                    {showNewPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </Box>
                }
              />
              <FieldInput
                label="Confirm New Password"
                name="confirmPassword"
                value={security.confirmPassword}
                onChange={handleSecurityChange}
                type={showConfirmPw ? 'text' : 'password'}
                placeholder="Repeat new password"
                endAdornment={
                  <Box
                    component="button"
                    type="button"
                    onClick={() => setShowConfirmPw((p) => !p)}
                    sx={{
                      background: 'none', border: 'none', cursor: 'pointer', p: 0,
                      color: 'rgba(42,52,57,0.4)', display: 'flex',
                      '&:hover': { color: NT_ACCENT },
                    }}
                  >
                    {showConfirmPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </Box>
                }
              />

              {/* Info note */}
              <Box
                sx={{
                  bgcolor: 'rgba(58,168,193,0.03)',
                  borderRadius: '12px',
                  p: 2.5,
                  border: '1px solid rgba(58,168,193,0.1)',
                  display: 'flex',
                  gap: 1.5,
                }}
              >
                <ShieldCheck size={18} color={NT_ACCENT} style={{ flexShrink: 0, marginTop: 2 }} />
                <Typography sx={{ fontSize: '0.75rem', color: 'rgba(42,52,57,0.7)', fontWeight: 500, lineHeight: 1.6 }}>
                  Use at least 8 characters. Mixing uppercase letters, numbers, and symbols strengthens your account.
                </Typography>
              </Box>
            </Stack>
          </SectionCard>
        </Box>

        {/* Footer Links */}
        <Box
          sx={{
            mt: 8,
            pt: 5,
            pb: 4,
            borderTop: `1px solid ${NT_BORDER}`,
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
            gap: 3,
          }}
        >
          <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {['Data Protection', 'Terms of Service', 'Support Center'].map((l) => (
              <Typography
                key={l}
                component="a"
                href="#"
                sx={{
                  fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase',
                  letterSpacing: '0.1em', color: 'rgba(42,52,57,0.55)', textDecoration: 'none',
                  '&:hover': { color: NT_ACCENT },
                  transition: 'color 0.15s',
                }}
              >
                {l}
              </Typography>
            ))}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10b981', animation: 'pulse 2s infinite' }} />
            <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(42,52,57,0.4)' }}>
              Encrypted Connection Verified
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
