import { useState } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import {
  useGetPostBySlugQuery,
  useGetCommentsQuery,
  useCreateCommentMutation,
  useSubscribeMutation,
} from '../store/apiSlice';
import { Box, Container, Typography, Avatar, Chip, Stack, Skeleton, Button, TextField, Tooltip } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { ArrowLeft, Share2, Bookmark, ArrowRight, UserPlus, Send, ShieldCheck } from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: 'easeOut' } }
};

const SPEC_INDEX = [
  'Idempotency & Request Validation',
  'Asynchronous Background Dispatch',
  'Aggressive Edge Layer Caching',
];

const RadialChart = ({ minutes }: { minutes: number }) => {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const max = 20;
  const fraction = Math.min(minutes / max, 1);
  const offset = circumference * (1 - fraction);

  return (
    <Box sx={{ position: 'relative', width: 224, height: 224, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg
        viewBox="0 0 100 100"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', transform: 'rotate(-90deg)' }}
      >
        <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(42,52,57,0.08)" strokeWidth="6" />
        <motion.circle
          cx="50" cy="50" r={radius}
          fill="none"
          stroke="#3AA8C1"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.8, ease: 'easeInOut', delay: 0.5 }}
        />
      </svg>
      <Box sx={{ textAlign: 'center', zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <Typography sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 900, fontSize: '3.5rem', lineHeight: 1, color: '#2A3439' }}>
            {minutes}
          </Typography>
          <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5em', opacity: 0.3 }}>
            Minutes
          </Typography>
        </motion.div>
      </Box>
    </Box>
  );
};

export default function PostDetail() {
  const { slug } = useParams();
  const { data: post, isLoading } = useGetPostBySlugQuery(slug);
  const { data: commentsData } = useGetCommentsQuery({ slug }, { skip: !slug });
  const [createComment, { isLoading: posting }] = useCreateCommentMutation();
  const [subscribe, { isSuccess: subscribed }] = useSubscribeMutation();
  const token = useSelector((s: RootState) => s.auth.token);
  const [commentBody, setCommentBody] = useState('');

  const submitComment = async () => {
    if (!commentBody.trim() || !slug) return;
    try {
      await createComment({ slug, body: commentBody }).unwrap();
      setCommentBody('');
    } catch (err) {
      console.error('Failed to post comment:', err);
    }
  };

  if (isLoading) return (
    <Box sx={{ bgcolor: '#F8F8FF', minHeight: '100vh', pt: 8 }}>
      <Container maxWidth="lg">
        <Stack spacing={4}>
          <Skeleton variant="rectangular" width="100%" height={480} sx={{ borderRadius: '40px' }} />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '7fr 5fr' }, gap: 5 }}>
            <Stack spacing={3}>
              <Skeleton variant="rectangular" height={120} sx={{ borderRadius: '24px' }} />
              <Skeleton width="100%" height={24} />
              <Skeleton width="90%" height={24} />
              <Skeleton width="95%" height={24} />
            </Stack>
            <Skeleton variant="rectangular" height={360} sx={{ borderRadius: '24px' }} />
          </Box>
        </Stack>
      </Container>
    </Box>
  );

  if (!post) return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', bgcolor: '#F8F8FF' }}>
      <Stack alignItems="center" spacing={2}>
        <ShieldCheck size={48} color="rgba(42,52,57,0.1)" />
        <Typography variant="h5" sx={{ fontWeight: 700, color: 'rgba(42,52,57,0.3)' }}>Post not found or restricted.</Typography>
        <Button component={RouterLink} to="/" sx={{ color: '#3AA8C1', fontWeight: 800 }}>Return to Safety</Button>
      </Stack>
    </Box>
  );

  const readMinutes = post.read_time_minutes || 12;

  return (
    <Box component={motion.div} initial="hidden" animate="visible" variants={containerVariants} sx={{ bgcolor: '#F8F8FF', minHeight: '100vh' }}>
      {/* Hero with full-width image */}
      <Box sx={{ pt: 4, px: { xs: 2, md: 4 }, mb: 6 }}>
        <Container maxWidth="lg">
          <motion.div variants={itemVariants}>
            <Box
              component={RouterLink}
              to="/"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1.5,
                textDecoration: 'none',
                color: 'rgba(42,52,57,0.4)',
                mb: 3,
                fontSize: '0.7rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.25em',
                transition: 'color 0.2s',
                '&:hover': { color: '#3AA8C1' },
              }}
            >
              <ArrowLeft size={14} strokeWidth={3} />
              Back to Insights
            </Box>
          </motion.div>

          {/* Hero Image */}
          <motion.div variants={itemVariants}>
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                height: { xs: 320, md: 520 },
                borderRadius: '40px',
                overflow: 'hidden',
                boxShadow: '0 40px 80px -20px rgba(42,52,57,0.15)',
              }}
            >
              <Box
                component="img"
                src="https://images.unsplash.com/photo-1548248823-ce16a73b6d49?auto=format&w=1800&q=80&fit=crop"
                alt={post.title}
                sx={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.6)' }}
              />
              <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(42,52,57,0.95) 0%, rgba(42,52,57,0.3) 50%, transparent 100%)' }} />
              <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, p: { xs: 4, md: 8 } }}>
                <Stack direction="row" spacing={1.5} sx={{ mb: 3 }}>
                  <Chip
                    label="TECH REPORT"
                    size="small"
                    sx={{ bgcolor: '#3AA8C1', color: 'white', fontWeight: 900, fontSize: '0.6rem', letterSpacing: '0.3em', borderRadius: '6px', height: 26 }}
                  />
                  <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.35em', alignSelf: 'center' }}>
                    V. 40.2 / {post.category?.name?.toUpperCase() || 'ARCHITECTURE'}
                  </Typography>
                </Stack>
                <Typography
                  variant="h1"
                  sx={{
                    fontFamily: '"Inter", sans-serif',
                    fontWeight: 900,
                    fontSize: { xs: '2.2rem', md: '4rem', lg: '5rem' },
                    color: 'white',
                    lineHeight: 0.9,
                    letterSpacing: '-0.05em',
                    maxWidth: '90%',
                  }}
                >
                  {post.title}
                </Typography>
              </Box>
            </Box>
          </motion.div>
        </Container>
      </Box>

      {/* Author + metadata + radial chart */}
      <Container maxWidth="lg" sx={{ mb: 10 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '7fr 5fr' }, gap: 5, alignItems: 'start' }}>
          {/* Left: Author card + metadata */}
          <Box>
            <motion.div variants={itemVariants}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  p: 4,
                  bgcolor: 'white',
                  border: '1px solid rgba(42,52,57,0.02)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.03)',
                  borderRadius: '24px',
                  mb: 5,
                }}
              >
                <Avatar
                  src={post.author.avatar || `https://i.pravatar.cc/150?u=${post.author.username}`}
                  sx={{ width: 88, height: 88, border: '4px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                />
                <Box>
                  <Typography sx={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.25em', color: '#3AA8C1', mb: 0.5 }}>
                    Lead Contributor
                  </Typography>
                  <Typography variant="h5" sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 800, mb: 0.5, color: '#2A3439' }}>
                    {post.author.username}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.45, fontWeight: 600 }}>
                    {post.author.title || 'Principal Architect, Teak Engineering'}
                  </Typography>
                </Box>
                <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Button
                    size="small"
                    variant="contained"
                    disabled={subscribed}
                    startIcon={<UserPlus size={14} strokeWidth={3} />}
                    onClick={() => subscribe({ author_id: post.author.id })}
                    sx={{ 
                      bgcolor: '#3AA8C1', 
                      borderRadius: '999px', 
                      fontSize: '0.65rem', 
                      fontWeight: 900, 
                      textTransform: 'uppercase', 
                      letterSpacing: '0.15em', 
                      px: 3, 
                      py: 1,
                      '&:hover': { bgcolor: '#2A3439' } 
                    }}
                  >
                    {subscribed ? 'Subscribed' : 'Subscribe'}
                  </Button>
                  <Tooltip title="Share Insight" arrow>
                    <Box sx={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid rgba(42,52,57,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', '&:hover': { color: '#3AA8C1', borderColor: '#3AA8C1', bgcolor: 'rgba(58,168,193,0.05)' } }}>
                      <Share2 size={18} />
                    </Box>
                  </Tooltip>
                  <Tooltip title="Bookmark for Review" arrow>
                    <Box sx={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid rgba(42,52,57,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', '&:hover': { color: '#3AA8C1', borderColor: '#3AA8C1', bgcolor: 'rgba(58,168,193,0.05)' } }}>
                      <Bookmark size={18} />
                    </Box>
                  </Tooltip>
                </Box>
              </Box>

              {/* Metadata grid */}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, pt: 4, borderTop: '1px solid rgba(42,52,57,0.1)' }}>
                {[
                  { label: 'Publication Date', value: post.published_at ? new Date(post.published_at).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Unpublished' },
                  { label: 'System Status', value: post.status === 'published' ? '● Active / Live' : '○ Draft', accent: post.status === 'published' },
                  { label: 'Security Tier', value: post.metadata?.security_tier || 'L4 - High Trust' },
                  { label: 'Repository', value: post.metadata?.repository || 'teak/core', accent: true },
                  { label: 'License', value: post.metadata?.license || 'MIT-Standard' },
                  { label: 'Compliance', value: post.metadata?.compliance || 'SOC2 / GDPR' },
                ].map((m) => (
                  <Box key={m.label} sx={{ px: 2, pb: 3, '&:nth-of-type(3n+1)': { pl: 0 } }}>
                    <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.3em', opacity: 0.25, mb: 0.5 }}>
                      {m.label}
                    </Typography>
                    <Typography sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 700, fontSize: '0.95rem', color: m.accent ? '#3AA8C1' : 'inherit' }}>
                      {m.value}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </motion.div>
          </Box>

          {/* Right: Radial chart */}
          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.5 }}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                p: 6,
                bgcolor: 'white',
                border: '1px solid rgba(42,52,57,0.05)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                borderRadius: '24px',
                minHeight: 360,
              }}
            >
              <RadialChart minutes={readMinutes} />
              <Box sx={{ mt: 4, textAlign: 'center' }}>
                <Typography variant="h6" sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 700, mb: 1 }}>
                  Detailed Reading Duration
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.55, lineHeight: 1.6, maxWidth: '28ch' }}>
                  A meticulous architectural analysis requiring focused attention to detail and system constraints.
                </Typography>
              </Box>
            </Box>
          </motion.div>
        </Box>
      </Container>

      {/* Article Content */}
      <Container maxWidth="md" sx={{ pb: 12 }}>
        <Box
          sx={{
            '& p': { fontSize: '1.05rem', lineHeight: 1.8, mb: 3, color: 'rgba(42,52,57,0.85)' },
            '& h2': { fontFamily: '"Inter", sans-serif', fontWeight: 700, fontSize: '1.75rem', mt: 6, mb: 3, letterSpacing: '-0.02em' },
            '& blockquote': { borderLeft: '4px solid #3AA8C1', pl: 3, fontStyle: 'italic', my: 4, color: 'rgba(42,52,57,0.65)' },
          }}
        >
          <Typography sx={{ fontSize: '1.2rem', fontWeight: 500, lineHeight: 1.7, color: 'rgba(42,52,57,0.85)', mb: 5 }}>
            {post.excerpt}
          </Typography>

          {post.content ? (
            <div dangerouslySetInnerHTML={{ __html: post.content }} />
          ) : (
            <>
              <Typography component="p">
                As platforms evolve into highly configurable SaaS ecosystems, the underlying database architecture must transition from static schemas to dynamic, multi-tenant capable structures without sacrificing the integrity of PostgreSQL's relational model.
              </Typography>
              <Typography component="h2">The Challenge of Config-Driven Scale</Typography>
              <Typography component="p">
                Traditional sharding techniques often fail when tenant configurations are unique and constantly shifting. At Nordic Trust, we encountered a scenario where our partner products required over 400 custom metadata fields per transaction, which standard JSONB columns handled well for storage, but struggled with during complex analytical joins across 10M+ rows.
              </Typography>
              <Box component="blockquote">
                "The goal wasn't just to store data; it was to ensure that every partner-specific configuration remained queryable at sub-millisecond speeds across any geographic shard."
              </Box>
              <Typography component="h2">Implementing the 'Teak' Pattern</Typography>
              <Typography component="p">
                The Teak pattern mirrors the lifecycle of a financial instrument: Quote → Order → Policy. By separating these concerns, we can apply specific indexing strategies to "Active" configurations while archiving "Terminal" states into cold storage.
              </Typography>
              {/* Technical Specification Index */}
              <Box sx={{ my: 8 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                  <Box sx={{ flex: 1, height: 1, bgcolor: 'rgba(42,52,57,0.1)' }} />
                  <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.3em', color: '#3AA8C1', whiteSpace: 'nowrap' }}>
                    Technical Specification Index
                  </Typography>
                  <Box sx={{ flex: 1, height: 1, bgcolor: 'rgba(42,52,57,0.1)' }} />
                </Box>
                <Stack spacing={1.5}>
                  {SPEC_INDEX.map((item, i) => (
                    <Box
                      key={item}
                      sx={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        p: 2.5, bgcolor: 'white', border: '1px solid rgba(42,52,57,0.05)',
                        borderRadius: '12px', cursor: 'pointer',
                        transition: 'border-color 0.2s',
                        '&:hover': { borderColor: 'rgba(58,168,193,0.3)', '& .spec-arrow': { color: '#3AA8C1' } },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgba(42,52,57,0.25)', fontFamily: '"Inter", monospace', minWidth: 20 }}>
                          {String(i + 1).padStart(2, '0')}
                        </Typography>
                        <Typography sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 700, fontSize: '0.875rem', color: 'rgba(42,52,57,0.8)' }}>
                          {item}
                        </Typography>
                      </Box>
                      <Box className="spec-arrow" sx={{ color: 'rgba(42,52,57,0.2)', display: 'flex', transition: 'color 0.2s' }}>
                        <ArrowRight size={16} />
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </Box>
              <Typography component="h2">Conclusion</Typography>
              <Typography component="p">
                Scaling PostgreSQL for SaaS is less about the size of the database and more about the predictability of the access patterns. By treating configurations as first-class citizens in your architecture, you move from fighting the database to letting it do what it does best: maintain relational integrity at scale.
              </Typography>
            </>
          )}
        </Box>

        {/* Tags */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 6, pt: 4, borderTop: '1px solid rgba(42,52,57,0.1)' }}>
          {(post.tags?.length > 0 ? post.tags.map((tag: any) => tag.name || tag.slug) : ['PostgreSQL', 'Fintech', 'SaaS System', 'Performance']).map((tag: string) => (
            <Chip
              key={tag}
              label={tag.toUpperCase()}
              size="small"
              sx={{
                bgcolor: 'rgba(42,52,57,0.05)', color: 'rgba(42,52,57,0.5)',
                fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.3em', borderRadius: '4px',
                '&:hover': { bgcolor: '#3AA8C1', color: 'white' },
              }}
            />
          ))}
        </Box>

        {/* Comments */}
        <Box sx={{ mt: 8 }}>
          <Typography sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.02em', mb: 3 }}>
            Discussion ({commentsData?.count ?? 0})
          </Typography>

          {token ? (
            <Box sx={{ display: 'flex', gap: 1.5, mb: 5 }}>
              <TextField
                fullWidth
                multiline
                minRows={2}
                placeholder="Add to the discussion…"
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'white', borderRadius: '12px', fontSize: '0.9rem' } }}
              />
              <Button
                variant="contained"
                disabled={posting || !commentBody.trim()}
                onClick={submitComment}
                sx={{ bgcolor: '#3AA8C1', borderRadius: '12px', px: 3, alignSelf: 'stretch', '&:hover': { bgcolor: '#2A3439' } }}
              >
                <Send size={16} />
              </Button>
            </Box>
          ) : (
            <Typography sx={{ opacity: 0.5, mb: 4, fontStyle: 'italic' }}>
              <Box component={RouterLink} to="/auth/login" sx={{ color: '#3AA8C1', fontWeight: 700 }}>Sign in</Box> to join the discussion.
            </Typography>
          )}

          <Stack spacing={2.5}>
            {(commentsData?.results || []).map((c: any) => (
              <Box key={c.id} sx={{ display: 'flex', gap: 2, p: 3, bgcolor: 'white', borderRadius: '16px', border: '1px solid rgba(42,52,57,0.05)' }}>
                <Avatar src={c.author.avatar || `https://i.pravatar.cc/100?u=${c.author.username}`} sx={{ width: 40, height: 40 }} />
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.85rem' }}>{c.author.username}</Typography>
                    <Typography sx={{ fontSize: '0.7rem', opacity: 0.35 }}>{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</Typography>
                  </Box>
                  <Typography sx={{ fontSize: '0.9rem', opacity: 0.75, lineHeight: 1.6 }}>{c.body}</Typography>
                </Box>
              </Box>
            ))}
            {commentsData?.results?.length === 0 && (
              <Typography sx={{ opacity: 0.4, fontStyle: 'italic' }}>No approved comments yet. Be the first.</Typography>
            )}
          </Stack>
        </Box>
      </Container>

      {/* Footer */}
      <Box component="footer" sx={{ bgcolor: 'white', borderTop: '1px solid rgba(42,52,57,0.05)', pt: 8, pb: 5, mt: 12 }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: { xs: 6, lg: 8 }, mb: 10 }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <Box sx={{ width: 32, height: 32, bgcolor: '#2A3439', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography sx={{ color: 'white', fontFamily: '"Inter", sans-serif', fontWeight: 900, fontSize: '0.8rem' }}>NT</Typography>
                </Box>
                <Typography sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 800, fontSize: '0.95rem', letterSpacing: '-0.02em' }}>NORDIC TRUST</Typography>
              </Box>
              <Typography sx={{ fontSize: '0.85rem', opacity: 0.5, lineHeight: 1.7, maxWidth: '26ch', mb: 4 }}>
                The global standard for institutional-grade engineering insights and secure platform architecture.
              </Typography>
              <Stack direction="row" spacing={1.5}>
                {['Twitter', 'LinkedIn', 'GitHub'].map((s) => (
                  <Box key={s} sx={{ width: 36, height: 36, border: '1px solid rgba(42,52,57,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700, color: 'rgba(42,52,57,0.4)', '&:hover': { color: '#3AA8C1', borderColor: '#3AA8C1' }, transition: 'all 0.2s' }}>
                    {s[0]}
                  </Box>
                ))}
              </Stack>
            </Box>
            {[
              { title: 'Architecture', links: ['Data Modeling', 'Microservices', 'Serverless Flows', 'Event Sourcing'] },
              { title: 'Compliance', links: ['SOC2 Readiness', 'Data Residency', 'Access Control', 'Audit Logs'] },
              { title: 'Institutional', links: ['About Nordic', 'Partner Network', 'Security Portal', 'Contact Trust'] },
            ].map(({ title, links }) => (
              <Box key={title}>
                <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', mb: 3 }}>{title}</Typography>
                <Stack spacing={2.5}>
                  {links.map((l) => (
                    <Box key={l} component="a" href="#" sx={{ fontSize: '0.875rem', opacity: 0.5, textDecoration: 'none', color: 'inherit', '&:hover': { color: '#3AA8C1', opacity: 1 }, transition: 'all 0.2s' }}>{l}</Box>
                  ))}
                </Stack>
              </Box>
            ))}
          </Box>
          <Box sx={{ pt: 4, borderTop: '1px solid rgba(42,52,57,0.05)', display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
            <Typography sx={{ fontSize: '0.65rem', opacity: 0.35, fontWeight: 600 }}>© 2026 Nordic Trust Engineering. All rights reserved. Registered for Institutional Use.</Typography>
            <Stack direction="row" spacing={4}>
              {['Privacy Policy', 'Terms of Service', 'Cookie Settings'].map((l) => (
                <Box key={l} component="a" href="#" sx={{ fontSize: '0.65rem', opacity: 0.35, textDecoration: 'none', color: 'inherit', '&:hover': { opacity: 0.7 } }}>{l}</Box>
              ))}
            </Stack>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
