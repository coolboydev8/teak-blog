import {
  Box,
  Typography,
  Button,
  Skeleton,
  InputBase,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  ListItemText,
  Popover,
  TextField,
  Divider,
  Avatar,
} from '@mui/material';
import avatarDefault from '../assets/Avatars/avatar.png';
import { LeftSidebar } from '../components/LeftSidebar';
import {
  useGetMyPostsQuery,
  useGetPostsQuery,
  useGetCategoriesQuery,
  useArchivePostMutation,
} from '../store/apiSlice';
import {
  Search,
  Pencil,
  Eye,
  Archive,
  Calendar,
  User as UserIcon,
  Users,
} from 'lucide-react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { useMemo, useState } from 'react';
import {
  format,
  isToday,
  isYesterday,
  subDays,
  subWeeks,
  subMonths,
  isWithinInterval,
} from 'date-fns';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { toast } from 'sonner';
import { getApiErrorMessage } from '../store/apiError';

// ─── Types ────────────────────────────────────────────────────────────────────
interface PostAuthor {
  id: number;
  username: string;
  avatar?: string;
}

interface PostCategory {
  id: number;
  name: string;
  slug: string;
}

interface LibraryPost {
  id: number;
  uuid: string;
  slug: string;
  title: string;
  excerpt: string;
  status: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
  view_count: number;
  comment_count: number;
  author: PostAuthor;
  category?: PostCategory;
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const NT_BG = '#F8F8FF';
const NT_TEXT = '#2A3439';
const NT_ACCENT = '#3AA8C1';
const NT_BORDER = 'rgba(42,52,57,0.06)';

// ─── Animation variants ───────────────────────────────────────────────────────
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.2 } },
};

const rowVariants: Variants = {
  hidden: { y: 12, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { ease: 'circOut', duration: 0.4 } },
  exit: { opacity: 0, scale: 0.98, transition: { duration: 0.2 } },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  draft:     { label: 'Drafted',   color: '#d97706', dot: '#fbbf24' },
  pending:   { label: 'Pending',   color: '#2563eb', dot: '#60a5fa' },
  published: { label: 'Published', color: '#059669', dot: '#10b981' },
  archived:  { label: 'Archived',  color: '#64748b', dot: '#94a3b8' },
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return format(date, 'dd MMM yyyy').toUpperCase();
}

// ─── Filter Components ────────────────────────────────────────────────────────
const FilterSelect = ({ label, value, options, onChange, multiple = false, icon: Icon }: any) => (
  <FormControl size="small" sx={{ minWidth: 150 }}>
    <InputLabel sx={{ fontSize: '0.7rem', fontWeight: 800, color: 'rgba(42,52,57,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</InputLabel>
    <Select
      multiple={multiple}
      value={value}
      label={label}
      onChange={(e) => onChange(e.target.value)}
      startAdornment={Icon && <Box sx={{ mr: 1, display: 'flex', color: 'rgba(42,52,57,0.3)' }}><Icon size={14} /></Box>}
      renderValue={(selected) => {
        if (multiple) {
          return (
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 700 }}>
              {(selected as string[]).length} Selected
            </Typography>
          );
        }
        return (
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 700 }}>
            {options.find((o: any) => o.value === selected)?.label || selected}
          </Typography>
        );
      }}
      sx={{
        borderRadius: '12px',
        bgcolor: 'white',
        border: `1px solid ${NT_BORDER}`,
        backdropFilter: 'blur(12px)',
        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(42,52,57,0.06)' },
        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: NT_ACCENT },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: NT_ACCENT, borderWidth: '1px' },
        '&:hover': { bgcolor: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' },
        transition: 'all 0.2s',
      }}
    >
      {options.map((opt: any) => (
        <MenuItem key={opt.value} value={opt.value}>
          {multiple && (
            <Checkbox
              checked={(value as string[]).indexOf(opt.value) > -1}
              size="small"
              sx={{ color: 'rgba(42,52,57,0.2)', '&.Mui-checked': { color: NT_ACCENT } }}
            />
          )}
          <ListItemText
            slotProps={{ primary: { sx: { fontSize: '0.8rem', fontWeight: 600, color: NT_TEXT } } }}
            primary={opt.label}
          />
        </MenuItem>
      ))}
    </Select>
  </FormControl>
);

// ─── Matrix Row ───────────────────────────────────────────────────────────────
const MatrixRow = ({
  post,
  striped,
  onArchive,
  isMe,
}: {
  post: LibraryPost;
  striped: boolean;
  onArchive: (slug: string) => void;
  isMe: boolean;
}) => {
  const navigate = useNavigate();
  const dateStr = post.published_at || post.created_at;
  const cfg = STATUS_CONFIG[post.status] || STATUS_CONFIG.draft;
  const isDraft = post.status === 'draft';

  return (
    <motion.div variants={rowVariants} layout>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 120px',
          alignItems: 'center',
          px: 8,
          py: 3,
          bgcolor: striped ? 'rgba(248,248,255,0.4)' : 'white',
          cursor: 'pointer',
          borderBottom: `1px solid ${NT_BORDER}`,
          position: 'relative',
          transition: 'all 0.2s ease',
          '&:hover': { 
            bgcolor: 'rgba(58,168,193,0.02)',
            zIndex: 10,
          },
          '&:hover .row-actions': { opacity: 1, transform: 'translateX(0)' },
        }}
        onClick={() => navigate(`/dashboard/${post.uuid}`)}
      >
        {/* Article Title */}
        <Box sx={{ pr: 4, minWidth: 0 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              mb: 0.5,
              ...(isDraft && { borderLeft: '4px solid #fbbf24', pl: 3, ml: -4 }),
            }}
          >
            <Typography
              sx={{
                fontFamily: '"Inter", sans-serif',
                fontWeight: 700,
                fontSize: '0.875rem',
                color: NT_TEXT,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                transition: 'color 0.2s',
                'tr:hover &, .MuiBox-root:hover &': { color: NT_ACCENT },
              }}
            >
              {post.title}
            </Typography>
            {isMe && (
              <Box
                sx={{
                  px: 1.5, py: 0.2, borderRadius: '4px', flexShrink: 0,
                  bgcolor: 'rgba(58,168,193,0.1)', color: NT_ACCENT,
                  fontSize: '9px', fontWeight: 800, letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                Me
              </Box>
            )}
          </Box>
          <Typography
            sx={{
              fontSize: '0.75rem', color: 'rgba(42,52,57,0.4)', fontWeight: 500,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >
            {post.excerpt}
          </Typography>
        </Box>

        {/* Author */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Avatar
            src={post.author?.avatar || avatarDefault}
            sx={{ width: 24, height: 24, border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
          />
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: NT_TEXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {post.author?.username}
          </Typography>
        </Box>

        {/* Category */}
        <Box>
          <Box
            sx={{
              display: 'inline-block',
              px: 2, py: 0.5,
              bgcolor: 'rgba(42,52,57,0.05)',
              borderRadius: '8px',
            }}
          >
            <Typography sx={{ fontSize: '10px', fontWeight: 700, color: NT_TEXT, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
              {post.category?.name || 'Engineering'}
            </Typography>
          </Box>
        </Box>

        {/* Health */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: cfg.dot, flexShrink: 0 }} />
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: cfg.color }}>
            {cfg.label}
          </Typography>
        </Box>

        {/* Date */}
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(42,52,57,0.3)' }}>
          {formatDate(dateStr || post.created_at)}
        </Typography>

        {/* Actions */}
        <Box
          className="row-actions"
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 0.5,
            opacity: 0,
            transform: 'translateX(16px)',
            transition: 'all 0.3s ease',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <Tooltip title="View">
            <IconButton
              size="small"
              component={RouterLink}
              to={`/posts/${post.uuid}`}
              sx={{
                width: 32, height: 32, borderRadius: '8px',
                bgcolor: 'white', border: `1px solid ${NT_BORDER}`,
                color: 'rgba(42,52,57,0.6)',
                '&:hover': { color: NT_ACCENT, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
              }}
            >
              <Eye size={15} />
            </IconButton>
          </Tooltip>
          {isMe && (
            <>
              <Tooltip title="Edit">
                <IconButton
                  size="small"
                  component={RouterLink}
                  to={`/editor/${post.slug}`}
                  sx={{
                    width: 32, height: 32, borderRadius: '8px',
                    bgcolor: 'white', border: `1px solid ${NT_BORDER}`,
                    color: 'rgba(42,52,57,0.6)',
                    '&:hover': { color: NT_ACCENT, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
                  }}
                >
                  <Pencil size={14} />
                </IconButton>
              </Tooltip>
              {post.status !== 'archived' && (
                <Tooltip title="Archive">
                  <IconButton
                    size="small"
                    onClick={() => onArchive(post.slug)}
                    sx={{
                      width: 32, height: 32, borderRadius: '8px',
                      bgcolor: 'white', border: `1px solid ${NT_BORDER}`,
                      color: 'rgba(42,52,57,0.6)',
                      '&:hover': { color: '#e11d48', bgcolor: '#fff1f2', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
                    }}
                  >
                    <Archive size={14} />
                  </IconButton>
                </Tooltip>
              )}
            </>
          )}
        </Box>
      </Box>
    </motion.div>
  );
};

// ─── Library Page ─────────────────────────────────────────────────────────────
export default function Library() {
  const { user: me } = useSelector((state: RootState) => state.auth);
  const [search, setSearch] = useState('');

  // Filter States
  const [scope, setScope] = useState('all');
  const [timePeriod, setTimePeriod] = useState('all');
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [timeAnchorEl, setTimeAnchorEl] = useState<null | HTMLElement>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // Data
  const { data: globalData, isLoading: globalLoading } = useGetPostsQuery({});
  const { data: myData, isLoading: myLoading } = useGetMyPostsQuery({});
  const { data: cats = [] } = useGetCategoriesQuery({});
  const [archivePost] = useArchivePostMutation();

  const combinedPosts = useMemo(() => {
    const global: LibraryPost[] = globalData?.results || [];
    const personal: LibraryPost[] = myData?.results || [];

    const myIds = new Set(personal.map((p) => p.id));
    const othersPublished = global.filter((p) => !myIds.has(p.id));

    let base = scope === 'me' ? personal : [...personal, ...othersPublished];

    base = base.filter((p: LibraryPost) => {
      if (p.author?.id === me?.id)
        return ['published', 'draft', 'pending', 'archived'].includes(p.status);
      return p.status === 'published';
    });

    let filtered = base;

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (p: LibraryPost) =>
          p.title.toLowerCase().includes(q) || (p.excerpt || '').toLowerCase().includes(q)
      );
    }

    if (selectedCats.length > 0) {
      filtered = filtered.filter(
        (p: LibraryPost) => p.category && selectedCats.includes(p.category.slug)
      );
    }

    if (selectedStatus.length > 0) {
      filtered = filtered.filter((p: LibraryPost) => selectedStatus.includes(p.status));
    }

    const now = new Date();
    if (timePeriod !== 'all') {
      filtered = filtered.filter((p: LibraryPost) => {
        const date = new Date(p.created_at);
        if (timePeriod === 'today') return isToday(date);
        if (timePeriod === 'yesterday') return isYesterday(date);
        if (timePeriod === '3days')
          return isWithinInterval(date, { start: subDays(now, 3), end: now });
        if (timePeriod === '1week')
          return isWithinInterval(date, { start: subWeeks(now, 1), end: now });
        if (timePeriod === '1month')
          return isWithinInterval(date, { start: subMonths(now, 1), end: now });
        if (timePeriod === 'custom' && dateRange.start && dateRange.end) {
          return isWithinInterval(date, {
            start: new Date(dateRange.start),
            end: new Date(dateRange.end),
          });
        }
        return true;
      });
    }

    return filtered.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [globalData, myData, scope, search, selectedCats, selectedStatus, timePeriod, dateRange, me?.id]);

  const totalPages = Math.max(1, Math.ceil(combinedPosts.length / PAGE_SIZE));
  const pagedPosts = combinedPosts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleArchive = async (slug: string) => {
    try {
      await archivePost(slug).unwrap();
      toast.success('Post archived');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not archive post'));
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isLoading = globalLoading || myLoading;

  const hasActiveFilters =
    selectedCats.length > 0 || selectedStatus.length > 0 || timePeriod !== 'all' || scope !== 'all';

  return (
    <Box sx={{ bgcolor: NT_BG, minHeight: 'calc(100vh - 80px)', display: 'flex' }}>
      {/* Left Icon Rail */}
      <LeftSidebar />

      {/* Main Content */}
      <Box sx={{ flex: 1, minWidth: 0, p: { xs: 4, md: 6, lg: 10 } }}>
        {/* Header */}
        <Box sx={{ mb: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 3 }}>
          <Box>
            <Typography variant="h3" sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 900, letterSpacing: '-0.04em', color: NT_TEXT, mb: 1 }}>
              Content Library
            </Typography>
            <Typography sx={{ fontSize: '0.875rem', opacity: 0.55, fontWeight: 500 }}>
              Platform-wide editorial catalog and asset management.
            </Typography>
          </Box>
          <Button
            component={RouterLink}
            to="/editor"
            variant="contained"
            sx={{
              borderRadius: '999px',
              px: 4, py: 1.5,
              bgcolor: NT_ACCENT,
              fontWeight: 700,
              fontSize: '0.75rem',
              textTransform: 'none',
              letterSpacing: '0.05em',
              boxShadow: '0 8px 20px rgba(58,168,193,0.25)',
              '&:hover': { bgcolor: NT_TEXT },
            }}
          >
            Create Post
          </Button>
        </Box>

        {/* Filter Suite + Search */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, mb: 6, flexWrap: 'wrap' }}>
          <FilterSelect
            label="Scope"
            value={scope}
            icon={scope === 'all' ? Users : UserIcon}
            options={[
              { label: 'Me vs All', value: 'all' },
              { label: 'My Contributions', value: 'me' },
            ]}
            onChange={(v: string) => { setScope(v); setCurrentPage(1); }}
          />

          <Box
            onClick={(e) => setTimeAnchorEl(e.currentTarget)}
          >
            <FilterSelect
              label="Time Period"
              value={timePeriod}
              icon={Calendar}
              options={[
                { label: 'All Time', value: 'all' },
                { label: 'Today', value: 'today' },
                { label: 'Yesterday', value: 'yesterday' },
                { label: 'Last 3 Days', value: '3days' },
                { label: 'Last Week', value: '1week' },
                { label: 'Last Month', value: '1month' },
                { label: 'Custom Range...', value: 'custom' },
              ]}
              onChange={(val: string) => {
                setTimePeriod(val);
                setCurrentPage(1);
                if (val === 'custom') setShowCustomPicker(true);
              }}
            />
          </Box>

          <FilterSelect
            label="Category"
            value={selectedCats}
            multiple
            options={cats.map((c: any) => ({ label: c.name, value: c.slug }))}
            onChange={(v: string[]) => { setSelectedCats(v); setCurrentPage(1); }}
          />

          <FilterSelect
            label="Status"
            value={selectedStatus}
            multiple
            options={[
              { label: 'Drafted', value: 'draft' },
              { label: 'Pending Approval', value: 'pending' },
              { label: 'Published Live', value: 'published' },
              { label: 'Archived', value: 'archived' },
            ]}
            onChange={(v: string[]) => { setSelectedStatus(v); setCurrentPage(1); }}
          />

          {hasActiveFilters && (
            <Button
              size="small"
              onClick={() => { setSelectedCats([]); setSelectedStatus([]); setTimePeriod('all'); setScope('all'); setCurrentPage(1); }}
              sx={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgba(42,52,57,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', '&:hover': { color: NT_TEXT, bgcolor: 'transparent' } }}
            >
              Reset
            </Button>
          )}

          {/* Search — right-aligned */}
          <Box sx={{ ml: 'auto', position: 'relative' }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(42,52,57,0.3)', pointerEvents: 'none' }}
            />
            <InputBase
              placeholder="Filter insights..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              sx={{
                bgcolor: 'white',
                borderRadius: '12px',
                pl: 5, pr: 2, py: 1.25,
                fontSize: '0.8rem',
                fontWeight: 500,
                border: `1px solid ${NT_BORDER}`,
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                width: 240,
                '&:focus-within': { borderColor: NT_ACCENT, boxShadow: `0 0 0 3px ${NT_ACCENT}1a` },
              }}
            />
          </Box>
        </Box>

        {/* Custom Date Popover */}
        <Popover
          open={showCustomPicker}
          anchorEl={timeAnchorEl}
          onClose={() => setShowCustomPicker(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          slotProps={{
            paper: {
              sx: { mt: 1, p: 3, borderRadius: '20px', boxShadow: '0 24px 48px rgba(0,0,0,0.12)', border: '1px solid rgba(0,0,0,0.05)' },
            },
          }}
        >
          <Typography sx={{ fontSize: '0.7rem', fontWeight: 900, mb: 2.5, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(0,0,0,0.4)' }}>
            Define Range
          </Typography>
          <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
            <TextField
              type="date"
              label="From"
              slotProps={{ inputLabel: { shrink: true } }}
              value={dateRange.start}
              onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
              size="small"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
            />
            <Divider sx={{ width: 12, height: 2, bgcolor: 'rgba(0,0,0,0.1)' }} />
            <TextField
              type="date"
              label="To"
              slotProps={{ inputLabel: { shrink: true } }}
              value={dateRange.end}
              onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
              size="small"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
            />
          </Box>
          <Button
            fullWidth
            variant="contained"
            onClick={() => setShowCustomPicker(false)}
            sx={{ mt: 3, bgcolor: NT_TEXT, borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
          >
            Apply Range
          </Button>
        </Popover>

        {/* Results count */}
        <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, mb: 3, color: 'rgba(42,52,57,0.4)' }}>
          Showing {Math.min((currentPage - 1) * PAGE_SIZE + 1, combinedPosts.length)}–{Math.min(currentPage * PAGE_SIZE, combinedPosts.length)} of {combinedPosts.length} articles
        </Typography>

        {/* Table */}
        <Box
          sx={{
            bgcolor: 'white',
            borderRadius: '24px',
            overflow: 'hidden',
            border: `1px solid ${NT_BORDER}`,
            boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
          }}
        >
          {/* Table Header */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 120px',
              bgcolor: 'rgba(0,0,0,0.02)',
              px: 8, py: 2.5,
              borderBottom: `1px solid ${NT_BORDER}`,
            }}
          >
            {['Article Title', 'Author', 'Category', 'Health', 'Date', ''].map((h) => (
              <Typography
                key={h}
                sx={{
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.2em',
                  color: 'rgba(42,52,57,0.4)',
                }}
              >
                {h}
              </Typography>
            ))}
          </Box>

          {/* Rows */}
          <Box component={motion.div} variants={containerVariants} initial="hidden" animate="visible">
            {isLoading ? (
              [1, 2, 3, 4, 5, 6].map((i) => (
                <Box key={i} sx={{ px: 8, py: 3, borderBottom: `1px solid ${NT_BORDER}` }}>
                  <Skeleton height={50} sx={{ borderRadius: '12px' }} />
                </Box>
              ))
            ) : pagedPosts.length === 0 ? (
              <Box sx={{ py: 20, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Box
                  sx={{
                    width: 64, height: 64, borderRadius: '20px',
                    bgcolor: 'rgba(58,168,193,0.05)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', mb: 3,
                    color: NT_ACCENT, border: `1px solid rgba(58,168,193,0.1)`,
                  }}
                >
                  <Search size={32} strokeWidth={1.5} />
                </Box>
                <Typography sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 800, fontSize: '1.1rem', color: NT_TEXT, mb: 1 }}>
                  No Articles Found
                </Typography>
                <Typography sx={{ fontSize: '0.85rem', color: 'rgba(42,52,57,0.5)', maxWidth: '30ch', mx: 'auto', mb: 4, fontWeight: 500, lineHeight: 1.6 }}>
                  We couldn't find any research posts matching your current filters.
                </Typography>
                {hasActiveFilters && (
                  <Button
                    onClick={() => { setSelectedCats([]); setSelectedStatus([]); setTimePeriod('all'); setScope('all'); setCurrentPage(1); }}
                    variant="outlined"
                    sx={{
                      borderRadius: '10px', px: 3, py: 1, textTransform: 'none',
                      fontWeight: 700, fontSize: '0.75rem', borderColor: 'rgba(42,52,57,0.1)',
                      color: NT_TEXT, '&:hover': { bgcolor: 'rgba(42,52,57,0.02)', borderColor: NT_TEXT },
                    }}
                  >
                    Clear All Filters
                  </Button>
                )}
              </Box>
            ) : (
              pagedPosts.map((p, idx: number) => (
                <MatrixRow
                  key={p.id}
                  post={p}
                  striped={idx % 2 !== 0}
                  onArchive={handleArchive}
                  isMe={p.author?.id === me?.id}
                />
              ))
            )}
          </Box>

          {/* Pagination Footer */}
          {!isLoading && combinedPosts.length > 0 && (
            <Box
              sx={{
                px: 8, py: 2.5,
                bgcolor: 'rgba(0,0,0,0.01)',
                borderTop: `1px solid ${NT_BORDER}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Typography sx={{ fontSize: '0.625rem', fontWeight: 800, color: 'rgba(42,52,57,0.3)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
                Showing {Math.min((currentPage - 1) * PAGE_SIZE + 1, combinedPosts.length)}–{Math.min(currentPage * PAGE_SIZE, combinedPosts.length)} of {combinedPosts.length} articles
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconButton
                  size="small"
                  disabled={currentPage === 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                  sx={{ color: 'rgba(42,52,57,0.4)', '&:disabled': { opacity: 0.2 } }}
                >
                  <Box component="span" sx={{ fontSize: '1rem', lineHeight: 1 }}>‹</Box>
                </IconButton>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const page = i + 1;
                    const isActive = page === currentPage;
                    return (
                      <Box
                        key={page}
                        onClick={() => handlePageChange(page)}
                        sx={{
                          width: 28, height: 28,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          borderRadius: '8px',
                          bgcolor: isActive ? NT_ACCENT : 'transparent',
                          color: isActive ? 'white' : 'rgba(42,52,57,0.5)',
                          fontSize: '0.625rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          boxShadow: isActive ? '0 4px 12px rgba(58,168,193,0.3)' : 'none',
                          '&:hover': { bgcolor: isActive ? NT_ACCENT : 'rgba(0,0,0,0.05)' },
                          transition: 'all 0.15s',
                        }}
                      >
                        {page}
                      </Box>
                    );
                  })}
                </Box>
                <IconButton
                  size="small"
                  disabled={currentPage === totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                  sx={{ color: 'rgba(42,52,57,0.4)', '&:disabled': { opacity: 0.2 } }}
                >
                  <Box component="span" sx={{ fontSize: '1rem', lineHeight: 1 }}>›</Box>
                </IconButton>
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
