import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  useGetPostBySlugQuery,
  useCreatePostMutation,
  useUpdatePostMutation,
  useGetCategoriesQuery,
  usePublishPostMutation,
  useUnpublishPostMutation,
  useGetMeQuery,
} from '../store/apiSlice';
import { getApiErrorMessage } from '../store/apiError';
import { Box, Typography, Button, Stack, Chip, Tabs, Tab, MenuItem, Select, Avatar, IconButton, InputBase } from '@mui/material';
import { 
  Anchor, Save, Send, Share2, Bookmark, Bold, Italic, Quote, List, Link2, X, 
  Info, ChevronDown, MessageSquare, Eye, Type, CheckCircle2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { toast } from 'sonner';

// Animation Variants matching Design's GSAP logic
const pageVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } }
};

const headerVariants = {
  hidden: { y: -50, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 1, ease: [0.16, 1, 0.3, 1] } }
};

const previewVariants = {
  hidden: { x: -100, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 } }
};

const sidebarVariants = {
  hidden: { x: 100, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.4 } }
};

const staggerContainer = {
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.6 } }
};

const animateItem = {
  hidden: { y: 30, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 1, ease: [0.25, 0.1, 0.25, 1] } }
};

const CATEGORIES = ['Engineering', 'Product', 'Security', 'Infrastructure'];

const EditorLabel = ({ children }: { children: React.ReactNode }) => (
  <Typography sx={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(0,0,0,0.4)', mb: 1, ml: 0.5 }}>
    {children}
  </Typography>
);

const SectionHeader = ({ title, icon: Icon }: { title: string; icon?: any }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
    <Typography sx={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(0,0,0,0.4)' }}>
      {title}
    </Typography>
    {Icon && <Icon size={14} style={{ opacity: 0.2 }} />}
  </Box>
);

export default function PostEditor() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { data: existingPost, isLoading: isFetching } = useGetPostBySlugQuery(slug, { skip: !slug });
  const { data: me } = useGetMeQuery({});
  const { data: categories = [] } = useGetCategoriesQuery({});
  const [createPost] = useCreatePostMutation();
  const [updatePost] = useUpdatePostMutation();
  const [publishPost] = usePublishPostMutation();
  const [unpublishPost] = useUnpublishPostMutation();
  
  const [activeTab, setActiveTab] = useState(0);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(['postgres', 'database', 'saas']);
  const [formData, setFormData] = useState({
    title: 'Scaling PostgreSQL for Config-Driven SaaS',
    content: '',
    excerpt: '',
    category: 'Engineering',
    slug: 'scaling-postgres-saas',
    category_id: 1,
  });

  useEffect(() => {
    if (existingPost) {
      setFormData({
        title: existingPost.title || '',
        content: existingPost.content || '',
        excerpt: existingPost.excerpt || '',
        category: existingPost.category?.name || 'Engineering',
        slug: existingPost.slug || '',
        category_id: existingPost.category?.id || 1,
      });
      if (existingPost.tags) setTags(existingPost.tags.map((t: any) => t.slug));

    }
  }, [existingPost]);

  useEffect(() => {
    if (!slug && categories.length && !categories.some((c: any) => c.name === formData.category)) {
      setFormData((p) => ({ ...p, category: categories[0].name }));
    }
  }, [categories, slug]);

  const handleChange = (field: string) => (e: any) => {
    const val = e.target.value;
    setFormData((prev) => ({
      ...prev,
      [field]: val,
      ...(field === 'title' ? { slug: val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') } : {}),
    }));
  };

  const handleSave = async (status: 'draft' | 'published') => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Missing content', { description: 'A title and a body are required before saving.' });
      return;
    }

    const selected = categories.find((c: any) => c.name === formData.category);
    const payload = {
      title: formData.title,
      content: formData.content,
      excerpt: formData.excerpt,
      category_id: selected?.id,
      tags,
    };

    try {
      let targetSlug = slug;
      if (slug) {
        await updatePost({ slug, ...payload }).unwrap();
      } else {
        const result = await createPost({ ...payload, slug: formData.slug || undefined }).unwrap();
        targetSlug = result.slug;
      }
      if (status === 'published' && targetSlug) {
        await publishPost(targetSlug).unwrap();
        toast.success('Published', { description: 'Your post is live and subscribers have been notified.', icon: <CheckCircle2 size={18} color="#3AA8C1" /> });
      } else if (targetSlug && existingPost && existingPost.status !== 'draft') {
        // Reverting an already-public (or archived) post back to draft.
        await unpublishPost(targetSlug).unwrap();
        toast.success('Moved to draft', { description: 'This post is no longer public.' });
      } else {
        toast.success('Draft saved', { description: 'Your changes have been stored.' });
      }
      navigate('/library');
    } catch (err) {
      toast.error('Could not save post', { description: getApiErrorMessage(err, 'Please review your details and try again.') });
    }
  };

  const wordCount = formData.content.trim().split(/\s+/).filter(Boolean).length;
  const readMin = Math.max(1, Math.ceil(wordCount / 200) || 8);
  const commentCount = existingPost?.comment_count ?? 0;
  const viewCount = existingPost?.view_count ?? 0;
  const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`);

  if (isFetching) return null;

  return (
    <Box component={motion.div} initial="hidden" animate="visible" variants={pageVariants} sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: '#F8F8FF', overflow: 'hidden' }}>
      
      {/* Header */}
      <Box
        component={motion.header}
        variants={headerVariants}
        sx={{
          height: 80,
          bgcolor: 'rgba(255,255,255,0.8)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(0,0,0,0.05)',
          px: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 100,
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Box component={RouterLink} to="/dashboard" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, textDecoration: 'none', color: 'inherit' }}>
            <Box sx={{ width: 32, height: 32, bgcolor: '#2A3439', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Anchor size={18} color="white" />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', lineHeight: 1.0 }}>
              <Typography sx={{ fontWeight: 800, fontSize: '18px', letterSpacing: '-0.035em', color: '#2A3439', whiteSpace: 'nowrap', fontFamily: 'var(--font-heading)' }}>Nordic Trust</Typography>
              <Typography sx={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.25em', color: 'rgba(0,0,0,0.3)', mt: 0.4 }}>Editor Suite</Typography>
            </Box>
          </Box>
          <Box sx={{ width: 1, height: 24, bgcolor: 'rgba(0,0,0,0.1)' }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'rgba(58,168,193,0.05)', px: 1.5, py: 0.75, borderRadius: '999px' }}>
            <Box 
              sx={{ 
                width: 6, height: 6, borderRadius: '50%', bgcolor: '#3AA8C1', 
                animation: 'nordic-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                '@keyframes nordic-pulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.4 } }
              }} 
            />
            <Typography sx={{ fontSize: '11px', fontWeight: 800, color: '#3AA8C1', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Live Preview Active</Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Typography sx={{ fontSize: '11px', fontWeight: 500, color: 'rgba(0,0,0,0.4)', mr: 2 }}>
            Draft auto-saved at {format(new Date(), 'HH:mm aa')}
          </Typography>
          <Button
            variant="text"
            onClick={() => handleSave('draft')}
            sx={{ px: 6, py: 1.25, borderRadius: '999px', border: '1px solid rgba(0,0,0,0.05)', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#2A3439', '&:hover': { bgcolor: 'rgba(0,0,0,0.05)' }, active: { scale: 0.95 } }}
          >
            Save Draft
          </Button>
          <Button
            variant="contained"
            onClick={() => handleSave('published')}
            sx={{
              px: 8, py: 1.25, borderRadius: '999px', bgcolor: '#3AA8C1', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'white',
              background: 'linear-gradient(to right, #3AA8C1, #2e8da3)', boxShadow: '0 8px 24px rgba(58,168,193,0.3)',
              '&:hover': { transform: 'scale(1.02)', boxShadow: '0 12px 32px rgba(58,168,193,0.4)', brightness: 1.1 },
              active: { scale: 0.95 },
              transition: 'all 0.2s'
            }}
          >
            {slug ? 'Update Post' : 'Publish Post'}
          </Button>
        </Box>
      </Box>

      {/* Main Container */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        
        {/* Left: Preview Panel */}
        <Box
          component={motion.section}
          variants={previewVariants}
          sx={{
            flex: 1,
            overflowY: 'auto',
            p: { xs: 6, lg: 10 },
            bgcolor: '#F8F8FF',
            backgroundImage: 'radial-gradient(rgba(42,52,57,0.05) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            '&::-webkit-scrollbar': { width: 4 },
            '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(42,52,57,0.1)', borderRadius: 10 }
          }}
        >
          <Box
            component={motion.div}
            variants={staggerContainer}
            sx={{
              maxWidth: 720,
              mx: 'auto',
              bgcolor: 'white',
              borderRadius: '40px',
              p: { xs: 8, lg: 12 },
              minHeight: '100%',
              boxShadow: '0 32px 64px -16px rgba(42,52,57,0.04)',
              border: '1px solid rgba(0,0,0,0.03)',
              transition: 'all 0.5s ease',
              '&:hover': { boxShadow: '0 48px 80px -20px rgba(42,52,57,0.08)' }
            }}
          >
            <motion.nav variants={animateItem} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '40px' }}>
              <Box sx={{ px: 1.5, py: 0.5, bgcolor: 'rgba(58,168,193,0.1)', color: '#3AA8C1', borderRadius: '4px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {formData.category}
              </Box>
              <Box sx={{ width: 4, height: 4, bgcolor: 'rgba(0,0,0,0.1)', borderRadius: '50%' }} />
              <Typography sx={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: 'rgba(0,0,0,0.3)', letterSpacing: '0.1em' }}>{readMin} min read</Typography>
            </motion.nav>

            <Typography
              component={motion.h1}
              variants={animateItem}
              sx={{
                fontFamily: '"Inter", sans-serif',
                fontWeight: 900,
                fontSize: { xs: '3rem', lg: '3.75rem' },
                lineHeight: 1.1,
                letterSpacing: '-0.04em',
                color: '#2A3439',
                mb: 6
              }}
            >
              {formData.title || 'Untitled Technical Brief'}
            </Typography>

            <motion.div variants={animateItem}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 8, pb: 6, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <Box sx={{ position: 'relative' }}>
                  <Avatar src={me?.avatar || undefined} sx={{ width: 48, height: 48, borderRadius: '16px', filter: 'grayscale(25%)', fontWeight: 700 }}>{(me?.username || '?').charAt(0).toUpperCase()}</Avatar>
                  <Box sx={{ position: 'absolute', bottom: -4, right: -4, width: 18, height: 16, bgcolor: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Box sx={{ width: 8, height: 8, bgcolor: '#10b981', borderRadius: '50%' }} />
                  </Box>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '14px', fontWeight: 800, color: '#2A3439' }}>{me?.username || 'You'}</Typography>
                  <Typography sx={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(0,0,0,0.4)' }}>
                    {me?.title || 'Author'}{me?.date_joined ? ` • Joined ${format(new Date(me.date_joined), 'MMMM yyyy')}` : ''}
                  </Typography>
                </Box>
                <Box sx={{ ml: 'auto', display: 'flex', gap: 2 }}>
                  {[Share2, Bookmark].map((Icon, i) => (
                    <IconButton key={i} size="small" sx={{ color: 'rgba(0,0,0,0.2)', '&:hover': { color: '#3AA8C1', bgcolor: 'rgba(58,168,193,0.05)' } }}>
                      <Icon size={18} strokeWidth={2.5} />
                    </IconButton>
                  ))}
                </Box>
              </Box>
            </motion.div>

            <Box sx={{ color: 'rgba(42,52,57,0.9)' }}>
              <Typography component={motion.p} variants={animateItem} sx={{ fontSize: '1.4rem', fontWeight: 500, lineHeight: 1.7, mb: 6, letterSpacing: '-0.015em' }}>
                {formData.excerpt || 'The evolution of cloud-native infrastructure has brought us to a crossroads where configuration meets massive scale.'}
              </Typography>
              
              <AnimatePresence mode="wait">
                {formData.content ? (
                  <motion.div variants={animateItem} dangerouslySetInnerHTML={{ __html: formData.content }} style={{ fontSize: '1.1rem', lineHeight: 1.8 }} />
                ) : (
                  <motion.div variants={animateItem} style={{ opacity: 0.25, fontStyle: 'italic', fontSize: '1.1rem', lineHeight: 1.8 }}>
                    In this deep dive, we explore how Nordic Trust manages multi-tenant architectures...
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div variants={animateItem} style={{ margin: '64px 0', padding: '48px', backgroundColor: '#F8F9FB', borderRadius: '32px', borderLeft: '6px solid #3AA8C1' }}>
                <Typography sx={{ fontSize: '1.65rem', fontStyle: 'italic', color: 'rgba(0,0,0,0.6)', lineHeight: 1.4, fontWeight: 300, letterSpacing: '-0.01em' }}>
                  "Trust is not just a value; it's a technical specification that must be implemented at the database level."
                </Typography>
              </motion.div>
            </Box>
          </Box>
        </Box>

        {/* Right: Editor Sidebar */}
        <Box
          component={motion.aside}
          variants={sidebarVariants}
          sx={{
            width: 480,
            bgcolor: 'white',
            borderLeft: '1px solid rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            '&::-webkit-scrollbar': { width: 4 },
            '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(42,52,57,0.1)', borderRadius: 10 }
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{
              borderBottom: '1px solid rgba(0,0,0,0.05)',
              '& .MuiTab-root': { fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', minHeight: 64, color: 'rgba(0,0,0,0.3)', transition: 'all 0.3s' },
              '& .Mui-selected': { color: '#3AA8C1 !important' },
              '& .MuiTabs-indicator': { height: 2, bgcolor: '#3AA8C1' }
            }}
          >
            <Tab label="Editor" />
            <Tab label="Settings" />
            <Tab label="SEO" />
          </Tabs>

          <Box sx={{ p: 5, flex: 1 }}>
            <AnimatePresence mode="wait">
              {activeTab === 0 && (
                <motion.div key="editor" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.4 }}>
                  <Stack spacing={8}>
                    {/* Primary Content */}
                    <Box>
                      <SectionHeader title="Primary Content" icon={Info} />
                      <Stack spacing={4}>
                        <Box>
                          <EditorLabel>Display Title</EditorLabel>
                          <InputBase
                            fullWidth
                            value={formData.title}
                            onChange={handleChange('title')}
                            sx={{ 
                              bgcolor: '#F8F9FB', borderRadius: '16px', px: 3, py: 2, fontSize: '14px', fontWeight: 600, color: '#2A3439', border: '1px solid rgba(0,0,0,0.05)',
                              transition: 'all 0.3s', '&.Mui-focused': { border: '1px solid #3AA8C1', boxShadow: '0 0 0 4px rgba(58,168,193,0.1)', bgcolor: 'white' }
                            }}
                          />
                        </Box>
                        <Box>
                          <EditorLabel>Post Excerpt</EditorLabel>
                          <InputBase
                            fullWidth
                            multiline
                            rows={4}
                            value={formData.excerpt}
                            onChange={handleChange('excerpt')}
                            placeholder="Summarize your post..."
                            sx={{ 
                              bgcolor: '#F8F9FB', borderRadius: '16px', px: 3, py: 2, fontSize: '14px', color: 'rgba(0,0,0,0.7)', border: '1px solid rgba(0,0,0,0.05)', lineHeight: 1.6,
                              transition: 'all 0.3s', '&.Mui-focused': { border: '1px solid #3AA8C1', boxShadow: '0 0 0 4px rgba(58,168,193,0.1)', bgcolor: 'white' }
                            }}
                          />
                        </Box>
                      </Stack>
                    </Box>

                    {/* Classification */}
                    <Box>
                      <SectionHeader title="Classification" />
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, mb: 4 }}>
                        <Box>
                          <EditorLabel>Category</EditorLabel>
                          <Box sx={{ position: 'relative' }}>
                            <Select
                              fullWidth
                              value={formData.category}
                              onChange={(e) => setFormData(p => ({ ...p, category: e.target.value }))}
                              IconComponent={ChevronDown}
                              sx={{ 
                                bgcolor: '#F8F9FB', borderRadius: '16px', fontSize: '12px', fontWeight: 800, color: '#2A3439',
                                '& .MuiOutlinedInput-notchedOutline': { border: '1px solid rgba(0,0,0,0.05)' },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#3AA8C1', borderWidth: 1 }
                              }}
                            >
                              {(categories.length ? categories.map((c: any) => c.name) : CATEGORIES).map((c: string) => <MenuItem key={c} value={c} sx={{ fontSize: '12px', fontWeight: 700 }}>{c}</MenuItem>)}
                            </Select>
                          </Box>
                        </Box>
                        <Box>
                          <EditorLabel>Slug</EditorLabel>
                          <InputBase
                            fullWidth
                            value={formData.slug}
                            onChange={handleChange('slug')}
                            endAdornment={<Link2 size={14} style={{ opacity: 0.2 }} />}
                            sx={{ 
                              bgcolor: '#F8F9FB', borderRadius: '16px', px: 3, py: 2, fontSize: '12px', color: 'rgba(0,0,0,0.5)', border: '1px solid rgba(0,0,0,0.05)', fontFamily: 'monospace',
                              transition: 'all 0.3s', '&.Mui-focused': { border: '1px solid #3AA8C1', boxShadow: '0 0 0 4px rgba(58,168,193,0.1)', bgcolor: 'white' }
                            }}
                          />
                        </Box>
                      </Box>
                      <Box>
                        <EditorLabel>Tags</EditorLabel>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, p: 2, bgcolor: '#F8F9FB', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.05)', minHeight: 72, alignItems: 'center' }}>
                          {tags.map(t => (
                            <Chip key={t} label={t} size="small" deleteIcon={<X size={10} />} onDelete={() => setTags(tags.filter(x => x !== t))} sx={{ bgcolor: 'white', fontWeight: 900, fontSize: '10px', height: 28, boxShadow: '0 2px 8px rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.03)' }} />
                          ))}
                          <InputBase placeholder="+ Add..." value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { const t = tagInput.trim().toLowerCase(); if (t) setTags([...tags, t]); setTagInput(''); } }} sx={{ fontSize: '11px', fontWeight: 800, color: 'rgba(0,0,0,0.3)', width: 80, ml: 1 }} />
                        </Box>
                      </Box>
                    </Box>

                    {/* Article Body */}
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
                        <Typography sx={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(0,0,0,0.4)' }}>Article Body</Typography>
                        <Stack direction="row" spacing={1}>
                          {[Bold, Italic, Quote, List].map((Icon, i) => (
                            <IconButton key={i} size="small" sx={{ color: 'rgba(0,0,0,0.2)', '&:hover': { color: '#3AA8C1', bgcolor: 'rgba(58,168,193,0.05)' } }}>
                              <Icon size={14} />
                            </IconButton>
                          ))}
                        </Stack>
                      </Box>
                      <InputBase
                        fullWidth
                        multiline
                        rows={16}
                        value={formData.content}
                        onChange={handleChange('content')}
                        placeholder="Compose your post with clinical precision..."
                        sx={{ 
                          bgcolor: '#F8F9FB', borderRadius: '24px', px: 4, py: 4, fontSize: '14px', color: 'rgba(0,0,0,0.7)', border: '1px solid rgba(0,0,0,0.05)', lineHeight: 1.8,
                          transition: 'all 0.3s', '&.Mui-focused': { border: '1px solid #3AA8C1', boxShadow: '0 0 0 6px rgba(58,168,193,0.08)', bgcolor: 'white' }
                        }}
                      />
                    </Box>
                  </Stack>
                </motion.div>
              )}
            </AnimatePresence>
          </Box>

          {/* Sidebar Footer */}
          <Box sx={{ p: 4, bgcolor: '#F8F9FB', borderTop: '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 'auto', flexShrink: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3.5, opacity: 0.3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}><MessageSquare size={14} /><Typography sx={{ fontSize: '10px', fontWeight: 800 }}>{compact(commentCount)} Comments</Typography></Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}><Eye size={14} /><Typography sx={{ fontSize: '10px', fontWeight: 800 }}>{compact(viewCount)} Views</Typography></Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}><Type size={14} /><Typography sx={{ fontSize: '10px', fontWeight: 800 }}>{wordCount} Words</Typography></Box>
            </Box>
            <Typography sx={{ fontSize: '10px', fontWeight: 800, color: 'rgba(0,0,0,0.15)' }}>Nordic Trust v4.2</Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
