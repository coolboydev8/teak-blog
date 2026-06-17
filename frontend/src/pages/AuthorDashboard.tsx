import { Box, Typography, Avatar, Button, Skeleton, Stack } from '@mui/material';
import { useGetMyPostsQuery, useGetMeQuery } from '../store/apiSlice';
import { LayoutDashboard, FileText, MessageSquare, BarChart2, Settings, Plus, ArrowUpRight, Bell, TrendingUp, Check, X, Send } from 'lucide-react';
import { format } from 'date-fns';
import { Link as RouterLink } from 'react-router-dom';
import { motion } from 'framer-motion';

// Spine line component reused across all items
const SpineDot = ({ color, ring }: { color: string; ring: string }) => (
  <Box sx={{ position: 'absolute', left: '1.125rem', top: 4, width: 12, height: 12, bgcolor: '#F8F8FF', border: '2px solid', borderColor: color, borderRadius: '50%', zIndex: 1, boxShadow: `0 0 0 4px ${ring}` }} />
);

// Publish Event
const PublishEventCard = ({ post, delay }: { post: any; delay: number }) => (
  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay }}>
    <Box sx={{ position: 'relative', pl: '4rem', pb: 6 }}>
      <Box sx={{ position: 'absolute', left: '1.5rem', top: 0, bottom: 0, width: 2, background: 'linear-gradient(to bottom, rgba(42,52,57,0.15), rgba(42,52,57,0.03))' }} />
      <SpineDot color="#3AA8C1" ring="rgba(58,168,193,0.1)" />
      <Box sx={{ bgcolor: 'white', borderRadius: '16px', p: 3, border: '1px solid rgba(42,52,57,0.02)', boxShadow: '0 2px 4px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.05)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Box>
            <Box sx={{ display: 'inline-block', px: 1.5, py: 0.5, borderRadius: '6px', bgcolor: 'rgba(58,168,193,0.1)', mb: 1 }}>
              <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#3AA8C1' }}>Publish Event</Typography>
            </Box>
            <Typography sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 700, fontSize: '1.05rem', letterSpacing: '-0.01em' }}>{post.title}</Typography>
          </Box>
          <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, opacity: 0.25, whiteSpace: 'nowrap', ml: 2 }}>
            {format(new Date(post.updated_at), 'HH:mm a')}
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ opacity: 0.6, lineHeight: 1.6, mb: 2 }}>
          {post.excerpt || 'Post has been successfully indexed and fanned out to subscribers. SEO metadata performance is 15% above average.'}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Box component={RouterLink} to={`/posts/${post.slug}`} sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#3AA8C1', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>View Live</Box>
          <Box component={RouterLink} to={`/editor/${post.slug}`} sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(42,52,57,0.4)', textDecoration: 'none', '&:hover': { color: '#2A3439' } }}>Analytics</Box>
        </Box>
      </Box>
    </Box>
  </motion.div>
);

// Comment Approved Event
const CommentEventCard = ({ delay }: { delay: number }) => (
  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay }}>
    <Box sx={{ position: 'relative', pl: '4rem', pb: 6 }}>
      <Box sx={{ position: 'absolute', left: '1.5rem', top: 0, bottom: 0, width: 2, background: 'linear-gradient(to bottom, rgba(42,52,57,0.15), rgba(42,52,57,0.03))' }} />
      <SpineDot color="#2A3439" ring="rgba(42,52,57,0.05)" />
      <Box sx={{ bgcolor: 'white', borderRadius: '16px', p: 3, border: '1px solid rgba(42,52,57,0.02)', boxShadow: '0 2px 4px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.05)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar src="https://i.pravatar.cc/100?u=sarah" sx={{ width: 32, height: 32 }} />
            <Box>
              <Typography sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 700, fontSize: '0.875rem' }}>New Comment Approved</Typography>
              <Typography sx={{ fontSize: '0.65rem', opacity: 0.4, fontWeight: 500 }}>from Sarah Miller</Typography>
            </Box>
          </Box>
          <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, opacity: 0.25, whiteSpace: 'nowrap', ml: 2 }}>08:15 AM</Typography>
        </Box>
        <Box sx={{ borderLeft: '2px solid #3AA8C1', pl: 2, mb: 2 }}>
          <Typography sx={{ fontSize: '0.875rem', fontStyle: 'italic', opacity: 0.7, lineHeight: 1.6 }}>
            "Excellent breakdown of JSONB. Could you expand on the index overhead for frequently updated fields?"
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#F8F8FF', borderRadius: '10px', px: 1.5, py: 1 }}>
          <Box component="input" placeholder="Type quick reply..." sx={{ flex: 1, border: 'none', background: 'none', outline: 'none', fontSize: '0.75rem', fontFamily: 'inherit', color: '#2A3439', '&::placeholder': { color: 'rgba(42,52,57,0.3)' } }} />
          <Box sx={{ width: 32, height: 32, bgcolor: '#2A3439', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', '&:hover': { bgcolor: '#3AA8C1' }, transition: 'background 0.2s', flexShrink: 0 }}>
            <Send size={14} color="white" />
          </Box>
        </Box>
      </Box>
    </Box>
  </motion.div>
);

// Day divider
const DayDivider = ({ label }: { label: string }) => (
  <Box sx={{ position: 'relative', pl: '4rem', mb: 4, display: 'flex', alignItems: 'center', gap: 3, height: 40 }}>
    <Box sx={{ position: 'absolute', left: '1.5rem', top: 0, bottom: 0, width: 2, background: 'rgba(42,52,57,0.06)' }} />
    <Box sx={{ flex: 1, height: 1, bgcolor: 'rgba(42,52,57,0.04)' }} />
    <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.3em', opacity: 0.2, bgcolor: '#F8F8FF', px: 3, position: 'relative', zIndex: 1, whiteSpace: 'nowrap' }}>{label}</Typography>
    <Box sx={{ flex: 1, height: 1, bgcolor: 'rgba(42,52,57,0.04)' }} />
  </Box>
);

// Milestone Card
const MilestoneCard = ({ delay }: { delay: number }) => (
  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay }}>
    <Box sx={{ position: 'relative', pl: '4rem', pb: 6 }}>
      <Box sx={{ position: 'absolute', left: '1.5rem', top: 0, bottom: 0, width: 2, background: 'linear-gradient(to bottom, rgba(42,52,57,0.15), rgba(42,52,57,0.03))' }} />
      <SpineDot color="#10b981" ring="rgba(16,185,129,0.1)" />
      <Box sx={{ bgcolor: 'white', borderRadius: '16px', p: 3, border: '4px solid #10b981', borderTop: '4px solid #10b981', borderRight: '1px solid rgba(42,52,57,0.05)', borderBottom: '1px solid rgba(42,52,57,0.05)', borderLeft: '4px solid #10b981', boxShadow: '0 2px 4px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.05)', position: 'relative', overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Box>
            <Box sx={{ display: 'inline-block', px: 1.5, py: 0.5, borderRadius: '6px', bgcolor: 'rgba(16,185,129,0.08)', mb: 1 }}>
              <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#10b981' }}>Quarterly Milestone</Typography>
            </Box>
            <Typography sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 700, fontSize: '1.05rem', letterSpacing: '-0.01em' }}>10,000 Total Reads</Typography>
          </Box>
          <Box sx={{ width: 40, height: 40, bgcolor: 'rgba(16,185,129,0.08)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={20} color="#10b981" />
          </Box>
        </Box>
        <Typography variant="body2" sx={{ opacity: 0.6, lineHeight: 1.6, mb: 2 }}>
          The "Nordic Trust Engineering Blog" publication has officially crossed 10k unique reader sessions. Engagement is up 22% compared to last cycle.
        </Typography>
        <Button size="small" sx={{ bgcolor: '#2A3439', color: 'white', borderRadius: '8px', px: 2.5, py: 1, fontWeight: 700, fontSize: '0.7rem', '&:hover': { bgcolor: '#3AA8C1' } }}>Generate Analysis</Button>
      </Box>
    </Box>
  </motion.div>
);

// Moderation Queue Card
const ModerationQueueCard = ({ delay }: { delay: number }) => (
  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay }}>
    <Box sx={{ position: 'relative', pl: '4rem', pb: 6 }}>
      <Box sx={{ position: 'absolute', left: '1.5rem', top: 0, bottom: 0, width: 2, background: 'linear-gradient(to bottom, rgba(42,52,57,0.15), rgba(42,52,57,0.03))' }} />
      <SpineDot color="#f59e0b" ring="rgba(245,158,11,0.1)" />
      <Box sx={{ bgcolor: 'white', borderRadius: '16px', p: 3, border: '1px solid rgba(42,52,57,0.02)', boxShadow: '0 2px 4px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.05)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Box>
            <Box sx={{ display: 'inline-block', px: 1.5, py: 0.5, borderRadius: '6px', bgcolor: 'rgba(245,158,11,0.1)', mb: 1 }}>
              <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#f59e0b' }}>Moderation Queue</Typography>
            </Box>
            <Typography sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 700, fontSize: '0.875rem', letterSpacing: '-0.01em' }}>2 Pending Comments</Typography>
          </Box>
          <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, opacity: 0.25, whiteSpace: 'nowrap', ml: 2 }}>Yesterday</Typography>
        </Box>
        <Stack spacing={1.5}>
          {['"I think this approach is flawed because..."', '"Great article, can you share the source code?"'].map((comment, i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, bgcolor: '#F8F8FF', borderRadius: '10px' }}>
              <Typography sx={{ fontSize: '0.75rem', opacity: 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>{comment}</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                <Box sx={{ p: 0.75, bgcolor: 'white', color: '#10b981', borderRadius: '6px', cursor: 'pointer', display: 'flex', '&:hover': { bgcolor: 'rgba(16,185,129,0.1)' } }}><Check size={14} /></Box>
                <Box sx={{ p: 0.75, bgcolor: 'white', color: '#f43f5e', borderRadius: '6px', cursor: 'pointer', display: 'flex', '&:hover': { bgcolor: 'rgba(244,63,94,0.1)' } }}><X size={14} /></Box>
              </Box>
            </Box>
          ))}
        </Stack>
      </Box>
    </Box>
  </motion.div>
);

const RightStatCard = ({ children, accent }: { children: React.ReactNode; accent?: boolean }) => (
  <Box sx={{ bgcolor: 'white', borderRadius: '16px', p: 2.5, border: '1px solid rgba(42,52,57,0.02)', boxShadow: '0 2px 4px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.05)', ...(accent ? { borderLeft: '4px solid #3AA8C1' } : {}) }}>
    {children}
  </Box>
);

export default function AuthorDashboard() {
  const { data: me } = useGetMeQuery({});
  const { data: postsData, isLoading } = useGetMyPostsQuery({});

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', active: true },
    { icon: FileText, label: 'Posts' },
    { icon: MessageSquare, label: 'Comments' },
    { icon: BarChart2, label: 'Analytics' },
    { icon: Settings, label: 'Settings' },
  ];

  return (
    <Box sx={{ bgcolor: '#F8F8FF', minHeight: 'calc(100vh - 64px)', display: 'flex' }}>
      {/* Left Icon Rail */}
      <Box
        sx={{
          width: 80,
          bgcolor: 'white',
          borderRight: '1px solid rgba(42,52,57,0.05)',
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          alignItems: 'center',
          py: 4,
          gap: 2,
          position: 'sticky',
          top: 64,
          height: 'calc(100vh - 64px)',
        }}
      >
        {navItems.map(({ icon: Icon, label, active }) => (
          <Box
            key={label}
            title={label}
            sx={{
              width: 48,
              height: 48,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              bgcolor: active ? '#3AA8C1' : 'transparent',
              color: active ? 'white' : 'rgba(42,52,57,0.35)',
              boxShadow: active ? '0 8px 24px rgba(58,168,193,0.3)' : 'none',
              transition: 'all 0.2s',
              '&:hover': active ? {} : { bgcolor: 'white', color: '#3AA8C1', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
            }}
          >
            <Icon size={22} />
          </Box>
        ))}
        <Box sx={{ mt: 'auto' }}>
          <Avatar
            src={me?.avatar || `https://i.pravatar.cc/100?u=${me?.username || 'user'}`}
            sx={{ width: 40, height: 40, border: '2px solid white', boxShadow: '0 0 0 1px rgba(42,52,57,0.1)' }}
          />
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ flex: 1, p: { xs: 3, md: 5 }, maxWidth: 900 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 6 }}>
          <Box>
            <Typography variant="h4" sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 900, letterSpacing: '-0.03em', mb: 0.5 }}>
              Author Dashboard
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.55 }}>
              Welcome back, {me?.username || 'Writer'}. Here is your editorial pulse for today.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', opacity: 0.3 }}>
              Updated: Today, 2:14 PM
            </Typography>
          </Box>
        </Box>

        <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.3em', opacity: 0.3, mb: 3 }}>
          System Activity // Proportional Spine
        </Typography>

        {/* Timeline */}
        <Box sx={{ position: 'relative' }}>
          {isLoading ? (
            [1, 2, 3].map((i) => (
              <Box key={i} sx={{ pl: '4rem', pb: 5 }}>
                <Skeleton variant="rectangular" height={100} sx={{ borderRadius: '16px' }} />
              </Box>
            ))
          ) : postsData?.results?.length ? (
            <>
              {postsData.results.slice(0, 1).map((post: any, i: number) => (
                <PublishEventCard key={post.id} post={post} delay={i * 0.15} />
              ))}
              <CommentEventCard delay={0.3} />
              <DayDivider label="Yesterday" />
              <MilestoneCard delay={0.5} />
              <ModerationQueueCard delay={0.65} />
              {postsData.results.slice(1).map((post: any, i: number) => (
                <PublishEventCard key={post.id} post={post} delay={0.8 + i * 0.1} />
              ))}
            </>
          ) : (
            <>
              <CommentEventCard delay={0} />
              <DayDivider label="Yesterday" />
              <MilestoneCard delay={0.2} />
              <ModerationQueueCard delay={0.35} />
            </>
          )}
        </Box>

        <Box sx={{ pl: '4rem', pt: 2, display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="contained"
            component={RouterLink}
            to="/editor"
            startIcon={<Plus size={18} />}
            sx={{ borderRadius: '12px', py: 1.5, px: 4, bgcolor: '#3AA8C1', fontWeight: 700, '&:hover': { bgcolor: '#2A3439' } }}
          >
            New Post
          </Button>
        </Box>
      </Box>

      {/* Right Sidebar */}
      <Box
        sx={{
          width: 320,
          borderLeft: '1px solid rgba(42,52,57,0.05)',
          p: 3,
          display: { xs: 'none', xl: 'flex' },
          flexDirection: 'column',
          gap: 2.5,
          bgcolor: 'rgba(255,255,255,0.5)',
          position: 'sticky',
          top: 64,
          height: 'calc(100vh - 64px)',
          overflowY: 'auto',
        }}
      >
        {/* Profile card */}
        <RightStatCard>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Avatar
              src={me?.avatar || `https://i.pravatar.cc/100?u=${me?.username || 'user'}`}
              sx={{ width: 48, height: 48, border: '2px solid white', boxShadow: '0 0 0 2px #3AA8C1, 0 0 0 4px rgba(58,168,193,0.15)' }}
            />
            <Box>
              <Typography sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 700, fontSize: '0.875rem' }}>{me?.username || 'Teak Writer'}</Typography>
              <Typography sx={{ fontSize: '0.7rem', opacity: 0.45, fontStyle: 'italic' }}>Lead Technical Writer</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
            {[{ label: 'Articles', value: postsData?.count || 0 }, { label: 'Trust', value: '9.8' }].map((s) => (
              <Box key={s.label} sx={{ p: 1.5, bgcolor: '#F8F8FF', borderRadius: '10px', textAlign: 'center' }}>
                <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', opacity: 0.35, mb: 0.5 }}>{s.label}</Typography>
                <Typography sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 700, fontSize: '1.1rem' }}>{s.value}</Typography>
              </Box>
            ))}
          </Box>
        </RightStatCard>

        {/* Performance */}
        <RightStatCard accent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Typography sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 700, fontSize: '0.875rem' }}>Performance</Typography>
            <TrendingUp size={16} color="#3AA8C1" />
          </Box>
          <Stack spacing={2.5}>
            {[
              { label: 'Total Views', value: '12,482', trend: '+12.4%' },
              { label: 'Subscribers', value: '1,240', trend: '+4.2%' },
            ].map((s) => (
              <Box key={s.label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <Box>
                  <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, opacity: 0.35, textTransform: 'uppercase', letterSpacing: '0.2em', mb: 0.5 }}>{s.label}</Typography>
                  <Typography sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 800, fontSize: '1.5rem', letterSpacing: '-0.02em' }}>{s.value}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#10b981' }}>
                  <ArrowUpRight size={14} />
                  <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, color: '#10b981' }}>{s.trend}</Typography>
                </Box>
              </Box>
            ))}
          </Stack>
        </RightStatCard>

        {/* Audience Reach */}
        <RightStatCard>
          <Typography sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.2em', mb: 2.5 }}>Audience Reach</Typography>
          <Stack spacing={1.5}>
            {[{ label: 'Eng', pct: 85 }, { label: 'Ops', pct: 42 }, { label: 'Sec', pct: 29 }].map((r) => (
              <Box key={r.label} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, opacity: 0.35, width: 28 }}>{r.label}</Typography>
                <Box sx={{ flex: 1, height: 6, bgcolor: '#F8F8FF', borderRadius: '999px', overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${r.pct}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                    style={{ height: '100%', background: '#3AA8C1', borderRadius: '999px' }}
                  />
                </Box>
                <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, width: 30, textAlign: 'right' }}>{r.pct}%</Typography>
              </Box>
            ))}
          </Stack>
        </RightStatCard>

        {/* Editorial Insight */}
        <Box
          sx={{
            bgcolor: '#2A3439',
            borderRadius: '16px',
            p: 2.5,
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(42,52,57,0.2)',
            mt: 'auto',
          }}
        >
          <Bell size={36} style={{ position: 'absolute', right: -4, bottom: -4, opacity: 0.08 }} />
          <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.25em', opacity: 0.6, mb: 1 }}>Editorial Insight</Typography>
          <Typography sx={{ fontSize: '0.8rem', lineHeight: 1.6, opacity: 0.85, mb: 2 }}>
            Users are engaging with "Read Time" badges 40% more frequently this week.
          </Typography>
          <Button
            fullWidth
            size="small"
            sx={{
              bgcolor: 'white',
              color: '#2A3439',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.7rem',
              py: 1,
              '&:hover': { bgcolor: '#3AA8C1', color: 'white' },
            }}
          >
            Apply Recommendations
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
