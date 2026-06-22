import { useMemo } from 'react';
import { Box, Typography, Button, Stack } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useGetPostsQuery, type LibraryPost } from '../store/apiSlice';
import { ArrowUpRight, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const NT_BG = '#F8F8FF';
const NT_TEXT = '#2A3439';
const NT_ACCENT = '#3AA8C1';
const NT_BORDER = 'rgba(42,52,57,0.1)';
const NT_BORDER_LIGHT = 'rgba(42,52,57,0.04)';

// ─── Components ───────────────────────────────────────────────────────────────

const TrendingItem = ({ post, index }: { post: LibraryPost; index: number }) => (
  <Box
    component={RouterLink}
    to={`/posts/${post.slug}`}
    sx={{
      display: 'flex',
      flexDirection: { xs: 'column', md: 'row' },
      alignItems: { md: 'center' },
      justifyContent: 'space-between',
      py: { xs: 8, md: 12, lg: 14 }, 
      px: { xs: 2, md: 4 },
      mx: { xs: -2, md: -4 },
      borderRadius: '12px',
      position: 'relative',
      textDecoration: 'none',
      color: 'inherit',
      transition: 'all 0.5s cubic-bezier(0.23, 1, 0.32, 1)',
      '&:hover': { bgcolor: 'rgba(255,255,255,0.7)', transform: 'translateY(-4px)', boxShadow: '0 24px 48px rgba(42,52,57,0.04)' },
      '&:hover .bg-num': { color: NT_ACCENT, opacity: 0.15 },
      '&:hover .title': { color: NT_ACCENT },
    }}
  >
    <Typography
      className="bg-num"
      sx={{
        position: 'absolute',
        left: { xs: 8, md: 16 },
        top: '50%',
        transform: 'translateY(-50%)',
        fontSize: { xs: '4rem', md: '6rem', lg: '8rem' }, // Matched design
        fontWeight: 900,
        color: NT_TEXT,
        opacity: 0.1,
        pointerEvents: 'none',
        fontFamily: '"Inter", sans-serif',
        transition: 'all 0.7s ease',
      }}
    >
      {String(index + 1).padStart(2, '0')}
    </Typography>

    <Box sx={{ position: 'relative', zIndex: 10, pl: { xs: 12, md: 24 } }}>
      <Typography sx={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.25em', opacity: 0.6, mb: 1.5 }}>
        {post.category?.name || 'Policy Research'}
      </Typography>
      <Typography
        className="title"
        sx={{
          fontFamily: '"Inter", sans-serif',
          fontSize: { xs: '1.25rem', md: '1.5rem', lg: '1.875rem' }, // Matched text-2xl lg:text-3xl
          fontWeight: 700,
          maxWidth: '672px', 
          lineHeight: 1.25,
          letterSpacing: '-0.02em',
          transition: 'color 0.3s',
        }}
      >
        {post.title}
      </Typography>
    </Box>

    <Box sx={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', mt: { xs: 4, md: 0 }, pr: { xs: 2, md: 0 } }}>
      <Stack direction="row" spacing={1.5} sx={{ color: NT_ACCENT, alignItems: 'center', mb: 1 }}>
        <MessageCircle size={18} strokeWidth={2.5} />
        <Typography sx={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {post.comment_count} Comments
        </Typography>
      </Stack>
      <Typography sx={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.25em', opacity: 0.4 }}>
        {index === 0 ? 'Active Discussion' : index < 3 ? 'Trending' : 'New Insights'}
      </Typography>
    </Box>
  </Box>
);

const ActivityRow = ({ post }: { post: LibraryPost }) => (
  <Box
    component={RouterLink}
    to={`/posts/${post.slug}`}
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      py: 10, 
      px: 8,
      bgcolor: NT_BG,
      transition: 'all 0.4s cubic-bezier(0.23, 1, 0.32, 1)',
      textDecoration: 'none',
      color: 'inherit',
      '&:hover': { bgcolor: 'white' },
      '&:hover .dot': { transform: 'scale(1.5)', bgcolor: NT_ACCENT },
      '&:hover .title': { color: NT_ACCENT },
      '&:hover .meta': { opacity: 1 },
    }}
  >
    <Box
      className="dot"
      sx={{
        width: 10,
        height: 10,
        borderRadius: '50%',
        bgcolor: 'rgba(42,52,57,0.15)',
        flexShrink: 0,
        transition: 'all 0.4s',
      }}
    />
    <Box sx={{ flex: 1, display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '1.5fr 1fr' }, gap: 8, alignItems: 'center' }}>
      <Box>
        <Typography sx={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.25em', opacity: 0.6, mb: 1.5 }}>
          {post.category?.name || 'Technical'}
        </Typography>
        <Typography className="title" sx={{ fontFamily: '"Inter", sans-serif', fontSize: '1.25rem', fontWeight: 700, transition: 'color 0.2s', mb: 1.5, letterSpacing: '-0.025em' }}>
          {post.title}
        </Typography>
        <Typography sx={{ fontSize: '0.875rem', opacity: 0.6, maxWidth: '576px', lineHeight: 1.5, fontWeight: 500 }}>
          {post.excerpt}
        </Typography>
      </Box>
      <Box className="meta" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.25em', opacity: 0.4, transition: 'opacity 0.3s' }}>
        <span>{new Date(post.published_at || post.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}</span>
        <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: NT_TEXT }} />
        <span>{post.read_time_minutes || '8'} MIN READ</span>
      </Box>
    </Box>
  </Box>
);

export default function HomeFeed() {
  const { data: trendingData } = useGetPostsQuery({ sort: 'comments', page_size: 5 });
  const trendingItems: LibraryPost[] = trendingData?.results ?? [];

  const { data: streamData } = useGetPostsQuery({ page_size: 24 });
  const streamItems: LibraryPost[] = streamData?.results ?? [];

  const groupedItems = useMemo(() => {
    const groups: Record<string, LibraryPost[]> = {};
    streamItems.forEach((post) => {
      const catName = post.category?.name || 'Engineering';
      if (!groups[catName]) groups[catName] = [];
      groups[catName].push(post);
    });
    return groups;
  }, [streamItems]);

  const activeCategories = Object.keys(groupedItems);

  return (
    <Box sx={{ bgcolor: NT_BG, color: NT_TEXT, minHeight: '100vh', overflowX: 'hidden' }}>
      {/* ─── Hero Section ────────────────────────────────────────────────────── */}
      <Box 
        component="header" 
        sx={{ 
          minHeight: { xs: 'auto', md: 'calc(100vh - 72px)' }, 
          display: 'flex', 
          alignItems: 'center',
          pt: { xs: 8, md: 0 }, 
          pb: { xs: 8, md: 0 }, 
          px: { xs: 4, md: '10vw' },
          overflow: 'hidden'
        }}
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.2fr 1fr' }, gap: { xs: 6, lg: 12 }, alignItems: 'center', width: '100%' }}>
          <motion.div initial={{ opacity: 0, y: 35 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1] }}>
            <Stack direction="row" spacing={2.5} sx={{ mb: { xs: 3, md: 4 }, alignItems: 'center', opacity: 0.6 }}>
              <Box sx={{ width: 32, height: 1, bgcolor: NT_TEXT }} />
              <Typography sx={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.25em' }}>Technical Rigor / Q2 2026</Typography>
            </Stack>
            <Typography
              variant="h1"
              sx={{
                fontFamily: '"Inter", sans-serif',
                fontSize: { xs: '2.5rem', md: '4rem', lg: '5rem', xl: '6.5rem' }, 
                fontWeight: 900,
                lineHeight: 0.9,
                letterSpacing: '-0.05em',
                mb: { xs: 3, md: 4 },
              }}
            >
              Precision <br /> Infrastructure <br /> Research.
            </Typography>
            <Typography sx={{ fontSize: { xs: '0.95rem', md: '1.05rem' }, opacity: 0.8, lineHeight: 1.55, maxWidth: '500px', mb: { xs: 4, md: 6 }, fontWeight: 500 }}>
              Architecting resilient foundations for global fintech. We explore the intersection of high-velocity capital flow and cryptographic security paradigms.
            </Typography>
            <Button
              onClick={() => document.getElementById('trending')?.scrollIntoView({ behavior: 'smooth' })}
              sx={{
                display: 'flex', alignItems: 'center', gap: 3, p: 0, color: 'inherit', textTransform: 'none',
                '&:hover .arrow-circle': { bgcolor: NT_TEXT, color: '#F8F8FF', transform: 'rotate(45deg)' },
                '&:hover .btn-text': { borderColor: NT_ACCENT, color: NT_ACCENT },
              }}
            >
              <Box
                className="arrow-circle"
                sx={{
                  width: { xs: 44, md: 48 }, height: { xs: 44, md: 48 }, borderRadius: '50%', border: `1px solid rgba(42,52,57,0.1)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.5s cubic-bezier(0.23, 1, 0.32, 1)',
                }}
              >
                <ArrowUpRight size={18} />
              </Box>
              <Typography className="btn-text" sx={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', borderBottom: `1px solid rgba(42,52,57,0.1)`, pb: 0.5, transition: 'all 0.4s' }}>
                Latest Insights
              </Typography>
            </Button>
          </motion.div>

          <Box sx={{ position: 'relative', display: { xs: 'none', lg: 'block' } }}>
            <motion.div initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.8, ease: 'easeOut' }}>
              <Box sx={{ aspectRatio: '1.2/1', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(42,52,57,0.1)' }}>
                <Box component="img" src="https://images.unsplash.com/photo-1483366774565-c783b9f70e2c?auto=format&w=1200&q=80&fit=crop" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </Box>
            </motion.div>
          </Box>
        </Box>
      </Box>

      {/* ─── Most Discussed Section ─────────────────────────────────────────── */}
      <Box id="trending" sx={{ py: 16, px: { xs: 4, md: '10vw' }, borderTop: `1px solid ${NT_BORDER}` }}>
        <Box sx={{ mb: 8 }}>
          <Stack direction="row" spacing={3} sx={{ mb: 4, alignItems: 'center', opacity: 0.6 }}>
            <Box sx={{ width: 40, height: 1, bgcolor: NT_TEXT }} />
            <Typography sx={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.25em' }}>Trending Conversations</Typography>
          </Stack>
          <Typography variant="h2" sx={{ fontFamily: '"Inter", sans-serif', fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.04em' }}>Most Discussed</Typography>
        </Box>

        <Stack sx={{ borderTop: `1px solid ${NT_BORDER}`, '& > *': { borderBottom: `1px solid ${NT_BORDER}` } }}>
          {trendingItems.map((post, i) => <TrendingItem key={post.id} post={post} index={i} />)}
        </Stack>
      </Box>

      {/* ─── Activity Stream Section ────────────────────────────────────────── */}
      <Box id="activity" sx={{ py: 16, px: { xs: 4, md: '10vw' }, borderTop: `1px solid ${NT_BORDER}` }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 2.5fr' }, gap: 12 }}>
          {/* Category Sidebar */}
          <Box sx={{ display: { xs: 'none', lg: 'block' } }}>
            <Box sx={{ position: 'sticky', top: 100 }}>
              <Typography sx={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.25em', opacity: 0.3, mb: 8 }}>Stream Categories</Typography>
              <Stack spacing={6}>
                {activeCategories.map((cat, i) => (
                  <Box
                    key={cat}
                    component="a"
                    href={`#${cat.toLowerCase().replace(/\s+/g, '-')}`}
                    sx={{
                      textDecoration: 'none', color: i === 0 ? NT_ACCENT : 'inherit', fontSize: '11px', fontWeight: 900,
                      textTransform: 'uppercase', letterSpacing: '0.25em', opacity: i === 0 ? 1 : 0.4,
                      position: 'relative', width: 'fit-content',
                      transition: 'all 0.3s ease',
                      '&:hover': { opacity: 1 },
                      '&::after': {
                        content: '""', position: 'absolute', bottom: -4, left: 0,
                        width: i === 0 ? '100%' : 0, height: 2, bgcolor: NT_ACCENT, transition: 'width 0.4s cubic-bezier(0.23, 1, 0.32, 1)',
                      },
                      '&:hover::after': { width: '100%' },
                    }}
                  >
                    {cat}
                  </Box>
                ))}
              </Stack>
            </Box>
          </Box>

          {/* Categorized Stream */}
          <Stack spacing={16}>
            {activeCategories.map((cat) => (
              <Box key={cat} id={cat.toLowerCase().replace(/\s+/g, '-')} sx={{ scrollMarginTop: 100 }}>
                <Typography sx={{ fontSize: '1.125rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', pb: 4, mb: 6, borderBottom: `1px solid ${NT_BORDER}` }}>
                  {cat}
                </Typography>
                <Box sx={{ borderY: `1px solid ${NT_BORDER}`, bgcolor: 'rgba(42,52,57,0.03)', '& > *': { borderBottom: '1px solid #F8F8FF' }, '& > *:last-child': { borderBottom: 'none' } }}>
                  {groupedItems[cat].map((post) => <ActivityRow key={post.id} post={post} />)}
                </Box>
              </Box>
            ))}
          </Stack>
        </Box>

        <Box sx={{ mt: { xs: 10, md: 12 }, display: 'flex', justifyContent: 'center' }}>
          <Button
            component={RouterLink}
            to="/library"
            sx={{
              borderRadius: '999px', 
              px: { xs: 8, md: 10 }, 
              py: { xs: 2.5, md: 3 }, 
              border: `1px solid ${NT_BORDER}`, // Lighter border initially
              color: NT_TEXT,
              fontSize: '11px', 
              fontWeight: 800, 
              textTransform: 'uppercase', 
              letterSpacing: '0.25em',
              transition: 'all 0.4s cubic-bezier(0.23, 1, 0.32, 1)',
              position: 'relative', 
              overflow: 'hidden',
              bgcolor: 'transparent',
              '&:hover': { 
                color: 'white', 
                borderColor: NT_TEXT,
                boxShadow: '0 12px 24px rgba(42,52,57,0.1)' 
              },
              '&::before': {
                content: '""', 
                position: 'absolute', 
                inset: 0, 
                bgcolor: NT_TEXT, 
                transform: 'translateY(101%)', // Ensure it's hidden
                transition: 'transform 0.4s cubic-bezier(0.23, 1, 0.32, 1)', 
                zIndex: 0,
              },
              '&:hover::before': { transform: 'translateY(0)' },
              '& span': { position: 'relative', zIndex: 1 },
            }}
          >
            <span>View Full Archives</span>
          </Button>
        </Box>
      </Box>

      {/* ─── Newsletter CTA ─────────────────────────────────────────────────── */}
      <Box sx={{ py: 16, px: { xs: 4, md: '10vw' }, borderTop: `1px solid ${NT_BORDER_LIGHT}` }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 16, alignItems: 'center' }}>
          <Box>
            <Typography variant="h2" sx={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.04em', mb: 3 }}>Stay within the loop.</Typography>
            <Typography sx={{ fontSize: '1.125rem', opacity: 0.8, lineHeight: 1.6, maxWidth: '448px', fontWeight: 500 }}>Join 24,000+ infrastructure engineers who receive our monthly breakdown of the Teak platform evolution.</Typography>
          </Box>
          <Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ mb: 2 }}>
              <Box component="input" type="email" placeholder="Professional email" sx={{ flex: 1, bgcolor: 'white', border: `1px solid ${NT_BORDER}`, borderRadius: '999px', px: 6, py: 3.5, fontSize: '0.875rem', outline: 'none', '&:focus': { borderColor: NT_ACCENT }, transition: 'all 0.3s' }} />
              <Button sx={{ borderRadius: '999px', px: 8, py: 3.5, bgcolor: NT_TEXT, color: NT_BG, fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', '&:hover': { bgcolor: NT_ACCENT } }}>Subscribe</Button>
            </Stack>
            <Typography sx={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.25em', opacity: 0.4 }}>No tracking. High-fidelity insights only.</Typography>
          </Box>
        </Box>
      </Box>

      {/* ─── Footer ─────────────────────────────────────────────────────────── */}
      <Box component="footer" sx={{ py: 16, px: { xs: 4, md: '10vw' }, borderTop: `1px solid ${NT_BORDER_LIGHT}` }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr 1fr' }, gap: 16, mb: 10 }}>
          <Box>
            <Stack direction="row" spacing={2.5} sx={{ alignItems: 'center', mb: 4 }}>
              <Box sx={{ width: 32, height: 32, bgcolor: NT_ACCENT, borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: '0.875rem' }}>T</Box>
              <Typography sx={{ fontWeight: 900, fontSize: '1.25rem', letterSpacing: '-0.05em' }}>Nordic Trust</Typography>
            </Stack>
            <Typography sx={{ fontSize: '13px', opacity: 0.8, lineHeight: 1.6, maxWidth: '280px', fontWeight: 500 }}>Technical rigors and editorial precision from the Teak infrastructure group. Stockholm — Global.</Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Typography sx={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.25em', opacity: 0.4 }}>Platform</Typography>
            <Stack spacing={4}>
              {['Infrastructure', 'Risk Lab', 'Documentation'].map(l => <Box key={l} component="a" href="#" sx={{ fontSize: '14px', fontWeight: 500, opacity: 0.6, textDecoration: 'none', color: 'inherit', transition: 'all 0.2s', '&:hover': { color: NT_ACCENT, opacity: 1 } }}>{l}</Box>)}
            </Stack>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Typography sx={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.25em', opacity: 0.4 }}>Trust</Typography>
            <Stack spacing={4}>
              {['Privacy', 'Security', 'Contact'].map(l => <Box key={l} component="a" href="#" sx={{ fontSize: '14px', fontWeight: 500, opacity: 0.6, textDecoration: 'none', color: 'inherit', transition: 'all 0.2s', '&:hover': { color: NT_ACCENT, opacity: 1 } }}>{l}</Box>)}
            </Stack>
          </Box>
        </Box>
        <Box sx={{ pt: 12, borderTop: `1px solid ${NT_BORDER_LIGHT}`, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: 'center', gap: 8, opacity: 0.3 }}>
          <Typography sx={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4em' }}>© 2026 Teak. Built with Precision.</Typography>
          <Stack direction="row" spacing={6} sx={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4em' }}>
            <span>STOCKHOLM</span>
            <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: NT_TEXT }} />
            <span>GLOBAL SCALE</span>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
