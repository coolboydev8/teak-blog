import { useState, useEffect } from 'react';
import { Box, Typography, Avatar, Button, Chip, Stack, InputBase, Skeleton } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, Users, BarChart2, Settings, Shield, Search, Bell, Check, MoreVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Comment {
  id: number;
  author: { name: string; avatar: string; role: string };
  post: string;
  body: string;
  time: string;
  status: 'pending' | 'approved' | 'rejected';
  urgent?: boolean;
}

const MOCK_COMMENTS: Comment[] = [
  { id: 1, author: { name: 'Erik Sorenson', avatar: 'https://i.pravatar.cc/150?u=erik', role: 'Contributor' }, post: '"Scaling Postgres..."', body: 'The insights on PostgreSQL optimization were incredibly helpful for our current sprint. Quick question: how do you handle connection pooling at scale?', time: '2m ago', status: 'pending' },
  { id: 2, author: { name: 'Anna Lindberg', avatar: 'https://i.pravatar.cc/150?u=anna', role: 'Reader' }, post: '"Nordic Trust Design..."', body: 'This design system is so clean. I love the use of white space here. Is there a public Figma file available for the community?', time: '15m ago', status: 'pending', urgent: true },
  { id: 3, author: { name: 'Anonymous', avatar: '', role: '' }, post: '"Webhooks & Events"', body: 'Can someone verify if the secret header is mandatory for all requests or just production ones?', time: '1h ago', status: 'pending' },
  { id: 4, author: { name: 'Lars Jensen', avatar: 'https://i.pravatar.cc/150?u=lars', role: 'Pro Member' }, post: '"Fintech Future..."', body: '"Great read on the future of Fintech in Scandinavia. Looking forward to the next part."', time: '1h ago', status: 'approved' },
  { id: 5, author: { name: 'Karin Holm', avatar: 'https://i.pravatar.cc/150?u=karin', role: 'Contributor' }, post: '"Scaling Postgres..."', body: '"The section on indexing was gold. Really simplified a complex topic."', time: '3h ago', status: 'approved' },
  { id: 6, author: { name: 'Bot User 99', avatar: '', role: 'Bot' }, post: '"Any Post"', body: 'Check out this amazing offer for fast cash now! Visit our site at spam-link.com to claim your prize today...', time: 'Yesterday', status: 'rejected' },
];

const KanbanCard = ({ comment, onApprove, onReject }: { comment: Comment; onApprove: () => void; onReject: () => void }) => {
  const isPending = comment.status === 'pending';
  const isApproved = comment.status === 'approved';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
    >
      <Box
        sx={{
          bgcolor: comment.status === 'rejected' ? 'rgba(42,52,57,0.04)' : 'white',
          p: 3,
          borderRadius: '16px',
          border: '1px solid',
          borderColor: comment.status === 'rejected' ? 'rgba(42,52,57,0.1)' : 'rgba(42,52,57,0.05)',
          boxShadow: comment.status === 'pending' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
          transition: 'box-shadow 0.2s',
          '&:hover': { boxShadow: isPending ? '0 8px 24px rgba(0,0,0,0.1)' : '0 2px 8px rgba(0,0,0,0.06)' },
          '&::after': isPending ? {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            width: 4,
            height: '100%',
            bgcolor: '#3AA8C1',
            opacity: 0,
            transition: 'opacity 0.3s',
          } : {},
          '&:hover::after': isPending ? { opacity: 1 } : {},
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ position: 'relative', flexShrink: 0 }}>
              {comment.author.avatar ? (
                <Avatar src={comment.author.avatar} sx={{ width: 44, height: 44 }} />
              ) : (
                <Box sx={{ width: 44, height: 44, borderRadius: '50%', bgcolor: '#F8F8FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(42,52,57,0.25)' }}>
                  <Users size={20} />
                </Box>
              )}
              <Box sx={{
                position: 'absolute', bottom: -2, right: -2, width: 14, height: 14,
                bgcolor: isPending ? '#f59e0b' : isApproved ? '#10b981' : '#f43f5e',
                border: '2px solid white', borderRadius: '50%',
              }} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }}>{comment.author.name}</Typography>
              <Typography sx={{ fontSize: '0.7rem', opacity: 0.45 }}>
                on <Box component="span" sx={{ color: '#3AA8C1', fontWeight: 600 }}>{comment.post}</Box>
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {comment.urgent && <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#f43f5e', animation: 'pulse 2s infinite' }} />}
            <Typography sx={{ fontSize: '0.65rem', opacity: 0.28, fontWeight: 700 }}>{comment.time}</Typography>
          </Box>
        </Box>

        <Typography variant="body2" sx={{ opacity: 0.65, lineHeight: 1.6, mb: 2.5, fontStyle: isApproved ? 'italic' : 'normal', fontSize: '0.85rem' }}>
          {comment.body.length > 120 ? comment.body.slice(0, 120) + '...' : comment.body}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(42,52,57,0.05)', pt: 2 }}>
          {isPending ? (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                onClick={onApprove}
                sx={{ px: 2, py: 0.75, bgcolor: 'rgba(58,168,193,0.1)', color: '#3AA8C1', fontWeight: 800, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', borderRadius: '8px', '&:hover': { bgcolor: '#3AA8C1', color: 'white' } }}
              >
                Approve
              </Button>
              <Button
                size="small"
                onClick={onReject}
                sx={{ px: 2, py: 0.75, bgcolor: 'rgba(244,63,94,0.05)', color: '#f43f5e', fontWeight: 800, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', borderRadius: '8px', '&:hover': { bgcolor: '#f43f5e', color: 'white' } }}
              >
                Reject
              </Button>
            </Box>
          ) : isApproved ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: '#10b981' }}>
              <Check size={14} />
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 800 }}>Published</Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: '#f43f5e' }} />
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, color: '#f43f5e', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Spam Detected</Typography>
            </Box>
          )}
          <Box sx={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', cursor: 'pointer', color: 'rgba(42,52,57,0.3)', '&:hover': { bgcolor: '#F8F8FF' } }}>
            <MoreVertical size={14} />
          </Box>
        </Box>
      </Box>
    </motion.div>
  );
};

export default function Management() {
  const [comments, setComments] = useState<Comment[]>(MOCK_COMMENTS);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  const pending = comments.filter((c) => c.status === 'pending' && (c.author.name.toLowerCase().includes(search.toLowerCase()) || c.body.toLowerCase().includes(search.toLowerCase())));
  const approved = comments.filter((c) => c.status === 'approved');
  const rejected = comments.filter((c) => c.status === 'rejected');

  const approve = (id: number) => setComments((prev) => prev.map((c) => c.id === id ? { ...c, status: 'approved' } : c));
  const reject = (id: number) => setComments((prev) => prev.map((c) => c.id === id ? { ...c, status: 'rejected' } : c));

  const columns = [
    { title: 'Pending', color: '#f59e0b', bgColor: 'rgb(251,191,36)', items: pending, countLabel: `${pending.length} NEW`, status: 'pending' as const },
    { title: 'Approved', color: '#10b981', bgColor: 'rgb(16,185,129)', items: approved, countLabel: `${approved.length} TOTAL`, status: 'approved' as const },
    { title: 'Rejected', color: '#f43f5e', bgColor: 'rgb(244,63,94)', items: rejected, countLabel: `${rejected.length} ARCHIVED`, status: 'rejected' as const },
  ];

  const sidebarNav = [
    { icon: LayoutDashboard, label: 'Dashboard', to: '/dashboard' },
    { icon: MessageSquare, label: 'Moderation', to: '/management', active: true },
    { icon: Users, label: 'Authors', to: '#' },
    { icon: BarChart2, label: 'Analytics', to: '#' },
  ];

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)', bgcolor: '#F8F8FF', overflow: 'hidden' }}>
      {/* Left Sidebar */}
      <Box
        sx={{
          width: { xs: 80, lg: 256 },
          bgcolor: 'white',
          borderRight: '1px solid rgba(42,52,57,0.05)',
          display: 'flex',
          flexDirection: 'column',
          p: 3,
          flexShrink: 0,
        }}
      >
        {/* Brand */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 6 }}>
          <Box sx={{ width: 40, height: 40, bgcolor: '#3AA8C1', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Shield size={20} color="white" />
          </Box>
          <Typography sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 700, fontSize: '1.1rem', display: { xs: 'none', lg: 'block' } }}>Nordic Trust</Typography>
        </Box>

        {/* Nav items */}
        <Stack spacing={0.5} sx={{ flex: 1 }}>
          {sidebarNav.map(({ icon: Icon, label, to, active }) => (
            <Box
              key={label}
              component={RouterLink}
              to={to}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 2,
                py: 1.5,
                borderRadius: '12px',
                textDecoration: 'none',
                color: active ? 'white' : 'rgba(42,52,57,0.4)',
                bgcolor: active ? '#3AA8C1' : 'transparent',
                boxShadow: active ? '0 8px 20px rgba(58,168,193,0.2)' : 'none',
                transition: 'all 0.2s',
                '&:hover': active ? {} : { bgcolor: '#F8F8FF', color: '#3AA8C1' },
              }}
            >
              <Icon size={20} />
              <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, display: { xs: 'none', lg: 'block' } }}>{label}</Typography>
            </Box>
          ))}
        </Stack>

        {/* Bottom nav */}
        <Stack spacing={0.5}>
          <Box
            component={RouterLink}
            to="#"
            sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5, borderRadius: '12px', textDecoration: 'none', color: 'rgba(42,52,57,0.4)', '&:hover': { bgcolor: '#F8F8FF', color: '#3AA8C1' } }}
          >
            <Settings size={20} />
            <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, display: { xs: 'none', lg: 'block' } }}>Settings</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5, borderRadius: '12px', borderTop: '1px solid rgba(42,52,57,0.05)', mt: 1, pt: 2 }}>
            <Avatar src="https://i.pravatar.cc/150?u=sven" sx={{ width: 32, height: 32, border: '1px solid rgba(42,52,57,0.1)' }} />
            <Box sx={{ display: { xs: 'none', lg: 'block' } }}>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, lineHeight: 1.2 }}>Sven Andersson</Typography>
              <Typography sx={{ fontSize: '0.6rem', opacity: 0.4 }}>System Administrator</Typography>
            </Box>
          </Box>
        </Stack>
      </Box>

      {/* Main content */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <Box sx={{ height: 80, bgcolor: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(42,52,57,0.05)', px: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Typography variant="h6" sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 700 }}>Comment Moderation</Typography>
            <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1, bgcolor: '#F8F8FF', px: 2, py: 0.75, borderRadius: '999px', border: '1px solid rgba(42,52,57,0.05)' }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#3AA8C1', animation: 'pulse 2s infinite' }} />
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, opacity: 0.55 }}>{pending.length} Live Requests</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1, bgcolor: '#F8F8FF', borderRadius: '999px', px: 2, py: 0.75, border: '1px solid rgba(42,52,57,0.06)' }}>
              <Search size={14} style={{ opacity: 0.4 }} />
              <InputBase
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search comments..."
                sx={{ fontSize: '0.85rem', width: 200, transition: 'width 0.3s', '&:focus-within': { width: 280 } }}
              />
            </Box>
            <Box sx={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', '&:hover': { bgcolor: '#F8F8FF' } }}>
              <Bell size={20} style={{ opacity: 0.55 }} />
            </Box>
          </Box>
        </Box>

        {/* Kanban board */}
        <Box sx={{ flex: 1, overflowX: 'auto', p: 4, bgcolor: '#F8F8FF' }}>
          <Box sx={{ display: 'flex', gap: 4, minWidth: 1000, height: '100%' }}>
            {columns.map(({ title, color, items, countLabel, status }) => (
              <Box key={status} sx={{ flex: 1, minWidth: 340, display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Column header */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: color }} />
                    <Typography sx={{ fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.2em', opacity: 0.7 }}>{title}</Typography>
                  </Box>
                  <Chip
                    label={countLabel}
                    size="small"
                    sx={{
                      fontSize: '0.6rem',
                      fontWeight: 800,
                      bgcolor: status === 'pending' ? 'rgba(245,158,11,0.1)' : 'transparent',
                      color: status === 'pending' ? '#b45309' : 'rgba(42,52,57,0.35)',
                      height: 22,
                    }}
                  />
                </Box>

                {/* Cards */}
                <Box sx={{ flex: 1, overflowY: 'auto', pr: 0.5, display: 'flex', flexDirection: 'column', gap: 2, pb: 4 }}>
                  <AnimatePresence>
                    {isLoading ? (
                      [1, 2, 3].map((i) => (
                        <Box key={i} sx={{ p: 3, bgcolor: 'white', borderRadius: '16px', border: '1px solid rgba(42,52,57,0.05)' }}>
                          <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
                            <Skeleton variant="circular" width={44} height={44} />
                            <Box sx={{ flex: 1 }}>
                              <Skeleton width="40%" height={14} sx={{ mb: 1 }} />
                              <Skeleton width="20%" height={10} />
                            </Box>
                          </Box>
                          <Skeleton width="90%" height={16} sx={{ mb: 1 }} />
                          <Skeleton width="70%" height={16} />
                        </Box>
                      ))
                    ) : (
                      items.map((c) => (
                        <KanbanCard
                          key={c.id}
                          comment={c}
                          onApprove={() => approve(c.id)}
                          onReject={() => reject(c.id)}
                        />
                      ))
                    )}
                  </AnimatePresence>
                  {!isLoading && items.length === 0 && (
                    <Box sx={{ p: 4, textAlign: 'center', opacity: 0.3 }}>
                      <Typography variant="body2" sx={{ fontStyle: 'italic' }}>No {title.toLowerCase()} comments</Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
