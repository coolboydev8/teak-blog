import { Box, Typography, Avatar, Button, Skeleton, Stack, IconButton, InputBase } from '@mui/material';
import {
  useGetMyPostsQuery,
  useGetMeQuery,
  useGetAnalyticsQuery,
  useGetActivityQuery,
  useGetCommentsQuery,
} from '../store/apiSlice';
import { LayoutDashboard, FileText, MessageSquare, BarChart2, Settings, Plus, ArrowUpRight, ArrowDownRight, TrendingUp, Send, Check, X, Award, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { Link as RouterLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { useMemo, useState, useEffect } from 'react';

// Animation Variants matching Design's logic
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.3
    }
  }
};

const itemVariantsLeft: Variants = {
  hidden: { x: -20, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 120, damping: 15 } }
};

const itemVariantsRight: Variants = {
  hidden: { x: 40, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { ease: "circOut", duration: 1 } }
};

const activityVariants: Variants = {
  hidden: { y: 16, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { ease: "circOut", duration: 0.8 } }
};

const spineVariants: Variants = {
  hidden: { scaleY: 0 },
  visible: { scaleY: 1, transition: { duration: 1.5, ease: "easeInOut" } }
};

const SpineDot = ({ color, ring }: { color: string; ring: string }) => (
  <Box sx={{ position: 'absolute', left: '1.125rem', top: 4, width: 12, height: 12, bgcolor: '#F8F8FF', border: '2px solid', borderColor: color, borderRadius: '50%', zIndex: 1, boxShadow: `0 0 0 4px ${ring}` }} />
);

const TYPE_META: Record<string, { label: string; color: string; ring: string }> = {
  publish: { label: 'Publish Event', color: '#3AA8C1', ring: 'rgba(58,168,193,0.1)' },
  comment: { label: 'New Comment', color: '#2A3439', ring: 'rgba(42,52,57,0.05)' },
  comment_approved: { label: 'New Comment Approved', color: '#2A3439', ring: 'rgba(42,52,57,0.05)' },
  milestone: { label: 'Quarterly Milestone', color: '#10b981', ring: 'rgba(16,185,129,0.1)' },
  moderation: { label: 'Moderation Queue', color: '#f59e0b', ring: 'rgba(245,158,11,0.1)' },
};

const ActivityCard = ({ ev }: { ev: any }) => {
  const meta = TYPE_META[ev.type] || TYPE_META.publish;
  const slug = ev.metadata?.slug || ev.metadata?.post_slug;
  const isComment = ev.type === 'comment' || ev.type === 'comment_approved';
  const isMilestone = ev.type === 'milestone';

  return (
    <motion.div variants={activityVariants}>
      <Box sx={{ position: 'relative', pl: '4rem', pb: 5 }}>
        <SpineDot color={isMilestone ? '#10b981' : meta.color} ring={meta.ring} />
        
        <Box 
          sx={{ 
            bgcolor: 'white', 
            borderRadius: '24px', 
            p: 4, 
            border: '1px solid rgba(42,52,57,0.02)', 
            boxShadow: '0 2px 4px rgba(0,0,0,0.03), 0 8px 24px rgba(0,0,0,0.04)',
            position: 'relative',
            overflow: 'hidden',
            transition: 'transform 0.2s',
            '&:hover': { transform: 'translateY(-2px)' },
            ...(isMilestone && { borderTop: '4px solid #10b981' })
          }}
        >
          {isMilestone && (
            <Box 
              component="img"
              src="https://images.unsplash.com/photo-1637427025398-d8be7e294218?auto=format&w=400&q=80"
              sx={{ position: 'absolute', right: 0, top: 0, width: 200, height: 200, objectFit: 'cover', opacity: 0.03, grayscale: 1, pointerEvents: 'none' }}
            />
          )}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: isComment ? 3 : 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: isComment ? 2 : 0 }}>
              {isComment && (
                <Avatar src={ev.metadata?.author_avatar || `https://i.pravatar.cc/100?u=${ev.metadata?.author_name || 'user'}`} sx={{ width: 36, height: 36 }} />
              )}
              <Box>
                <Box sx={{ display: 'inline-block', px: 1.5, py: 0.5, borderRadius: '4px', bgcolor: `${isMilestone ? '#10b981' : meta.color}1a`, mb: 1 }}>
                  <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: isMilestone ? '#10b981' : meta.color }}>{meta.label}</Typography>
                </Box>
                <Typography sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 700, fontSize: isComment ? '0.9rem' : '1.15rem', letterSpacing: '-0.01em', color: '#2A3439' }}>
                  {ev.title}
                  {isComment && <Box component="span" sx={{ fontSize: '0.75rem', color: 'rgba(42,52,57,0.4)', fontWeight: 500, ml: 1 }}>from {ev.metadata?.author_name || 'Sarah Miller'}</Box>}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {isMilestone && <Award size={32} color="#10b981" style={{ opacity: 0.2 }} />}
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.3, whiteSpace: 'nowrap' }}>{format(new Date(ev.created_at), 'HH:mm')}</Typography>
            </Box>
          </Box>

          {ev.body && (
            <Box sx={{ 
              pl: isComment ? 3 : 0, 
              borderLeft: isComment ? '2px solid #3AA8C1' : 'none',
              mb: (slug || isComment) ? 3 : 0 
            }}>
              <Typography variant="body2" sx={{ opacity: 0.65, lineHeight: 1.7, fontSize: '0.9rem', fontStyle: isComment ? 'italic' : 'normal' }}>
                {isComment ? `"${ev.body}"` : ev.body}
              </Typography>
            </Box>
          )}

          {isComment && (
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <InputBase 
                placeholder="Type quick reply..." 
                sx={{ flex: 1, bgcolor: '#F8F8FF', borderRadius: '10px', px: 2, py: 1, fontSize: '0.8rem', border: '1px solid rgba(42,52,57,0.05)' }} 
              />
              <IconButton sx={{ bgcolor: '#2A3439', color: 'white', borderRadius: '10px', '&:hover': { bgcolor: '#3AA8C1' } }}>
                <Send size={16} />
              </IconButton>
            </Box>
          )}

          {slug && !isComment && (
            <Box component={RouterLink} to={`/posts/${slug}`} sx={{ fontSize: '0.75rem', fontWeight: 800, color: '#3AA8C1', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>View Live</Box>
          )}

          {isMilestone && (
            <Button variant="contained" size="small" sx={{ bgcolor: '#2A3439', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.65rem', py: 1, px: 2.5, borderRadius: '8px' }}>Generate Analysis</Button>
          )}
        </Box>
      </Box>
    </motion.div>
  );
};

const RightStatCard = ({ children, accent }: { children: React.ReactNode; accent?: boolean }) => (
  <motion.div variants={itemVariantsRight}>
    <Box sx={{ bgcolor: 'white', borderRadius: '24px', p: 3, border: '1px solid rgba(42,52,57,0.02)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', position: 'relative', overflow: 'hidden', ...(accent ? { borderLeft: '4px solid #3AA8C1' } : {}) }}>
      {children}
    </Box>
  </motion.div>
);

export default function AuthorDashboard() {
  const { data: me } = useGetMeQuery({});
  const { data: postsData } = useGetMyPostsQuery({ status: 'published' }, { refetchOnMountOrArgChange: true });
  const { data: analytics } = useGetAnalyticsQuery({}, { refetchOnMountOrArgChange: true });
  const { data: activityData, isLoading: isActivityLoading } = useGetActivityQuery({}, { refetchOnMountOrArgChange: true });

  const [commentPage, setCommentPage] = useState(1);
  const [allComments, setAllComments] = useState<any[]>([]);
  const [displayLimit, setDisplayLimit] = useState(10);

  // 1. Identify Top Post (Most comments, then latest)
  const topPost = useMemo(() => {
    if (!postsData?.results?.length) return null;
    return [...postsData.results].sort((a, b) => {
      if (b.comment_count !== a.comment_count) {
        return b.comment_count - a.comment_count;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })[0];
  }, [postsData]);

  // 2. Fetch comments for top post
  const { data: commentsData, isLoading: isCommentsLoading } = useGetCommentsQuery(
    { slug: topPost?.slug || '', page: commentPage },
    { skip: !topPost }
  );

  // Accumulate comments
  useEffect(() => {
    if (commentsData?.results) {
      setAllComments(prev => {
        const existingIds = new Set(prev.map(c => c.id));
        const newComments = commentsData.results.filter((c: any) => !existingIds.has(c.id));
        return [...prev, ...newComments];
      });
    }
  }, [commentsData]);

  // Reset if top post changes
  useEffect(() => {
    setAllComments([]);
    setCommentPage(1);
    setDisplayLimit(10);
  }, [topPost?.id]);

  const handleLoadMore = () => {
    const nextLimit = displayLimit + 5;
    setDisplayLimit(nextLimit);
    if (nextLimit > allComments.length && commentsData?.next) {
      setCommentPage(prev => prev + 1);
    }
  };

  const milestones = useMemo(() => {
    return activityData?.results?.filter((ev: any) => ev.type === 'milestone') || [];
  }, [activityData]);

  const fmt = (n?: number) => (n ?? 0).toLocaleString();
  const delta = (n?: number) => `${(n ?? 0) >= 0 ? '+' : ''}${n ?? 0}%`;
  const reach = analytics?.audience_reach ?? [];

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', active: true },
    { icon: FileText, label: 'Posts' },
    { icon: MessageSquare, label: 'Comments' },
    { icon: BarChart2, label: 'Analytics' },
    { icon: Settings, label: 'Settings' },
  ];

  return (
    <Box sx={{ bgcolor: '#F8F8FF', minHeight: 'calc(100vh - 80px)', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '80px 1fr', lg: '80px 1fr 420px' } }}>
      {/* Left Icon Rail */}
      <Box
        component={motion.div}
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        sx={{
          width: 80,
          bgcolor: 'white',
          borderRight: '1px solid rgba(42,52,57,0.05)',
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          alignItems: 'center',
          py: 5,
          gap: 4,
          position: 'sticky',
          top: 80,
          height: 'calc(100vh - 80px)',
          zIndex: 10
        }}
      >
        {navItems.map(({ icon: Icon, label, active }) => (
          <Box
            key={label}
            component={motion.div}
            variants={itemVariantsLeft}
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
              '&:hover': active ? {} : { bgcolor: '#F8F8FF', color: '#3AA8C1', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }
            }}
          >
            <Icon size={24} strokeWidth={2.5} />
          </Box>
        ))}
        <Box component={motion.div} variants={itemVariantsLeft} sx={{ mt: 'auto' }}>
          <Avatar
            src={me?.avatar || `https://i.pravatar.cc/100?u=${me?.username || 'user'}`}
            sx={{ width: 40, height: 40, border: '2px solid white', boxShadow: '0 0 0 1px rgba(42,52,57,0.1)' }}
          />
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ p: { xs: 4, md: 8, lg: 10 }, maxWidth: 1100, mx: 'auto', width: '100%', overflowX: 'hidden' }}>
        <motion.header
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          style={{ marginBottom: '48px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}
        >
          <Box>
            <Typography variant="h3" sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 900, letterSpacing: '-0.04em', mb: 1, color: '#2A3439' }}>
              Author Dashboard
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.5, fontWeight: 500 }}>
              Welcome back, {me?.username || 'Erik'}. Here is your editorial pulse for today.
            </Typography>
          </Box>
          <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgba(42,52,57,0.3)', textTransform: 'uppercase', letterSpacing: '0.25em', display: { xs: 'none', md: 'block' } }}>
            Updated: Today, {format(new Date(), 'HH:mm')}
          </Typography>
        </motion.header>

        <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.35em', color: 'rgba(42,52,57,0.25)', mb: 4 }}>
          System Activity // Proportional Spine
        </Typography>

        {/* Timeline (real activity feed) */}
        <Box
          component={motion.div}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={containerVariants}
          sx={{ position: 'relative' }}
        >
          {/* Main Spine Line Animation */}
          <Box
            component={motion.div}
            variants={spineVariants}
            sx={{
              position: 'absolute',
              left: '1.5rem',
              top: 0,
              bottom: 0,
              width: 2,
              background: 'linear-gradient(to bottom, #2A3439 0%, rgba(42, 52, 57, 0.05) 100%)',
              transformOrigin: 'top',
              zIndex: 0,
              opacity: 0.2
            }}
          />

          <AnimatePresence mode="popLayout">
            {isActivityLoading ? (
              [1, 2, 3].map((i) => (
                <Box key={i} sx={{ pl: '4rem', pb: 5 }}>
                  <Skeleton variant="rectangular" height={140} sx={{ borderRadius: '24px' }} />
                </Box>
              ))
            ) : (
              <>
                {/* 4. Milestones placed at the top */}
                {milestones.map((ev: any) => <ActivityCard key={ev.id} ev={ev} />)}

                {/* 1. The Top Post (One post with most comments) */}
                {topPost && (
                  <ActivityCard 
                    ev={{
                      id: `top-post-${topPost.id}`,
                      type: 'publish',
                      title: topPost.title,
                      body: topPost.excerpt,
                      created_at: topPost.created_at,
                      metadata: { slug: topPost.slug }
                    }} 
                  />
                )}

                {/* 2. Most recent approved comments for this post */}
                {allComments.slice(0, displayLimit).map((comment: any) => (
                  <ActivityCard 
                    key={comment.id} 
                    ev={{
                      id: comment.id,
                      type: 'comment_approved',
                      title: 'Comment Approved',
                      body: comment.body,
                      created_at: comment.created_at,
                      metadata: {
                        author_name: comment.author_name,
                        author_avatar: comment.author_avatar
                      }
                    }} 
                  />
                ))}

                {/* 3. Load More Button */}
                {(allComments.length > displayLimit || commentsData?.next) && (
                  <Box sx={{ pl: '4rem', pt: 2, pb: 6, display: 'flex', justifyContent: 'center' }}>
                    <Button
                      onClick={handleLoadMore}
                      disabled={isCommentsLoading}
                      variant="text"
                      startIcon={<ChevronDown size={18} />}
                      sx={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: 'rgba(42,52,57,0.4)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.15em',
                        '&:hover': { color: '#3AA8C1', bgcolor: 'transparent' }
                      }}
                    >
                      {isCommentsLoading ? 'Synchronizing...' : 'Load More Protocol'}
                    </Button>
                  </Box>
                )}
                
                {!topPost && !milestones.length && (
                  <Box sx={{ pl: '4rem', py: 12, opacity: 0.35, textAlign: 'center' }}>
                    <Typography sx={{ fontStyle: 'italic', fontSize: '1.1rem' }}>No activity yet — publish a post to get started.</Typography>
                  </Box>
                )}
              </>
            )}
          </AnimatePresence>
        </Box>

        <Box sx={{ pl: '4rem', pt: 4, display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="contained"
            component={RouterLink}
            to="/editor"
            startIcon={<Plus size={20} />}
            sx={{
              borderRadius: '999px',
              py: 2,
              px: 6,
              bgcolor: '#3AA8C1',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              fontSize: '0.75rem',
              boxShadow: '0 8px 24px rgba(58,168,193,0.25)',
              transition: 'all 0.4s',
              position: 'relative',
              overflow: 'hidden',
              '&::after': { content: '""', position: 'absolute', inset: 0, bgcolor: '#2A3439', opacity: 0, transition: 'opacity 0.3s' },
              '&:hover::after': { opacity: 1 },
              '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 12px 32px rgba(42,52,57,0.2)' },
              '& span': { position: 'relative', zIndex: 1 }
            }}
          >
            <span>New Post</span>
          </Button>
        </Box>
      </Box>

      {/* Right Sidebar */}
      <Box
        component={motion.div}
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        sx={{
          width: 420,
          borderLeft: '1px solid rgba(42,52,57,0.05)',
          p: 5,
          display: { xs: 'none', lg: 'flex' },
          flexDirection: 'column',
          gap: 5,
          bgcolor: 'rgba(255, 255, 255, 0.4)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 80,
          height: 'calc(100vh - 80px)',
          overflowY: 'auto'
        }}
      >
        {/* Profile card */}
        <RightStatCard>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, mb: 3 }}>
            <Avatar
              src={me?.avatar || `https://i.pravatar.cc/100?u=${me?.username || 'user'}`}
              sx={{ width: 56, height: 56, border: '3px solid white', boxShadow: '0 0 0 2px #3AA8C1, 0 8px 20px rgba(0,0,0,0.1)' }}
            />
            <Box>
              <Typography sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 800, fontSize: '1rem', color: '#2A3439' }}>{me?.username || ''}</Typography>
              <Typography sx={{ fontSize: '0.75rem', opacity: 0.45, fontWeight: 500, fontStyle: 'italic' }}>{me?.title || 'Author'}</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            {[{ label: 'Articles', value: fmt(postsData?.count) }, { label: 'Trust', value: analytics?.trust_score ?? '—' }].map((s) => (
              <Box key={s.label} sx={{ p: 2, bgcolor: '#F8F8FF', borderRadius: '12px', textAlign: 'center', border: '1px solid rgba(42,52,57,0.03)' }}>
                <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', opacity: 0.3, mb: 0.5 }}>{s.label}</Typography>
                <Typography sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 800, fontSize: '1.25rem' }}>{s.value}</Typography>
              </Box>
            ))}
          </Box>
        </RightStatCard>

        {/* Performance */}
        <RightStatCard accent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
            <Typography sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 800, fontSize: '0.9rem', color: '#2A3439' }}>Performance</Typography>
            <TrendingUp size={18} color="#3AA8C1" />
          </Box>
          <Stack spacing={4}>
            {[
              { label: 'Total Views', value: fmt(analytics?.total_views), trendValue: analytics?.views_delta_pct ?? 0 },
              { label: 'Subscribers', value: fmt(analytics?.subscriber_count), trendValue: analytics?.subscribers_delta_pct ?? 0 },
            ].map((s) => {
              const up = s.trendValue >= 0;
              return (
                <Box key={s.label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <Box>
                    <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, opacity: 0.3, textTransform: 'uppercase', letterSpacing: '0.2em', mb: 0.5 }}>{s.label}</Typography>
                    <Typography sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 900, fontSize: '1.75rem', letterSpacing: '-0.04em', color: '#2A3439' }}>{s.value}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: up ? '#10b981' : '#f43f5e', pb: 0.5 }}>
                    {up ? <ArrowUpRight size={14} strokeWidth={3} /> : <ArrowDownRight size={14} strokeWidth={3} />}
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 800 }}>{delta(s.trendValue)}</Typography>
                  </Box>
                </Box>
              );
            })}
          </Stack>
        </RightStatCard>

        {/* Audience Reach */}
        <RightStatCard>
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.25em', opacity: 0.4 }}>Audience Reach</Typography>
            <Typography sx={{ fontSize: '0.7rem', color: 'rgba(42,52,57,0.4)', mt: 0.5 }}>Share of views by category</Typography>
          </Box>

          {reach.length === 0 ? (
            <Typography sx={{ fontSize: '0.75rem', opacity: 0.4, fontStyle: 'italic', py: 1 }}>
              No reach data yet — publish a post to start tracking views by category.
            </Typography>
          ) : (
            <Stack spacing={2.5}>
              {reach.map((r: any, i: number) => (
                <Box key={r.label}>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 1, gap: 1 }}>
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(42,52,57,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.label}
                    </Typography>
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 800, color: '#2A3439', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                      {r.pct}%
                    </Typography>
                  </Box>
                  <Box sx={{ height: 8, bgcolor: '#EEF1F6', borderRadius: '999px', overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${r.pct}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, ease: 'circOut', delay: i * 0.08 }}
                      style={{ height: '100%', borderRadius: '999px', background: 'linear-gradient(90deg, #3AA8C1, #5fbcd1)' }}
                    />
                  </Box>
                </Box>
              ))}
            </Stack>
          )}
        </RightStatCard>

        {/* Editorial Insight */}
        <Box
          component={motion.div}
          variants={itemVariantsRight}
          sx={{ bgcolor: '#2A3439', borderRadius: '24px', p: 4, color: 'white', position: 'relative', overflow: 'hidden', boxShadow: '0 12px 32px rgba(42,52,57,0.3)', mt: 'auto' }}
        >
          <TrendingUp size={80} style={{ position: 'absolute', right: -12, bottom: -12, opacity: 0.1 }} />
          <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.3em', opacity: 0.5, mb: 2, fontFamily: '"Inter", sans-serif' }}>Editorial Insight</Typography>
          <Typography sx={{ fontSize: '0.85rem', lineHeight: 1.7, opacity: 0.9, mb: 3, fontWeight: 500 }}>
            Users are engaging with "Read Time" badges 40% more frequently this week. Consider optimizing metadata.
          </Typography>
          <Button
            fullWidth
            component={RouterLink}
            to="/management"
            sx={{ bgcolor: 'white', color: '#2A3439', borderRadius: '12px', fontWeight: 800, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.15em', py: 1.5, '&:hover': { bgcolor: '#3AA8C1', color: 'white' } }}
          >
            Open Moderation
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
