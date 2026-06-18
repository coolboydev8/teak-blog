import { useState } from 'react';
import { Box, Typography, Button, Stack, Skeleton } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useGetPostsQuery, useGetCategoriesQuery } from '../store/apiSlice';
import { ArrowUpRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const FeedRow = ({ post, index }: { post: any; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay: index * 0.07 }}
  >
    <Box
      component={RouterLink}
      to={`/posts/${post.slug}`}
      className="group feed-item"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 5, lg: 12 },
        py: { xs: 5, md: 10 },
        px: { xs: 3, md: 8 },
        textDecoration: 'none',
        color: 'inherit',
        bgcolor: 'transparent',
        transition: 'background 0.2s',
        '&:hover': { bgcolor: 'white' },
      }}
    >
      <Box
        sx={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          bgcolor: index === 0 ? '#3AA8C1' : 'rgba(42,52,57,0.2)',
          flexShrink: 0,
          transition: 'background 0.2s, transform 0.2s',
          '.group:hover &': { bgcolor: '#3AA8C1', transform: 'scale(1.25)' },
        }}
      />
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1.5fr 1fr' },
          gap: { xs: 3, lg: 8 },
          alignItems: 'center',
          flex: 1,
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, opacity: 0.6 }}>
            <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.25em' }}>
              {post.category?.name || 'Engineering'}
            </Typography>
            <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: '#2A3439' }} />
            <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.25em' }}>
              {post.status === 'published' ? 'Published' : 'Draft'}
            </Typography>
          </Box>
          <Typography
            sx={{
              fontFamily: '"Inter", sans-serif',
              fontWeight: 700,
              fontSize: { xs: '1.2rem', md: '1.5rem' },
              letterSpacing: '-0.02em',
              lineHeight: 1.25,
              mb: 1,
              transition: 'color 0.2s',
              '.group:hover &': { color: '#3AA8C1' },
            }}
          >
            {post.title}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.75, fontSize: '0.9rem', lineHeight: 1.6, maxWidth: '60ch' }}>
            {post.excerpt}
          </Typography>
        </Box>
        <Box
          sx={{
            display: { xs: 'none', lg: 'flex' },
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: { lg: 3, xl: 6 },
            fontSize: '0.65rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            opacity: 0.55,
            transition: 'opacity 0.2s',
            '.group:hover &': { opacity: 1 },
          }}
        >
          {post.published_at && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span>{new Date(post.published_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}</span>
              <span style={{ fontSize: '0.6rem', opacity: 0.7 }}>PUBLISHED</span>
            </Box>
          )}
          <Box sx={{ width: 1, height: 32, bgcolor: 'rgba(42,52,57,0.1)' }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', width: 80 }}>
            <span>{post.read_time_minutes || '8'} MIN</span>
            <span style={{ fontSize: '0.6rem', opacity: 0.7 }}>READ TIME</span>
          </Box>
        </Box>
      </Box>
    </Box>
  </motion.div>
);

export default function HomeFeed() {
  const [category, setCategory] = useState<string | undefined>(undefined);
  const { data: categories = [] } = useGetCategoriesQuery({});
  // Activity Stream = top 5 published posts (all authors) ranked by comment count.
  const { data, isLoading } = useGetPostsQuery({ category, sort: 'comments', page_size: 5 });
  const items: any[] = data?.results ?? [];

  const tabs = [{ slug: undefined as string | undefined, name: 'All Posts' }, ...categories.map((c: any) => ({ slug: c.slug, name: c.name }))];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F8F8FF' }}>
      {/* Hero */}
      <Box sx={{ pt: { xs: 10, md: 16 }, pb: { xs: 8, md: 12 }, px: { xs: 3, md: '10vw' } }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '1.2fr 1fr' },
            gap: { xs: 6, lg: 12 },
            alignItems: 'center',
          }}
        >
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: 'easeOut' }}>
            <Stack direction="row" spacing={1.5} sx={{ mb: 3, opacity: 0.6 }}>
              <Box sx={{ width: 48, height: 1, bgcolor: '#2A3439', alignSelf: 'center' }} />
              <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.25em' }}>
                Technical Rigor / Q2 2026
              </Typography>
            </Stack>
            <Typography
              variant="h1"
              sx={{
                fontFamily: '"Inter", sans-serif',
                fontWeight: 900,
                fontSize: { xs: '3rem', md: '5rem', lg: '7rem', xl: '8rem' },
                lineHeight: 0.95,
                letterSpacing: '-0.04em',
                mb: 4,
              }}
            >
              Precision<br />Infrastructure<br />Research.
            </Typography>
            <Typography variant="body1" sx={{ fontSize: { xs: '1rem', md: '1.2rem' }, opacity: 0.75, lineHeight: 1.7, maxWidth: '42ch', mb: 5 }}>
              Architecting resilient foundations for global fintech. We explore the intersection of high-velocity capital flow and cryptographic security paradigms.
            </Typography>
            <Box
              component="button"
              onClick={() => document.getElementById('activity-stream')?.scrollIntoView({ behavior: 'smooth' })}
              className="group"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                p: 0,
                color: '#2A3439',
              }}
            >
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  border: '1px solid rgba(42,52,57,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.5s',
                  '&:hover': { bgcolor: '#2A3439', color: '#F8F8FF', transform: 'rotate(45deg)' },
                }}
              >
                <ArrowUpRight size={20} />
              </Box>
              <Typography
                sx={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.2em',
                  borderBottom: '1px solid rgba(42,52,57,0.2)',
                  pb: 0.5,
                  transition: 'border-color 0.2s',
                  '&:hover': { borderColor: '#3AA8C1' },
                }}
              >
                Latest Insights
              </Typography>
            </Box>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}>
            <Box
              sx={{
                aspectRatio: '4/5',
                borderRadius: '24px',
                overflow: 'hidden',
                boxShadow: '0 32px 64px -16px rgba(42,52,57,0.12)',
                display: { xs: 'none', lg: 'block' },
              }}
            >
              <Box
                component="img"
                src="https://images.unsplash.com/photo-1483366774565-c783b9f70e2c?auto=format&w=1200&q=80&fit=crop"
                alt="Minimalist Architecture"
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: 'scale(1.1)',
                  transition: 'transform 1s ease',
                  '&:hover': { transform: 'scale(1)' },
                }}
              />
            </Box>
          </motion.div>
        </Box>
      </Box>

      {/* Activity Stream */}
      <Box id="activity-stream" sx={{ py: 8, borderTop: '1px solid rgba(42,52,57,0.05)', px: { xs: 3, md: '10vw' } }}>
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={4} sx={{ alignItems: { lg: 'center' }, mb: 6 }}>
          <Typography variant="h4" sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 700, letterSpacing: '-0.02em' }}>
            Activity Stream
          </Typography>
          <Stack direction="row" spacing={4} sx={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', opacity: 0.5, flexWrap: 'wrap' }}>
            {tabs.map((t) => {
              const active = category === t.slug;
              return (
                <Box
                  key={t.name}
                  component="button"
                  onClick={() => setCategory(t.slug)}
                  sx={{
                    background: 'none', border: 'none', cursor: 'pointer', p: 0, font: 'inherit',
                    letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700,
                    color: active ? '#3AA8C1' : 'inherit',
                    opacity: active ? 1 : undefined,
                    borderBottom: active ? '2px solid #3AA8C1' : '2px solid transparent',
                    pb: 0.5,
                    '&:hover': { color: '#2A3439', borderColor: '#2A3439', opacity: 1 },
                  }}
                >
                  {t.name}
                </Box>
              );
            })}
          </Stack>
        </Stack>

        <Box sx={{ borderTop: '1px solid rgba(42,52,57,0.05)', borderBottom: '1px solid rgba(42,52,57,0.05)', bgcolor: 'rgba(42,52,57,0.01)' }}>
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {[1, 2, 3, 4].map((i) => (
                  <Box key={i} sx={{ display: 'flex', gap: { xs: 5, lg: 12 }, py: { xs: 5, md: 10 }, px: { xs: 3, md: 8 }, borderBottom: '1px solid rgba(42,52,57,0.03)' }}>
                    <Skeleton variant="circular" width={12} height={12} sx={{ mt: 1, flexShrink: 0 }} />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton width="20%" height={14} sx={{ mb: 2 }} />
                      <Skeleton width="60%" height={32} sx={{ mb: 1.5 }} />
                      <Skeleton width="85%" height={20} sx={{ mb: 1 }} />
                      <Skeleton width="70%" height={20} />
                    </Box>
                  </Box>
                ))}
              </motion.div>
            ) : items.length > 0 ? (
              <motion.div
                key="content"
                initial="hidden"
                animate="visible"
                variants={{
                  visible: { transition: { staggerChildren: 0.05 } }
                }}
              >
                {items.map((post: any, i: number) => <FeedRow key={post.id} post={post} index={i} />)}
              </motion.div>
            ) : (
              <Box key="empty" sx={{ p: 12, textAlign: 'center', opacity: 0.35 }}>
                <Typography sx={{ fontStyle: 'italic', fontSize: '1.1rem' }}>No posts in this category yet.</Typography>
              </Box>
            )}
          </AnimatePresence>
        </Box>
      </Box>

      {/* Newsletter CTA */}
      <Box sx={{ py: 8, borderTop: '1px solid rgba(42,52,57,0.05)', px: { xs: 3, md: '10vw' } }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: { xs: 5, lg: 12 }, alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 900, letterSpacing: '-0.03em', mb: 2 }}>
              Stay within the loop.
            </Typography>
            <Typography sx={{ fontSize: '1.1rem', opacity: 0.75, lineHeight: 1.7, maxWidth: '40ch' }}>
              Join 24,000+ infrastructure engineers who receive our monthly breakdown of the Teak platform evolution.
            </Typography>
          </Box>
          <Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
              <Box
                component="input"
                type="email"
                placeholder="Professional email"
                sx={{
                  flex: 1,
                  bgcolor: 'white',
                  border: '1px solid rgba(42,52,57,0.1)',
                  borderRadius: '999px',
                  px: 4,
                  py: 1.8,
                  fontSize: '0.9rem',
                  outline: 'none',
                  '&:focus': { borderColor: '#3AA8C1' },
                }}
              />
              <Button
                variant="contained"
                sx={{
                  borderRadius: '999px',
                  px: 4,
                  py: 1.8,
                  bgcolor: '#2A3439',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  '&:hover': { bgcolor: '#3AA8C1' },
                }}
              >
                Subscribe
              </Button>
            </Stack>
            <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', opacity: 0.35 }}>
              No tracking. High-fidelity insights only.
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Footer */}
      <Box sx={{ bgcolor: '#F8F8FF', borderTop: '1px solid rgba(42,52,57,0.05)', py: 8, px: { xs: 3, md: '10vw' } }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr 1fr' }, gap: 8, mb: 6 }}>
          <Box>
            <Stack direction="row" spacing={1.5} sx={{ mb: 3, alignItems: 'center' }}>
              <Box sx={{ width: 32, height: 32, bgcolor: '#3AA8C1', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography sx={{ color: 'white', fontFamily: '"Inter", sans-serif', fontWeight: 900, fontSize: '0.8rem' }}>T</Typography>
              </Box>
              <Typography sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 900, fontSize: '1.1rem', letterSpacing: '-0.04em' }}>Nordic Trust</Typography>
            </Stack>
            <Typography sx={{ fontSize: '0.85rem', opacity: 0.7, lineHeight: 1.7, maxWidth: '30ch' }}>
              Technical rigors and editorial precision from the Teak infrastructure group. Stockholm — Global.
            </Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3em', opacity: 0.35, mb: 3 }}>Platform</Typography>
            <Stack spacing={2}>
              {['Infrastructure', 'Risk Lab', 'Documentation'].map((l) => (
                <Box key={l} component="a" href="#" sx={{ fontSize: '0.85rem', opacity: 0.55, textDecoration: 'none', color: 'inherit', '&:hover': { color: '#3AA8C1', opacity: 1 } }}>{l}</Box>
              ))}
            </Stack>
          </Box>
          <Box>
            <Typography sx={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3em', opacity: 0.35, mb: 3 }}>Trust</Typography>
            <Stack spacing={2}>
              {['Privacy', 'Security', 'Contact'].map((l) => (
                <Box key={l} component="a" href="#" sx={{ fontSize: '0.85rem', opacity: 0.55, textDecoration: 'none', color: 'inherit', '&:hover': { color: '#3AA8C1', opacity: 1 } }}>{l}</Box>
              ))}
            </Stack>
          </Box>
        </Box>
        <Box sx={{ pt: 4, borderTop: '1px solid rgba(42,52,57,0.05)', display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
          <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4em', opacity: 0.25 }}>© 2026 Teak. Built with Precision.</Typography>
          <Stack direction="row" spacing={2} sx={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4em', opacity: 0.25 }}>
            <span>Stockholm</span>
            <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: '#2A3439', alignSelf: 'center' }} />
            <span>Global Scale</span>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
