import {
  Box, Typography, Stack, Avatar, Button, Chip,
  Table, TableBody, TableCell, TableHead, TableRow, Skeleton
} from '@mui/material';
import {
  useGetMySubscriptionsQuery,
  useUpdateSubscriptionMutation,
  useUnsubscribeMutation,
  useGetWebhooksQuery,
  useCreateWebhookMutation,
  useDeleteWebhookMutation,
  useGetMeQuery,
  useUpdateProfileMutation,
} from '../store/apiSlice';
import { Rss, MessageCircle, UserPlus, Pencil, Trash2, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const StatusChip = ({ status }: { status: string }) => {
  const map: Record<string, { color: string; bg: string; label: string }> = {
    functional: { color: '#059669', bg: 'rgba(16,185,129,0.08)', label: 'Functional' },
    awaiting: { color: '#b45309', bg: 'rgba(245,158,11,0.1)', label: 'Awaiting' },
    failing: { color: '#dc2626', bg: 'rgba(239,68,68,0.1)', label: 'Failing' },
    inactive: { color: 'rgba(42,52,57,0.4)', bg: 'rgba(42,52,57,0.06)', label: 'Inactive' },
    active: { color: '#059669', bg: 'rgba(16,185,129,0.08)', label: 'Active' },
    paused: { color: 'rgba(42,52,57,0.4)', bg: 'rgba(42,52,57,0.06)', label: 'Paused' },
  };
  const s = map[status] || map.inactive;
  return (
    <Chip
      label={s.label}
      size="small"
      sx={{
        fontSize: '0.6rem',
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: '0.15em',
        color: s.color,
        bgcolor: s.bg,
        height: 24,
        borderRadius: '6px',
        border: `1px solid ${s.color}20`,
      }}
    />
  );
};

const EventIcon = ({ event }: { event: string }) => {
  const icons: Record<string, React.ElementType> = {
    'post.published': Rss,
    'comment.created': MessageCircle,
    'user.subscribed': UserPlus,
  };
  const Icon = icons[event] || Rss;
  return <Icon size={16} />;
};

const SUB_COLORS = [
  { color: '#e0e7ff', text: '#4338ca' },
  { color: '#ffe4e6', text: '#e11d48' },
  { color: '#fef3c7', text: '#d97706' },
  { color: '#dcfce7', text: '#15803d' },
];

export default function Subscriptions() {
  const { data: me } = useGetMeQuery({});
  const { data: subs = [], isLoading } = useGetMySubscriptionsQuery({});
  const [updateSub] = useUpdateSubscriptionMutation();
  const [unsub] = useUnsubscribeMutation();
  const { data: webhooks = [] } = useGetWebhooksQuery({});
  const [createWebhook] = useCreateWebhookMutation();
  const [deleteWebhook] = useDeleteWebhookMutation();
  const [updateProfile] = useUpdateProfileMutation();
  const navigate = useNavigate();

  const authors = subs.map((s: any, i: number) => ({
    id: s.id,
    uuid: s.uuid,
    initials: (s.author.username || '?').slice(0, 2).toUpperCase(),
    name: s.author.username,
    role: s.author.title || 'Author',
    domain: s.author.domain || '—',
    freq: s.frequency,
    status: s.is_active ? 'active' : 'paused',
    ...SUB_COLORS[i % SUB_COLORS.length],
  }));

  const onSubAction = (a: any) =>
    a.status === 'active' ? unsub(a.uuid) : updateSub({ id: a.uuid, is_active: true });

  const onNewEndpoint = () => {
    const url = window.prompt('Destination URL:', 'https://');
    if (!url) return;
    const event =
      window.prompt('Event (post.published / comment.created / user.subscribed):', 'post.published') ||
      'post.published';
    createWebhook({ event, url, secret: '' });
  };

  if (isLoading) {
    return (
      <Box sx={{ bgcolor: '#F8F8FF', minHeight: 'calc(100vh - 80px)', p: 8 }}>
        <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
          <Skeleton width="40%" height={60} sx={{ mb: 4 }} />
          <Skeleton variant="rectangular" height={150} sx={{ borderRadius: '24px', mb: 8 }} />
          <Skeleton variant="rectangular" height={300} sx={{ borderRadius: '24px' }} />
        </Box>
      </Box>
    );
  }

  return (
    <Box component={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} sx={{ bgcolor: '#F8F8FF', minHeight: 'calc(100vh - 80px)' }}>
      <Box sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 3, md: 4 }, py: { xs: 5, md: 8 } }}>

        {/* Page header */}
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <Box sx={{ mb: 8 }}>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 2 }}>
              <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.3em', color: '#3AA8C1' }}>
                Preferences
              </Typography>
              <Box sx={{ flex: 1, height: 1, bgcolor: 'rgba(42,52,57,0.06)' }} />
            </Stack>
            <Typography variant="h3" sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 900, letterSpacing: '-0.04em', mb: 2 }}>
              Settings & Subscriptions
            </Typography>
            <Typography sx={{ fontSize: '1.05rem', opacity: 0.5, maxWidth: '60ch', lineHeight: 1.7 }}>
              Manage automated risk workflows, security callback endpoints, and your professional editorial digest.
            </Typography>
          </Box>
        </motion.div>

        {/* Profile section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
          <Box sx={{ py: 6, borderTop: '1px solid rgba(42,52,57,0.06)', borderBottom: '1px solid rgba(42,52,57,0.06)', mb: 8 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={4} sx={{ alignItems: { md: 'center' }, justifyContent: 'space-between' }}>
              <Stack direction="row" spacing={4} sx={{ alignItems: 'center' }}>
                <Box sx={{ position: 'relative' }}>
                  <Avatar src={me?.avatar || undefined} sx={{ width: 112, height: 112, border: '4px solid white', boxShadow: '0 8px 30px rgba(0,0,0,0.04)', fontSize: '2.5rem', fontWeight: 700 }}>{(me?.username || '?').charAt(0).toUpperCase()}</Avatar>
                  <Box sx={{ position: 'absolute', bottom: 4, right: 4, width: 24, height: 24, bgcolor: '#10b981', border: '4px solid #F8F8FF', borderRadius: '50%' }} />
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 900, letterSpacing: '-0.03em', mb: 1 }}>
                    {me?.username || 'Author'}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center', mt: 0.5 }}>
                    <Typography sx={{ color: '#3AA8C1', fontWeight: 700, fontSize: '0.875rem' }}>{me?.title || 'Systems Architect'}{me?.domain ? ` • ${me.domain}` : ''}</Typography>
                    <Typography sx={{ fontSize: '0.8rem', opacity: 0.35 }}>
                      {me?.email}
                    </Typography>
                  </Box>
                </Box>
              </Stack>
              <Button
                variant="contained"
                onClick={() => navigate('/settings/profile')}
                startIcon={<Pencil size={16} />}
                sx={{ bgcolor: '#2A3439', borderRadius: '12px', px: 4, py: 1.5, fontWeight: 800, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.2em', boxShadow: '0 8px 24px rgba(42,52,57,0.15)', '&:hover': { bgcolor: '#3AA8C1' } }}
              >
                Profile Settings
              </Button>
            </Stack>
          </Box>
        </motion.div>

        {/* Editorial Loop - Author subscriptions table */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
          <Box sx={{ mb: 12 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', mb: 4, pb: 3, borderBottom: '1px solid rgba(42,52,57,0.04)' }}>
              <Box>
                <Typography variant="h5" sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 900, letterSpacing: '-0.03em', mb: 0.5 }}>Editorial Loop</Typography>
                <Typography sx={{ fontSize: '0.85rem', opacity: 0.4 }}>Verified industry insights from the Teak collective.</Typography>
              </Box>
              <Box sx={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(42,52,57,0.3)', border: '1px solid rgba(42,52,57,0.07)', px: 1.5, py: 0.75, borderRadius: '6px' }}>
                {authors.filter((a: any) => a.status === 'active').length} Active Authors
              </Box>
            </Box>

            <Table>
              <TableHead>
                <TableRow sx={{ '& th': { fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(42,52,57,0.35)', borderBottom: '2px solid rgba(42,52,57,0.04)', py: 2 } }}>
                  <TableCell>Verified Author</TableCell>
                  <TableCell>Domain</TableCell>
                  <TableCell>Update Frequency</TableCell>
                  <TableCell>State</TableCell>
                  <TableCell align="right"></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {authors.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ py: 5, textAlign: 'center', opacity: 0.4, fontStyle: 'italic' }}>
                      You are not subscribed to any authors yet.
                    </TableCell>
                  </TableRow>
                )}
                {authors.map((a: any) => (
                  <TableRow
                    key={a.id}
                    sx={{ '& td': { borderBottom: '1px solid rgba(42,52,57,0.04)', py: 3 } }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: a.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.8rem', fontWeight: 700, color: a.text, border: `1px solid ${a.text}25` }}>
                          {a.initials}
                        </Box>
                        <Box>
                          <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>{a.name}</Typography>
                          <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', opacity: 0.25 }}>{a.role}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.875rem', opacity: 0.6, fontWeight: 500 }}>{a.domain}</TableCell>
                    <TableCell sx={{ fontSize: '0.875rem', opacity: 0.6, fontWeight: 500 }}>{a.freq}</TableCell>
                    <TableCell><StatusChip status={a.status} /></TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        onClick={() => onSubAction(a)}
                        sx={{
                          fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em',
                          color: a.status === 'active' ? 'rgba(244,63,94,0.6)' : '#3AA8C1',
                          '&:hover': { color: a.status === 'active' ? '#f43f5e' : '#2A3439' },
                        }}
                      >
                        {a.status === 'active' ? 'Unsubscribe' : 'Resume'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </motion.div>

        {/* Callback Workflows - Webhook table */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.35 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', mb: 4, pb: 3, borderBottom: '1px solid rgba(42,52,57,0.04)' }}>
              <Box>
                <Typography variant="h5" sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 900, letterSpacing: '-0.03em', mb: 0.5 }}>Callback Workflows</Typography>
                <Typography sx={{ fontSize: '0.85rem', opacity: 0.4 }}>Configure real-time system triggers and authentication handshakes.</Typography>
              </Box>
              <Button
                variant="contained"
                onClick={onNewEndpoint}
                startIcon={<Plus size={16} />}
                sx={{ bgcolor: '#2A3439', borderRadius: '12px', px: 3, py: 1.25, fontWeight: 800, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.2em', boxShadow: '0 8px 24px rgba(42,52,57,0.15)', '&:hover': { bgcolor: '#3AA8C1' } }}
              >
                + New Endpoint
              </Button>
            </Box>

            <Table>
              <TableHead>
                <TableRow sx={{ '& th': { fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(42,52,57,0.35)', borderBottom: '2px solid rgba(42,52,57,0.04)', py: 2 } }}>
                  <TableCell>Trigger Event</TableCell>
                  <TableCell>Destination (URL)</TableCell>
                  <TableCell>Auth Secret</TableCell>
                  <TableCell>Health State</TableCell>
                  <TableCell align="right"></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {webhooks.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ py: 5, textAlign: 'center', opacity: 0.4, fontStyle: 'italic' }}>
                      No callback endpoints configured. Use “New Endpoint” to add one.
                    </TableCell>
                  </TableRow>
                )}
                {webhooks.map((w: any) => {
                  const status = !w.is_active ? 'inactive' : w.health;
                  const dim = status === 'inactive';
                  return (
                    <TableRow
                      key={w.id}
                      sx={{ '& td': { borderBottom: '1px solid rgba(42,52,57,0.04)', py: 2.5 } }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontWeight: 700, fontSize: '0.875rem', color: dim ? 'rgba(42,52,57,0.3)' : '#2A3439' }}>
                          <Box sx={{ color: dim ? 'rgba(42,52,57,0.2)' : '#3AA8C1' }}>
                            <EventIcon event={w.event} />
                          </Box>
                          <span>{w.event}</span>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontFamily: 'monospace', fontSize: '0.75rem', opacity: dim ? 0.25 : 0.5 }}>{w.url}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontFamily: 'monospace', fontSize: '0.75rem', opacity: dim ? 0.15 : 0.3 }}>
                          {w.secret_set ? 'tk_live_••••••••••••••••' : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell><StatusChip status={status} /></TableCell>
                      <TableCell align="right">
                        <Box
                          onClick={() => { if (window.confirm('Delete this webhook endpoint?')) deleteWebhook(w.uuid); }}
                          sx={{ width: 36, height: 36, borderRadius: '10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(42,52,57,0.25)', '&:hover': { bgcolor: 'rgba(244,63,94,0.08)', color: '#f43f5e' } }}
                        >
                          <Trash2 size={16} />
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        </motion.div>

      </Box>

      {/* Footer */}
      <Box sx={{ bgcolor: '#111', color: 'rgba(255,255,255,0.4)', py: 8, px: { xs: 3, md: '10vw' }, mt: 10 }}>
        <Box sx={{ maxWidth: 1100, mx: 'auto', display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          {/* Brand */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 28, height: 28, bgcolor: 'rgba(255,255,255,0.08)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography sx={{ color: 'white', fontFamily: '"Inter", sans-serif', fontWeight: 900, fontSize: '0.875rem' }}>N</Typography>
            </Box>
            <Typography sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 700, fontSize: '0.875rem', color: 'white', letterSpacing: '-0.01em' }}>Nordic Trust</Typography>
          </Box>

          {/* Nav Links */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 3, md: 5 }, fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em' }}>
            {['System Status', 'Security Charter', 'Privacy', 'API Documentation'].map((l) => (
              <Box key={l} component="a" href="#" sx={{ color: 'inherit', textDecoration: 'none', '&:hover': { color: '#3AA8C1' }, transition: 'color 0.2s' }}>{l}</Box>
            ))}
          </Box>

          {/* Social */}
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            {['GH', 'LI'].map((s) => (
              <Box key={s} component="a" href="#" sx={{ width: 36, height: 36, borderRadius: '8px', bgcolor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'inherit', textDecoration: 'none', fontSize: '0.6rem', fontWeight: 800, '&:hover': { color: '#3AA8C1', bgcolor: 'rgba(255,255,255,0.1)' }, transition: 'all 0.2s' }}>
                {s}
              </Box>
            ))}
          </Box>
        </Box>
        <Box sx={{ maxWidth: 1100, mx: 'auto', mt: 5, pt: 5, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <Typography sx={{ fontSize: '0.55rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em' }}>
            © 2026 Nordic Trust AB. Clinical Edition v4.0.2
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
