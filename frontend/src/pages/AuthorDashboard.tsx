import { Box, Typography, Avatar, Button, Skeleton, Stack, InputBase, Tooltip } from '@mui/material';
import {
  useGetMeQuery,
  useGetAnalyticsQuery,
  useGetActivityQuery,
  useGetCommentsQuery,
  useGetPostStatsQuery,
  useCreateCommentMutation,
  useUpdateCommentMutation,
} from '../store/apiSlice';
import { LayoutDashboard, FileText, MessageSquare, Plus, ArrowUpRight, ArrowDownRight, TrendingUp, Send, Award, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import type { Variants } from 'framer-motion';
import { useMemo, useState, useEffect, useRef, type Ref } from 'react';

// ─── Design tokens ────────────────────────────────────────────────────────────
const NT_BG = '#F8F8FF';
const NT_TEXT = '#2A3439';
const NT_ACCENT = '#3AA8C1';

// ─── Animation Variants ───────────────────────────────────────────────────────
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

// ─── Components ───────────────────────────────────────────────────────────────

const SpineDot = ({ color, ring }: { color: string; ring: string }) => (
  <Box sx={{ position: 'absolute', left: '1.125rem', top: 4, width: 12, height: 12, bgcolor: NT_BG, border: '2px solid', borderColor: color, borderRadius: '50%', zIndex: 1, boxShadow: `0 0 0 4px ${ring}` }} />
);

const TYPE_META: Record<string, { label: string; color: string; ring: string }> = {
  publish: { label: 'Publish Event', color: NT_ACCENT, ring: 'rgba(58,168,193,0.1)' },
  comment: { label: 'New Comment', color: NT_TEXT, ring: 'rgba(42,52,57,0.05)' },
  comment_approved: { label: 'New Comment Approved', color: NT_TEXT, ring: 'rgba(42,52,57,0.05)' },
  comment_pending: { label: 'Pending Review', color: '#f59e0b', ring: 'rgba(245,158,11,0.1)' },
  comment_rejected: { label: 'Rejected', color: '#f43f5e', ring: 'rgba(244,63,94,0.1)' },
  milestone: { label: 'Quarterly Milestone', color: '#10b981', ring: 'rgba(16,185,129,0.1)' },
  moderation: { label: 'Moderation Queue', color: '#f59e0b', ring: 'rgba(245,158,11,0.1)' },
};

const ActivityCard = ({
  ev,
  canEdit = false,
  onSave,
  cardRef,
}: {
  ev: any;
  canEdit?: boolean;
  onSave?: (body: string) => Promise<void> | void;
  cardRef?: Ref<HTMLDivElement>;
}) => {
  const meta = TYPE_META[ev.type] || TYPE_META.publish;
  const slug = ev.metadata?.slug || ev.metadata?.post_slug;
  const isComment = typeof ev.type === 'string' && ev.type.startsWith('comment');
  const isMilestone = ev.type === 'milestone';

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setDraft(ev.body || '');
    setEditing(true);
  };
  const saveEdit = async () => {
    const body = draft.trim();
    if (!body || !onSave) return;
    setSaving(true);
    try {
      await onSave(body);
      setEditing(false);
    } catch {
      // Keep the editor open for retry; the handler surfaces the error toast.
    } finally {
      setSaving(false);
    }
  };

  return (
    // Self-driven entrance: each card animates in on its OWN mount rather than
    // relying on the parent container's stagger propagation. Cards arrive at
    // different times (active post + comments load from separate queries), and
    // any card that mounts after the container's reveal has settled would
    // otherwise stay stuck at the `hidden` variant (opacity 0) and never show.
    <motion.div ref={cardRef} variants={activityVariants} initial="hidden" animate="visible">
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
                <Avatar src={ev.metadata?.author_avatar || undefined} sx={{ width: 36, height: 36, fontSize: '0.85rem', fontWeight: 700 }}>{(ev.metadata?.author_name || '?').charAt(0).toUpperCase()}</Avatar>
              )}
              <Box>
                <Box sx={{ display: 'inline-block', px: 1.5, py: 0.5, borderRadius: '4px', bgcolor: `${isMilestone ? '#10b981' : meta.color}1a`, mb: 1 }}>
                  <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: isMilestone ? '#10b981' : meta.color }}>{meta.label}</Typography>
                </Box>
                <Typography sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 700, fontSize: isComment ? '0.9rem' : '1.15rem', letterSpacing: '-0.01em', color: NT_TEXT }}>
                  {ev.title}
                  {isComment && <Box component="span" sx={{ fontSize: '0.75rem', color: 'rgba(42,52,57,0.4)', fontWeight: 500, ml: 1 }}>from {ev.metadata?.author_name || 'Anonymous'}</Box>}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {isMilestone && <Award size={32} color="#10b981" style={{ opacity: 0.2 }} />}
              {canEdit && isComment && !editing && (
                <Box
                  component="button"
                  type="button"
                  onClick={startEdit}
                  sx={{ background: 'none', border: 'none', cursor: 'pointer', p: 0, fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(42,52,57,0.4)', '&:hover': { color: NT_ACCENT } }}
                >
                  Edit
                </Box>
              )}
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.3, whiteSpace: 'nowrap' }}>{format(new Date(ev.created_at), 'HH:mm')}</Typography>
            </Box>
          </Box>

          {editing ? (
            <Box sx={{ mb: slug ? 3 : 0 }}>
              <InputBase
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                multiline
                minRows={2}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); saveEdit(); }
                  if (e.key === 'Escape') { setEditing(false); }
                }}
                sx={{ width: '100%', bgcolor: NT_BG, borderRadius: '10px', px: 2, py: 1.25, fontSize: '0.9rem', border: `1px solid ${NT_ACCENT}` }}
              />
              <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                <Button
                  onClick={saveEdit}
                  disabled={saving || !draft.trim()}
                  variant="contained"
                  size="small"
                  sx={{ bgcolor: NT_TEXT, color: 'white', borderRadius: '8px', textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: NT_ACCENT }, '&.Mui-disabled': { bgcolor: 'rgba(42,52,57,0.15)', color: 'white' } }}
                >
                  {saving ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  onClick={() => setEditing(false)}
                  disabled={saving}
                  variant="text"
                  size="small"
                  sx={{ color: 'rgba(42,52,57,0.5)', textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: 'transparent', color: NT_TEXT } }}
                >
                  Cancel
                </Button>
              </Box>
            </Box>
          ) : (
            ev.body && (
              <Box sx={{
                pl: isComment ? 3 : 0,
                borderLeft: isComment ? `2px solid ${NT_ACCENT}` : 'none',
                mb: slug ? 3 : 0
              }}>
                <Typography variant="body2" sx={{ opacity: 0.65, lineHeight: 1.7, fontSize: '0.9rem', fontStyle: isComment ? 'italic' : 'normal' }}>
                  {isComment ? `"${ev.body}"` : ev.body}
                </Typography>
              </Box>
            )
          )}

          {ev.metadata?.uuid && !isComment && (
            <Box component={RouterLink} to={`/posts/${ev.metadata.uuid}`} sx={{ fontSize: '0.75rem', fontWeight: 800, color: NT_ACCENT, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>View Live</Box>
          )}

          {isMilestone && (
            <Button variant="contained" size="small" sx={{ bgcolor: NT_TEXT, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.65rem', py: 1, px: 2.5, borderRadius: '8px' }}>Generate Analysis</Button>
          )}
        </Box>
      </Box>
    </motion.div>
  );
};

const RightStatCard = ({ children, accent }: { children: React.ReactNode; accent?: boolean }) => (
  <motion.div variants={itemVariantsRight}>
    <Box sx={{ bgcolor: 'white', borderRadius: '24px', p: 3, border: '1px solid rgba(42,52,57,0.02)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', position: 'relative', overflow: 'hidden', ...(accent ? { borderLeft: `4px solid ${NT_ACCENT}` } : {}) }}>
      {children}
    </Box>
  </motion.div>
);

export default function AuthorDashboard() {
  const { id } = useParams();
  const { data: me } = useGetMeQuery({});
  // Dashboard reads the fresh, no-count stats endpoint and refetches on mount so
  // a view you just made on the review page shows up here immediately.
  const { data: postDetail, isLoading: isPostLoading } = useGetPostStatsQuery(id, {
    skip: !id,
    refetchOnMountOrArgChange: true,
  });
  
  const { data: analytics } = useGetAnalyticsQuery({}, { refetchOnMountOrArgChange: true });
  const { data: activityData, isLoading: isActivityLoading } = useGetActivityQuery({}, { refetchOnMountOrArgChange: true });

  const [commentPage, setCommentPage] = useState(1);
  const [allComments, setAllComments] = useState<any[]>([]);
  const [displayLimit, setDisplayLimit] = useState(10);
  const [newComment, setNewComment] = useState('');
  const [createComment, { isLoading: isCreatingComment }] = useCreateCommentMutation();
  const [updateComment] = useUpdateCommentMutation();
  const [showTop, setShowTop] = useState(false);
  const seventhCommentRef = useRef<HTMLDivElement | null>(null);

  // Show "back to top" exactly once the user has scrolled past the 7th comment
  // (its top edge above the viewport). The ref only exists when ≥7 comments are
  // rendered; the dashboard scrolls on the window (no inner scroll container).
  useEffect(() => {
    const onScroll = () => {
      const el = seventhCommentRef.current;
      setShowTop(!!el && el.getBoundingClientRect().top < 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [allComments.length]);

  // 1. Identify Active Post
  const activePost = postDetail;

  // 2. Fetch comments for active post — poll for near real-time sync across users.
  const { data: commentsData, isLoading: isCommentsLoading } = useGetCommentsQuery(
    { slug: activePost?.slug || '', page: commentPage },
    { skip: !activePost, pollingInterval: 5000, skipPollingIfUnfocused: true }
  );

  // Reset + accumulate the comment list in ONE effect, keyed on the post id, so
  // they can't race. Previously these were two effects (accumulate, then reset);
  // navigating in from the Library with the post + comments already cached ran
  // both on mount in declaration order — accumulate filled the list, then reset
  // wiped it — so comments only reappeared on the next poll. (A hard refresh
  // hid the bug: with an empty cache the data arrives after mount, so accumulate
  // runs after reset.) Keying on the post id makes the first load seed the list
  // and later updates (polls, Load More) append.
  const commentsPostRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    const postId = activePost?.id;
    if (!postId) return;

    if (commentsPostRef.current !== postId) {
      // First load for this post — start fresh, seeding with whatever is cached.
      commentsPostRef.current = postId;
      setCommentPage(1);
      setDisplayLimit(10);
      setAllComments(commentsData?.results ? [...commentsData.results] : []);
      return;
    }

    // Same post: append new comments AND merge edits to existing ones (so an
    // edit made by anyone syncs in on the next poll). Preserve order; return the
    // same array when nothing changed so React skips a re-render.
    if (commentsData?.results) {
      setAllComments(prev => {
        const incomingById = new Map<number, any>(commentsData.results.map((c: any) => [c.id, c]));
        let changed = false;
        const merged = prev.map((c: any) => {
          const fresh = incomingById.get(c.id);
          if (fresh && (fresh.body !== c.body || fresh.moderation_status !== c.moderation_status)) {
            changed = true;
            return { ...c, ...fresh };
          }
          return c;
        });
        const existingIds = new Set(prev.map((c: any) => c.id));
        const added = commentsData.results.filter((c: any) => !existingIds.has(c.id));
        if (added.length) changed = true;
        return changed ? [...merged, ...added] : prev;
      });
    }
  }, [commentsData, activePost?.id]);

  const handleLoadMore = () => {
    const nextLimit = displayLimit + 10;
    setDisplayLimit(nextLimit);
    // Fetch the next server page once we've revealed everything loaded so far.
    if (nextLimit > allComments.length && commentsData?.next) {
      setCommentPage(prev => prev + 1);
    }
  };

  // How many comments are still hidden behind "Load more" (for the button label).
  const shownComments = Math.min(displayLimit, allComments.length);
  const remainingComments = Math.max(0, (commentsData?.count ?? allComments.length) - shownComments);

  const handleCreateComment = async () => {
    const body = newComment.trim();
    if (!body || !activePost?.slug) return;
    try {
      const created = await createComment({ slug: activePost.slug, body }).unwrap();
      setNewComment('');
      if (created?.moderation_status === 'approved') {
        toast.success('Comment added', { description: 'Your comment is now on the timeline.' });
      } else {
        toast.success('Comment submitted', { description: 'It will appear once approved.' });
      }
    } catch {
      toast.error('Could not add comment', { description: 'Please try again in a moment.' });
    }
  };

  const handleEditComment = async (commentUuid: string, body: string) => {
    try {
      const updated = await updateComment({ id: commentUuid, body }).unwrap();
      // Optimistically reflect the edit in the local timeline straight away.
      setAllComments(prev => prev.map(c => (c.uuid === commentUuid ? { ...c, ...updated } : c)));
      toast.success('Comment updated');
    } catch {
      toast.error('Could not update comment', { description: 'Please try again in a moment.' });
      throw new Error('update-failed'); // keep the inline editor open for retry
    }
  };

  const filteredActivity = useMemo(() => {
    let items = activityData?.results || [];
    if (id) {
      // Focused on one post: the route carries the post id, but the activity
      // feed keys events by slug — so match against the loaded post's slug.
      const postSlug = activePost?.slug;
      items = postSlug
        ? items.filter((ev: any) => ev.metadata?.slug === postSlug || ev.metadata?.post_slug === postSlug)
        : [];
    }
    return items;
  }, [activityData, id, activePost?.slug]);

  const milestones = useMemo(() => {
    return filteredActivity.filter((ev: any) => ev.type === 'milestone') || [];
  }, [filteredActivity]);

  const fmt = (n?: number) => (n ?? 0).toLocaleString();
  const delta = (n?: number) => `${(n ?? 0) >= 0 ? '+' : ''}${n ?? 0}%`;
  const reach = analytics?.audience_reach ?? [];

  const navItems = [
    { icon: LayoutDashboard, label: 'Overview', active: true },
    { icon: FileText, label: 'Library' },
    { icon: MessageSquare, label: 'Comments' },
  ];

  return (
    <Box sx={{ bgcolor: NT_BG, minHeight: 'calc(100vh - 80px)', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '80px 1fr', lg: '80px 1fr 420px' } }}>
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
          <Tooltip key={label} title={label} placement="right">
            <Box
              component={motion.div}
              variants={itemVariantsLeft}
              sx={{
                width: 48,
                height: 48,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                bgcolor: active ? NT_ACCENT : 'transparent',
                color: active ? 'white' : 'rgba(42,52,57,0.35)',
                boxShadow: active ? `0 8px 24px rgba(58,168,193,0.3)` : 'none',
                transition: 'all 0.2s',
                '&:hover': active ? {} : { bgcolor: NT_BG, color: NT_ACCENT, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }
              }}
            >
              <Icon size={24} strokeWidth={2.5} />
            </Box>
          </Tooltip>
        ))}
        <Box component={motion.div} variants={itemVariantsLeft} sx={{ mt: 'auto' }}>
          <Avatar
            src={me?.avatar || undefined}
            sx={{ width: 40, height: 40, border: '2px solid white', boxShadow: '0 0 0 1px rgba(42,52,57,0.1)', fontWeight: 700 }}
          >{(me?.username || '?').charAt(0).toUpperCase()}</Avatar>
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
            <Typography variant="h3" sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 900, letterSpacing: '-0.04em', mb: 1, color: NT_TEXT }}>
              {id ? 'Performance Analysis' : 'Author Dashboard'}
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.5, fontWeight: 500 }}>
              {id ? (isPostLoading ? 'Synchronizing metrics...' : `Protocol: ${activePost?.title}`) : `Welcome back, ${me?.username || 'Erik'}. Here is your editorial pulse for today.`}
            </Typography>
          </Box>
          <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgba(42,52,57,0.3)', textTransform: 'uppercase', letterSpacing: '0.25em', display: { xs: 'none', md: 'block' } }}>
            Updated: Today, {format(new Date(), 'HH:mm')}
          </Typography>
        </motion.header>

        <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.35em', color: 'rgba(42,52,57,0.25)', mb: 4 }}>
          {id ? 'Post Activity // Focused Spine' : 'System Activity // Proportional Spine'}
        </Typography>

        {/* Timeline (real activity feed) */}
        <Box
          component={motion.div}
          initial="hidden"
          animate="visible"
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
              background: `linear-gradient(to bottom, ${NT_TEXT} 0%, rgba(42, 52, 57, 0.05) 100%)`,
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

                {/* 1. The Active Post (Main subject) */}
                {activePost && (
                  <ActivityCard 
                    ev={{
                      id: `active-post-${activePost.id}`,
                      type: 'publish',
                      title: activePost.title,
                      body: activePost.excerpt,
                      created_at: activePost.created_at,
                      metadata: { slug: activePost.slug, uuid: activePost.uuid }
                    }} 
                  />
                )}

                {/* 2. Comments for this post — author + status reflect the real record */}
                {allComments.slice(0, displayLimit).map((comment: any, idx: number) => {
                  const status = comment.moderation_status;
                  const type =
                    status === 'approved' ? 'comment_approved'
                    : status === 'rejected' ? 'comment_rejected'
                    : 'comment_pending';
                  const title =
                    status === 'approved' ? 'Comment Approved'
                    : status === 'rejected' ? 'Comment Rejected'
                    : 'New Comment';
                  return (
                    <ActivityCard
                      key={comment.id}
                      ev={{
                        id: comment.id,
                        type,
                        title,
                        body: comment.body,
                        created_at: comment.created_at,
                        metadata: {
                          author_name: comment.author?.username,
                          author_avatar: comment.author?.avatar,
                        },
                      }}
                      canEdit={!!me?.id && comment.author?.id === me.id}
                      onSave={(body) => handleEditComment(comment.uuid, body)}
                      cardRef={idx === 6 ? seventhCommentRef : undefined}
                    />
                  );
                })}

                {/* 3. Load more — shown only when the post has more than the 10 visible comments */}
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
                        '&:hover': { color: NT_ACCENT, bgcolor: 'transparent' }
                      }}
                    >
                      {isCommentsLoading
                        ? 'Loading…'
                        : `Load more comments${remainingComments ? ` (${remainingComments})` : ''}`}
                    </Button>
                  </Box>
                )}

                {/* 4. Persistent composer — any viewer can add a comment, always at the bottom */}
                {id && activePost && (
                  <motion.div variants={activityVariants} initial="hidden" animate="visible">
                    <Box sx={{ position: 'relative', pl: '4rem', pb: 5 }}>
                      <SpineDot color={NT_ACCENT} ring="rgba(58,168,193,0.1)" />
                      <Box sx={{ bgcolor: 'white', borderRadius: '24px', p: 4, border: '1px solid rgba(42,52,57,0.02)', boxShadow: '0 2px 4px rgba(0,0,0,0.03), 0 8px 24px rgba(0,0,0,0.04)' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                          <MessageSquare size={18} color={NT_ACCENT} />
                          <Typography sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 700, fontSize: '1.05rem', color: NT_TEXT }}>
                            {allComments.length === 0 ? 'No comments yet' : 'Add to the discussion'}
                          </Typography>
                        </Box>
                        {activePost.status === 'published' ? (
                          <>
                            {allComments.length === 0 && (
                              <Typography variant="body2" sx={{ opacity: 0.6, mb: 3, fontSize: '0.9rem', lineHeight: 1.7 }}>
                                Be the first to start the discussion on this post.
                              </Typography>
                            )}
                            <Box sx={{ display: 'flex', gap: 1.5 }}>
                              <InputBase
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleCreateComment();
                                  }
                                }}
                                placeholder="Add a comment..."
                                sx={{ flex: 1, bgcolor: NT_BG, borderRadius: '10px', px: 2, py: 1, fontSize: '0.85rem', border: '1px solid rgba(42,52,57,0.05)' }}
                              />
                              <Button
                                onClick={handleCreateComment}
                                disabled={isCreatingComment || !newComment.trim()}
                                variant="contained"
                                startIcon={<Send size={16} />}
                                sx={{ bgcolor: NT_TEXT, color: 'white', borderRadius: '10px', textTransform: 'none', fontWeight: 700, px: 2.5, whiteSpace: 'nowrap', '&:hover': { bgcolor: NT_ACCENT }, '&.Mui-disabled': { bgcolor: 'rgba(42,52,57,0.15)', color: 'white' } }}
                              >
                                {isCreatingComment ? 'Posting...' : 'Comment'}
                              </Button>
                            </Box>
                          </>
                        ) : (
                          <Typography variant="body2" sx={{ opacity: 0.6, fontSize: '0.9rem', lineHeight: 1.7 }}>
                            Comments open once this post is published.
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </motion.div>
                )}

                {!activePost && !milestones.length && (
                  <Box sx={{ pl: '4rem', py: 12, opacity: 0.35, textAlign: 'center' }}>
                    <Typography sx={{ fontStyle: 'italic', fontSize: '1.1rem' }}>No activity yet — publish a post to get started.</Typography>
                  </Box>
                )}
              </>
            )}
          </AnimatePresence>
        </Box>

        {!id && (
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
                bgcolor: NT_ACCENT,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                fontSize: '0.75rem',
                boxShadow: `0 8px 24px ${NT_ACCENT}40`,
                transition: 'all 0.4s',
                position: 'relative',
                overflow: 'hidden',
                '&::after': { content: '""', position: 'absolute', inset: 0, bgcolor: NT_TEXT, opacity: 0, transition: 'opacity 0.3s' },
                '&:hover::after': { opacity: 1 },
                '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 12px 32px rgba(42,52,57,0.2)' },
                '& span': { position: 'relative', zIndex: 1 }
              }}
            >
              <span>New Post</span>
            </Button>
          </Box>
        )}
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
              src={me?.avatar || undefined}
              sx={{ width: 56, height: 56, border: '3px solid white', boxShadow: `0 0 0 2px ${NT_ACCENT}, 0 8px 20px rgba(0,0,0,0.1)`, fontWeight: 700 }}
            >{(me?.username || '?').charAt(0).toUpperCase()}</Avatar>
            <Box>
              <Typography sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 800, fontSize: '1rem', color: NT_TEXT }}>{me?.username || ''}</Typography>
              <Typography sx={{ fontSize: '0.75rem', opacity: 0.45, fontWeight: 500, fontStyle: 'italic' }}>{me?.title || 'Author'}</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            {(() => {
              const rankValue = analytics?.rank ? `#${String(analytics.rank).padStart(2, '0')}` : '—';
              const rankSub = analytics?.rank_total ? `Top ${analytics.rank_percentile}%` : undefined;
              const trustTip = analytics?.trust_breakdown
                ? Object.entries(analytics.trust_breakdown)
                    .sort((a: any, b: any) => b[1] - a[1])
                    .map(([k, v]) => `${k.replace(/_/g, ' ')} — ${v} pts`)
                    .join('\n')
                : '';
              const tiles = [
                { label: 'Rank', value: rankValue, sub: rankSub, tip: '' },
                { label: 'Trust', value: analytics?.trust_score ?? '—', sub: undefined as string | undefined, tip: trustTip },
              ];
              return tiles.map((s) => (
                <Tooltip
                  key={s.label}
                  arrow
                  placement="top"
                  disableHoverListener={!s.tip}
                  title={s.tip ? <Box sx={{ whiteSpace: 'pre-line', fontSize: '0.7rem', lineHeight: 1.6, py: 0.5 }}>{s.tip}</Box> : ''}
                >
                  <Box sx={{ p: 2, bgcolor: NT_BG, borderRadius: '12px', textAlign: 'center', border: '1px solid rgba(42,52,57,0.03)', cursor: s.tip ? 'help' : 'default' }}>
                    <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', opacity: 0.3, mb: 0.5 }}>{s.label}</Typography>
                    <Typography sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 800, fontSize: '1.25rem' }}>{s.value}</Typography>
                    {s.sub && <Typography sx={{ fontSize: '0.55rem', fontWeight: 800, opacity: 0.45, mt: 0.25, letterSpacing: '0.08em', textTransform: 'uppercase', color: NT_ACCENT }}>{s.sub}</Typography>}
                  </Box>
                </Tooltip>
              ));
            })()}
          </Box>
        </RightStatCard>

        {/* Performance */}
        <RightStatCard accent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
            <Typography sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 800, fontSize: '0.9rem', color: NT_TEXT }}>Post Performance</Typography>
            <TrendingUp size={18} color={NT_ACCENT} />
          </Box>
          <Stack spacing={4}>
            {[
              { 
                label: 'Total Views', 
                value: fmt(activePost?.view_count), 
                trendValue: 0 
              },
              { 
                label: 'Engagement', 
                value: `${activePost?.comment_count || 0}`, 
                trendValue: 0 
              },
            ].map((s) => {
              const up = s.trendValue >= 0;
              const hasTrend = s.trendValue !== 0;
              return (
                <Box key={s.label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <Box>
                    <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, opacity: 0.3, textTransform: 'uppercase', letterSpacing: '0.2em', mb: 0.5 }}>{s.label}</Typography>
                    <Typography sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 900, fontSize: '1.75rem', letterSpacing: '-0.04em', color: NT_TEXT }}>{s.value}</Typography>
                  </Box>
                  {hasTrend && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: up ? '#10b981' : '#f43f5e', pb: 0.5 }}>
                      {up ? <ArrowUpRight size={14} strokeWidth={3} /> : <ArrowDownRight size={14} strokeWidth={3} />}
                      <Typography sx={{ fontSize: '0.75rem', fontWeight: 800 }}>{delta(s.trendValue)}</Typography>
                    </Box>
                  )}
                </Box>
              );
            })}
          </Stack>
        </RightStatCard>

        {/* Momentum — weekly view trend (replaces the static per-category reach) */}
        <RightStatCard>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 3 }}>
            <Box>
              <Typography sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.25em', opacity: 0.4 }}>Momentum</Typography>
              <Typography sx={{ fontSize: '0.7rem', color: 'rgba(42,52,57,0.4)', mt: 0.5 }}>Weekly views · last 8 weeks</Typography>
            </Box>
            {reach.length > 0 && analytics?.momentum_delta_pct != null && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0, color: analytics.momentum_delta_pct >= 0 ? '#10b981' : '#f43f5e' }}>
                {analytics.momentum_delta_pct >= 0 ? <ArrowUpRight size={14} strokeWidth={3} /> : <ArrowDownRight size={14} strokeWidth={3} />}
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 800 }}>{delta(analytics.momentum_delta_pct)}</Typography>
              </Box>
            )}
          </Box>

          {reach.length === 0 ? (
            <Typography sx={{ fontSize: '0.75rem', opacity: 0.4, fontStyle: 'italic', py: 1 }}>
              Not enough activity yet to show momentum — publish a post and views will trend here.
            </Typography>
          ) : (
            <Stack spacing={2.5}>
              {reach.map((r: any, i: number) => (
                <Box key={r.label}>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 1, gap: 1 }}>
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(42,52,57,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.label}
                    </Typography>
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 800, color: NT_TEXT, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                      {r.pct}%
                    </Typography>
                  </Box>
                  <Box sx={{ height: 8, bgcolor: '#EEF1F6', borderRadius: '999px', overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${r.pct}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, ease: 'circOut', delay: i * 0.08 }}
                      style={{ height: '100%', borderRadius: '999px', background: `linear-gradient(90deg, ${NT_ACCENT}, #5fbcd1)` }}
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
          sx={{ bgcolor: NT_TEXT, borderRadius: '24px', p: 4, color: 'white', position: 'relative', overflow: 'hidden', boxShadow: '0 12px 32px rgba(42,52,57,0.3)', mt: 'auto' }}
        >
          <TrendingUp size={80} style={{ position: 'absolute', right: -12, bottom: -12, opacity: 0.1 }} />
          <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.3em', opacity: 0.5, mb: 2, fontFamily: '"Inter", sans-serif' }}>Editorial Insight</Typography>
          <Typography sx={{ fontSize: '0.85rem', lineHeight: 1.7, opacity: 0.9, mb: 0, fontWeight: 500 }}>
            {id ? 'Engagement for this post is outpacing global benchmarks by 12%. Maintain metadata rigor.' : 'Users are engaging with "Read Time" badges 40% more frequently this week. Consider optimizing metadata.'}
          </Typography>
        </Box>
      </Box>

      {/* Back-to-top — icon only, anchored to the main column so it clears the right sidebar */}
      {id && showTop && (
        <Button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Back to top"
          title="Back to top"
          sx={{
            position: 'fixed',
            bottom: { xs: 24, lg: 40 },
            right: { xs: 24, lg: 'calc(420px + 40px)' },
            zIndex: 1300,
            minWidth: 0,
            width: 48,
            height: 48,
            p: 0,
            bgcolor: NT_TEXT,
            color: 'white',
            borderRadius: '50%',
            boxShadow: '0 8px 24px rgba(42,52,57,0.3)',
            '&:hover': { bgcolor: NT_ACCENT },
          }}
        >
          <ChevronUp size={20} />
        </Button>
      )}
    </Box>
  );
}
