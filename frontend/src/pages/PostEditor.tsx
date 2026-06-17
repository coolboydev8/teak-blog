import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetPostBySlugQuery, useCreatePostMutation, useUpdatePostMutation } from '../store/apiSlice';
import { Box, Typography, TextField, Button, Stack, Chip, Tabs, Tab, MenuItem, Select } from '@mui/material';
import { Save, Send, Share2, Bookmark, Bold, Italic, Quote, List, Anchor, Link2, X } from 'lucide-react';
import { motion } from 'framer-motion';

const CATEGORIES = ['Engineering', 'Product', 'Security', 'Infrastructure', 'Design'];

export default function PostEditor() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { data: existingPost } = useGetPostBySlugQuery(slug, { skip: !slug });
  const [createPost] = useCreatePostMutation();
  const [updatePost] = useUpdatePostMutation();
  const [activeTab, setActiveTab] = useState(0);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(['postgres', 'database', 'saas']);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    category: 'Engineering',
    slug: '',
    metadata: '{\n  "seo_title": "",\n  "is_featured": false,\n  "experiment_id": ""\n}',
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
        metadata: JSON.stringify(existingPost.metadata || {}, null, 2),
        category_id: existingPost.category?.id || 1,
      });
      if (existingPost.tags) setTags(existingPost.tags.map((t: any) => t.slug));
    }
  }, [existingPost]);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const val = e.target.value;
    setFormData((prev) => ({
      ...prev,
      [field]: val,
      ...(field === 'title' ? { slug: val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') } : {}),
    }));
  };

  const handleSave = async (_status: 'draft' | 'published') => {
    try {
      const payload = { title: formData.title, content: formData.content, excerpt: formData.excerpt, category_id: formData.category_id };
      if (slug) {
        await updatePost({ slug, ...payload }).unwrap();
      } else {
        const result = await createPost(payload).unwrap();
        navigate(`/editor/${result.slug}`);
      }
    } catch (err) {
      console.error('Failed to save post:', err);
    }
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (t && !tags.includes(t)) { setTags([...tags, t]); }
    setTagInput('');
  };

  const removeTag = (t: string) => setTags(tags.filter((x) => x !== t));

  const wordCount = formData.content.trim().split(/\s+/).filter(Boolean).length;
  const readMin = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', bgcolor: '#F8F8FF', overflow: 'hidden' }}>
      {/* Top bar */}
      <Box sx={{ bgcolor: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(42,52,57,0.05)', px: 4, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 32, height: 32, bgcolor: '#2A3439', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Anchor size={16} color="white" />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', letterSpacing: '-0.01em' }}>Nordic Trust</Typography>
              <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', opacity: 0.28 }}>Editor Suite</Typography>
            </Box>
          </Box>
          <Box sx={{ width: 1, height: 24, bgcolor: 'rgba(42,52,57,0.1)' }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'rgba(58,168,193,0.07)', px: 2, py: 0.75, borderRadius: '999px' }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#3AA8C1', animation: 'pulse 2s infinite' }} />
            <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: '#3AA8C1', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Live Preview Active</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography sx={{ fontSize: '0.7rem', opacity: 0.35, display: { xs: 'none', md: 'block' } }}>Draft auto-saved at 09:42 AM</Typography>
          <Button variant="outlined" size="small" startIcon={<Save size={14} />} onClick={() => handleSave('draft')} sx={{ borderRadius: '999px', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', borderColor: 'rgba(42,52,57,0.15)', color: '#2A3439' }}>
            Save Draft
          </Button>
          <Button variant="contained" size="small" startIcon={<Send size={14} />} onClick={() => handleSave('published')} sx={{ borderRadius: '999px', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', background: 'linear-gradient(135deg, #3AA8C1, #2e8da3)', boxShadow: '0 8px 20px rgba(58,168,193,0.3)' }}>
            Publish to Teak
          </Button>
        </Box>
      </Box>

      {/* Main split */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left: Live Preview */}
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            p: 6,
            backgroundImage: 'radial-gradient(rgba(42,52,57,0.03) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            bgcolor: '#F8F8FF',
          }}
        >
          <motion.div
            key={formData.title}
            initial={{ opacity: 0.7 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            style={{ maxWidth: 720, margin: '0 auto' }}
          >
            <Box
              sx={{
                bgcolor: 'white',
                borderRadius: '40px',
                p: { xs: 5, md: 8 },
                minHeight: '70vh',
                boxShadow: '0 32px 64px -16px rgba(42,52,57,0.06)',
                border: '1px solid rgba(42,52,57,0.03)',
              }}
            >
              {/* Category + read time */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
                <Box sx={{ px: 1.5, py: 0.5, bgcolor: 'rgba(58,168,193,0.1)', borderRadius: '4px' }}>
                  <Typography sx={{ fontSize: '0.6rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#3AA8C1' }}>
                    {formData.category}
                  </Typography>
                </Box>
                <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: 'rgba(42,52,57,0.1)' }} />
                <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.3 }}>
                  {readMin} min read
                </Typography>
              </Box>

              {/* Title preview */}
              <Typography
                sx={{
                  fontFamily: '"Inter", sans-serif',
                  fontWeight: 900,
                  fontSize: { xs: '2rem', md: '3rem' },
                  lineHeight: 1.1,
                  letterSpacing: '-0.04em',
                  mb: 5,
                  color: formData.title ? '#2A3439' : 'rgba(42,52,57,0.12)',
                  fontStyle: formData.title ? 'normal' : 'italic',
                }}
              >
                {formData.title || 'Post Title Placeholder'}
              </Typography>

              {/* Author row */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 6, pb: 6, borderBottom: '1px solid rgba(42,52,57,0.05)' }}>
                <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: 'rgba(58,168,193,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  <Typography sx={{ fontWeight: 800, color: '#3AA8C1', fontSize: '0.8rem' }}>TW</Typography>
                  <Box sx={{ position: 'absolute', bottom: -2, right: -2, width: 12, height: 12, bgcolor: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Box sx={{ width: 7, height: 7, bgcolor: '#10b981', borderRadius: '50%' }} />
                  </Box>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '0.875rem', fontWeight: 700 }}>Teak Writer</Typography>
                  <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', opacity: 0.35 }}>Lead Engineer • Today</Typography>
                </Box>
                <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
                  {[Share2, Bookmark].map((Icon, i) => (
                    <Box key={i} sx={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(42,52,57,0.2)', '&:hover': { color: '#3AA8C1', bgcolor: 'rgba(58,168,193,0.08)' } }}>
                      <Icon size={14} />
                    </Box>
                  ))}
                </Box>
              </Box>

              {/* Excerpt / content preview */}
              {formData.excerpt && (
                <Typography sx={{ fontSize: '1.1rem', fontStyle: 'italic', opacity: 0.75, lineHeight: 1.7, mb: 4 }}>
                  {formData.excerpt}
                </Typography>
              )}
              {formData.content ? (
                <Box
                  sx={{
                    '& p': { fontSize: '1rem', lineHeight: 1.8, mb: 3, opacity: 0.8 },
                    '& h2': { fontFamily: '"Inter", sans-serif', fontSize: '1.5rem', fontWeight: 700, mt: 5, mb: 2 },
                  }}
                  dangerouslySetInnerHTML={{ __html: formData.content }}
                />
              ) : (
                <Typography sx={{ fontSize: '1rem', opacity: 0.25, lineHeight: 1.8, fontStyle: 'italic' }}>
                  Your content will render here in real-time as you write...
                </Typography>
              )}
            </Box>
          </motion.div>
        </Box>

        {/* Right: Editor sidebar */}
        <Box
          sx={{
            width: { xs: '100%', md: 480 },
            bgcolor: 'white',
            borderLeft: '1px solid rgba(42,52,57,0.05)',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            flexShrink: 0,
          }}
        >
          {/* Tabs */}
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{
              borderBottom: '1px solid rgba(42,52,57,0.05)',
              '& .MuiTab-root': { fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', minHeight: 52, color: 'rgba(42,52,57,0.28)' },
              '& .Mui-selected': { color: '#3AA8C1 !important' },
              '& .MuiTabs-indicator': { bgcolor: '#3AA8C1' },
            }}
          >
            <Tab label="Editor" />
            <Tab label="Settings" />
            <Tab label="SEO" />
          </Tabs>

          {/* Editor tab content */}
          {activeTab === 0 && (
            <Box sx={{ p: 4, flex: 1 }}>
              <Stack spacing={4}>
                {/* Primary content */}
                <Box>
                  <Typography sx={{ fontSize: '0.6rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', opacity: 0.35, mb: 2 }}>Primary Content</Typography>
                  <Stack spacing={2}>
                    <Box>
                      <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.35, mb: 1 }}>Display Title</Typography>
                      <TextField
                        fullWidth
                        value={formData.title}
                        onChange={handleChange('title')}
                        placeholder="e.g. Scaling PostgreSQL for SaaS"
                        size="small"
                        sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#F8F8FF', borderRadius: '12px', fontWeight: 600, fontSize: '0.875rem', '& fieldset': { borderColor: 'rgba(42,52,57,0.06)' }, '&:hover fieldset': { borderColor: 'rgba(42,52,57,0.15)' }, '&.Mui-focused fieldset': { borderColor: '#3AA8C1' } } }}
                      />
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.35, mb: 1 }}>Post Excerpt</Typography>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        value={formData.excerpt}
                        onChange={handleChange('excerpt')}
                        placeholder="Summarize your post..."
                        size="small"
                        sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#F8F8FF', borderRadius: '12px', fontSize: '0.875rem', '& fieldset': { borderColor: 'rgba(42,52,57,0.06)' }, '&.Mui-focused fieldset': { borderColor: '#3AA8C1' } } }}
                      />
                    </Box>
                  </Stack>
                </Box>

                {/* Classification */}
                <Box>
                  <Typography sx={{ fontSize: '0.6rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', opacity: 0.35, mb: 2 }}>Classification</Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <Box>
                      <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, opacity: 0.35, mb: 1, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Category</Typography>
                      <Select
                        fullWidth
                        size="small"
                        value={formData.category}
                        onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))}
                        sx={{ bgcolor: '#F8F8FF', borderRadius: '12px', fontSize: '0.8rem', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(42,52,57,0.06)' } }}
                      >
                        {CATEGORIES.map((c) => <MenuItem key={c} value={c} sx={{ fontSize: '0.85rem' }}>{c}</MenuItem>)}
                      </Select>
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, opacity: 0.35, mb: 1, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Slug</Typography>
                      <TextField
                        fullWidth
                        size="small"
                        value={formData.slug}
                        onChange={handleChange('slug')}
                        slotProps={{ input: { endAdornment: <Link2 size={14} style={{ opacity: 0.2 }} />, sx: { fontFamily: 'monospace', fontSize: '0.75rem' } } }}
                        sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#F8F8FF', borderRadius: '12px', '& fieldset': { borderColor: 'rgba(42,52,57,0.06)' }, '&.Mui-focused fieldset': { borderColor: '#3AA8C1' } } }}
                      />
                    </Box>
                  </Box>
                  <Box sx={{ mt: 2 }}>
                    <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, opacity: 0.35, mb: 1, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Tags</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, p: 1.5, bgcolor: '#F8F8FF', borderRadius: '12px', border: '1px solid rgba(42,52,57,0.06)', minHeight: 52 }}>
                      {tags.map((t) => (
                        <Chip key={t} label={t} size="small" deleteIcon={<X size={10} />} onDelete={() => removeTag(t)} sx={{ bgcolor: 'white', fontWeight: 700, fontSize: '0.65rem', height: 24, '& .MuiChip-deleteIcon': { color: 'rgba(42,52,57,0.3)', '&:hover': { color: '#f43f5e' } } }} />
                      ))}
                      <Box component="input" value={tagInput} onChange={(e: any) => setTagInput(e.target.value)} onKeyDown={(e: any) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} placeholder="+ Add..." sx={{ border: 'none', background: 'none', outline: 'none', fontSize: '0.7rem', fontWeight: 700, width: 64, color: 'rgba(42,52,57,0.35)' }} />
                    </Box>
                  </Box>
                </Box>

                {/* Post Config */}
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography sx={{ fontSize: '0.6rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', opacity: 0.35 }}>Post Configuration</Typography>
                    <Button size="small" sx={{ fontSize: '0.6rem', color: '#3AA8C1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', p: 0, minWidth: 0 }}>Validate JSON</Button>
                  </Box>
                  <Box sx={{ bgcolor: '#2A3439', borderRadius: '16px', p: 3 }}>
                    <TextField
                      fullWidth
                      multiline
                      rows={6}
                      value={formData.metadata}
                      onChange={handleChange('metadata')}
                      variant="standard"
                      slotProps={{ input: { disableUnderline: true, sx: { fontFamily: 'monospace', fontSize: '0.7rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.8 } } }}
                    />
                  </Box>
                </Box>

                {/* Article Body */}
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography sx={{ fontSize: '0.6rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', opacity: 0.35 }}>Article Body</Typography>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {[Bold, Italic, Quote, List].map((Icon, i) => (
                        <Box key={i} sx={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(42,52,57,0.25)', '&:hover': { color: '#3AA8C1' } }}>
                          <Icon size={14} />
                        </Box>
                      ))}
                    </Box>
                  </Box>
                  <TextField
                    fullWidth
                    multiline
                    rows={16}
                    value={formData.content}
                    onChange={handleChange('content')}
                    placeholder="Compose your post with clinical precision..."
                    size="small"
                    sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#F8F8FF', borderRadius: '12px', fontSize: '0.875rem', '& fieldset': { borderColor: 'rgba(42,52,57,0.06)' }, '&.Mui-focused fieldset': { borderColor: '#3AA8C1' } } }}
                  />
                </Box>
              </Stack>
            </Box>
          )}

          {/* Footer stats bar */}
          <Box sx={{ px: 4, py: 2, bgcolor: '#F8F8FF', borderTop: '1px solid rgba(42,52,57,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Stack direction="row" spacing={3} sx={{ fontSize: '0.65rem', fontWeight: 700, opacity: 0.28 }}>
              <span>{wordCount} Words</span>
              <span>{readMin} min read</span>
            </Stack>
            <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, opacity: 0.15, textTransform: 'uppercase', letterSpacing: '0.2em' }}>Nordic Trust v4.2</Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
