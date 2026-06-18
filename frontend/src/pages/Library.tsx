import {
  Box,
  Typography,
  Button,
  Skeleton,
  InputBase,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  useGetMyPostsQuery,
  useArchivePostMutation,
} from '../store/apiSlice';
import {
  LayoutDashboard,
  FileText,
  BarChart2,
  Settings,
  Filter,
  ArrowUpDown,
  Search,
  Pencil,
  Eye,
  Archive,
} from 'lucide-react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { useMemo, useState } from 'react';
import {
  formatDistanceToNow,
  format,
  isToday,
  isYesterday,
} from 'date-fns';
import { toast } from 'sonner';
import { getApiErrorMessage } from '../store/apiError';

// ─── Design tokens ────────────────────────────────────────────────────────────
const NT_BG = '#F8F8FF';
const NT_TEXT = '#2A3439';
const NT_ACCENT = '#3AA8C1';

// ─── Animation variants ───────────────────────────────────────────────────────
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.15 } },
};

const railItemVariants: Variants = {
  hidden: { x: -20, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 120, damping: 15 } },
};

const rowVariants: Variants = {
  hidden: { y: 10, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { ease: 'circOut', duration: 0.5 } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.25 } },
};

const headerVariants: Variants = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: 'Draft', bg: '#fffbeb', text: '#d97706' },
  published: { label: 'Published', bg: '#ecfdf5', text: '#059669' },
  archived: { label: 'Archived', bg: '#f1f5f9', text: '#64748b' },
};

function formatLastModified(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return formatDistanceToNow(date, { addSuffix: false }) + ' ago';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMM d');
}

function fmtWords(n?: number): string {
  if (!n) return '—';
  return n.toLocaleString();
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        bgcolor: cfg.bg,
        px: 1.5,
        py: 0.5,
        borderRadius: '999px',
      }}
    >
      <Box
        sx={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          bgcolor: cfg.text,
        }}
      />
      <Typography sx={{ fontSize: '0.625rem', fontWeight: 800, color: cfg.text, lineHeight: 1 }}>
        {cfg.label}
      </Typography>
    </Box>
  );
};

// ─── Matrix Row ───────────────────────────────────────────────────────────────
interface LibraryPost {
  id: number;
  slug: string;
  title: string;
  excerpt?: string;
  status: string;
  word_count?: number;
  updated_at?: string;
  created_at: string;
}

const MatrixRow = ({
  post,
  striped,
  onArchive,
}: {
  post: LibraryPost;
  striped: boolean;
  onArchive: (slug: string) => void;
}) => {
  const navigate = useNavigate();
  const modifiedAt = post.updated_at || post.created_at;

  return (
    <motion.div variants={rowVariants} layout>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1fr 120px 100px 140px 120px',
          alignItems: 'center',
          px: 4,
          py: 3,
          bgcolor: striped ? 'rgba(248,248,255,0.4)' : 'white',
          cursor: 'pointer',
          borderBottom: '1px solid rgba(42,52,57,0.04)',
          transition: 'all 0.2s ease',
          position: 'relative',
          '&:hover': {
            bgcolor: 'white',
            boxShadow: `inset 4px 0 0 ${NT_ACCENT}, 0 4px 12px rgba(0,0,0,0.03)`,
            zIndex: 2,
          },
          '&:hover .row-actions': { opacity: 1 },
        }}
        onClick={() => navigate(`/editor/${post.slug}`)}
      >
        {/* Title & Excerpt */}
        <Box sx={{ pr: 5, minWidth: 0 }}>
          <Typography
            sx={{
              fontFamily: '"Inter", sans-serif',
              fontWeight: 700,
              fontSize: '0.8125rem',
              color: NT_TEXT,
              mb: 0.5,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {post.title}
          </Typography>
          {post.excerpt && (
            <Typography
              sx={{
                fontSize: '0.6875rem',
                color: `${NT_TEXT}66`,
                fontWeight: 500,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {post.excerpt}
            </Typography>
          )}
        </Box>

        {/* Status */}
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <StatusBadge status={post.status} />
        </Box>

        {/* Words */}
        <Typography
          sx={{
            textAlign: 'center',
            fontFamily: 'monospace',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: `${NT_TEXT}99`,
            letterSpacing: '-0.02em',
          }}
        >
          {fmtWords(post.word_count)}
        </Typography>

        {/* Last Modified */}
        <Typography
          sx={{
            textAlign: 'right',
            fontSize: '0.75rem',
            fontWeight: 500,
            color: `${NT_TEXT}80`,
          }}
        >
          {formatLastModified(modifiedAt)}
        </Typography>

        {/* Actions */}
        <Box
          className="row-actions"
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 0.75,
            opacity: 0,
            transition: 'opacity 0.2s ease',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <Tooltip title="Edit draft">
            <IconButton
              size="small"
              component={RouterLink}
              to={`/editor/${post.slug}`}
              sx={{
                p: 0.75,
                color: `${NT_TEXT}66`,
                borderRadius: '8px',
                '&:hover': { bgcolor: `${NT_ACCENT}1a`, color: NT_ACCENT },
              }}
            >
              <Pencil size={15} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Preview">
            <IconButton
              size="small"
              component={RouterLink}
              to={`/posts/${post.slug}`}
              sx={{
                p: 0.75,
                color: `${NT_TEXT}66`,
                borderRadius: '8px',
                '&:hover': { bgcolor: `${NT_ACCENT}1a`, color: NT_ACCENT },
              }}
            >
              <Eye size={15} />
            </IconButton>
          </Tooltip>
          {post.status !== 'archived' && (
            <Tooltip title="Archive">
              <IconButton
                size="small"
                onClick={() => onArchive(post.slug)}
                sx={{
                  p: 0.75,
                  color: `${NT_TEXT}66`,
                  borderRadius: '8px',
                  '&:hover': { bgcolor: '#fff1f2', color: '#e11d48' },
                }}
              >
                <Archive size={15} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>
    </motion.div>
  );
};

// ─── Left Icon Rail ───────────────────────────────────────────────────────────
const navRail = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/dashboard', active: false },
  { icon: FileText, label: 'Library', to: '/library', active: true },
  { icon: BarChart2, label: 'Analytics', to: '/dashboard', active: false },
  { icon: Settings, label: 'Settings', to: '/subscriptions', active: false },
];

const IconRail = () => (
  <Box
    component={motion.aside}
    initial="hidden"
    animate="visible"
    variants={containerVariants}
    sx={{
      width: 80,
      bgcolor: 'rgba(255,255,255,0.6)',
      borderRight: '1px solid rgba(42,52,57,0.05)',
      display: { xs: 'none', md: 'flex' },
      flexDirection: 'column',
      alignItems: 'center',
      py: 5,
      gap: 4,
      position: 'sticky',
      top: 80,
      height: 'calc(100vh - 80px)',
      zIndex: 10,
    }}
  >
    {navRail.map(({ icon: Icon, label, to, active }) => (
      <Tooltip key={label} title={label} placement="right">
        <motion.div variants={railItemVariants}>
          <Box
            component={RouterLink}
            to={to}
            sx={{
              width: 48,
              height: 48,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              bgcolor: active ? NT_ACCENT : 'transparent',
              color: active ? 'white' : `${NT_TEXT}59`,
              boxShadow: active ? `0 8px 24px ${NT_ACCENT}4d` : 'none',
              transition: 'all 0.2s',
              textDecoration: 'none',
              '&:hover': active ? {} : { bgcolor: NT_BG, color: NT_ACCENT },
            }}
          >
            <Icon size={22} strokeWidth={active ? 2.5 : 2} />
          </Box>
        </motion.div>
      </Tooltip>
    ))}
  </Box>
);

// ─── Library Page ─────────────────────────────────────────────────────────────
export default function Library() {
  const [search, setSearch] = useState('');
  const [sortAsc, setSortAsc] = useState(false);

  const { data: postsData, isLoading } = useGetMyPostsQuery(
    {},
    { refetchOnMountOrArgChange: true },
  );
  const [archivePost] = useArchivePostMutation();

  const posts: LibraryPost[] = postsData?.results ?? [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const result = q
      ? posts.filter(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            (p.excerpt || '').toLowerCase().includes(q),
        )
      : [...posts];

    result.sort((a, b) => {
      const dateA = new Date(a.updated_at || a.created_at).getTime();
      const dateB = new Date(b.updated_at || b.created_at).getTime();
      return sortAsc ? dateA - dateB : dateB - dateA;
    });

    return result;
  }, [posts, search, sortAsc]);

  const handleArchive = async (slug: string) => {
    try {
      await archivePost(slug).unwrap();
      toast.success('Post archived', { description: 'Moved out of your active catalog.' });
    } catch (err) {
      toast.error('Could not archive post', { description: getApiErrorMessage(err, 'Please try again.') });
    }
  };

  const totalCount = postsData?.count ?? posts.length;

  return (
    <Box
      sx={{
        bgcolor: NT_BG,
        minHeight: 'calc(100vh - 80px)',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '80px 1fr' },
      }}
    >
      {/* Left icon rail */}
      <IconRail />

      {/* Main content */}
      <Box
        component={motion.div}
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        sx={{ p: { xs: 4, md: 6, lg: '40px 40px 80px' }, minWidth: 0 }}
      >
        {/* Header */}
        <motion.header variants={headerVariants}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              mb: 4,
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <Box>
              <Typography
                sx={{
                  fontFamily: '"Inter", sans-serif',
                  fontWeight: 900,
                  fontSize: { xs: '1.75rem', md: '2rem' },
                  letterSpacing: '-0.04em',
                  color: NT_TEXT,
                  mb: 0.75,
                }}
              >
                Content Library
              </Typography>
              <Typography
                sx={{ fontSize: '0.8125rem', fontWeight: 500, color: `${NT_TEXT}80` }}
              >
                Manage every post you’ve written — drafts, published, and archived.
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Button
                startIcon={<Filter size={14} />}
                sx={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  color: `${NT_TEXT}99`,
                  bgcolor: 'white',
                  border: '1px solid rgba(42,52,57,0.05)',
                  borderRadius: '10px',
                  textTransform: 'none',
                  px: 2,
                  py: 1,
                  '&:hover': { color: NT_TEXT, bgcolor: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
                }}
              >
                Filter Pulse
              </Button>
              <Button
                startIcon={<ArrowUpDown size={14} />}
                onClick={() => setSortAsc((v) => !v)}
                sx={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  color: sortAsc ? NT_ACCENT : `${NT_TEXT}99`,
                  bgcolor: sortAsc ? `${NT_ACCENT}14` : 'white',
                  border: `1px solid ${sortAsc ? `${NT_ACCENT}33` : 'rgba(42,52,57,0.05)'}`,
                  borderRadius: '10px',
                  textTransform: 'none',
                  px: 2,
                  py: 1,
                  '&:hover': { bgcolor: `${NT_ACCENT}14`, color: NT_ACCENT },
                }}
              >
                Sort
              </Button>
            </Box>
          </Box>

          {/* Search bar */}
          <Box sx={{ position: 'relative', mb: 5 }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: 20,
                top: '50%',
                transform: 'translateY(-50%)',
                color: `${NT_TEXT}4d`,
                pointerEvents: 'none',
              }}
            />
            <InputBase
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search across ${totalCount} posts by title or keyword...`}
              sx={{
                width: '100%',
                bgcolor: 'white',
                border: '1px solid rgba(42,52,57,0.05)',
                borderRadius: '16px',
                py: 1.75,
                pl: '52px',
                pr: 3,
                fontSize: '0.8125rem',
                fontWeight: 500,
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                '& input::placeholder': { color: `${NT_TEXT}4d` },
                '&.Mui-focused': {
                  boxShadow: `0 0 0 3px ${NT_ACCENT}29, 0 2px 8px rgba(0,0,0,0.03)`,
                },
              }}
            />
          </Box>
        </motion.header>

        {/* Draft matrix */}
        <Box
          sx={{
            bgcolor: 'white',
            borderRadius: '24px',
            overflow: 'hidden',
            border: '1px solid rgba(42,52,57,0.05)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          }}
        >
          {/* Column headers */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 120px 100px 140px 120px',
              bgcolor: 'rgba(248,248,255,0.5)',
              px: 4,
              py: 2,
              borderBottom: '1px solid rgba(42,52,57,0.05)',
            }}
          >
            {['Title & Excerpt', 'Status', 'Words', 'Last Modified', ''].map((col, i) => (
              <Typography
                key={col + i}
                sx={{
                  fontSize: '0.5625rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.18em',
                  color: `${NT_TEXT}66`,
                  textAlign: i === 0 ? 'left' : i === 1 || i === 2 ? 'center' : 'right',
                }}
              >
                {col}
              </Typography>
            ))}
          </Box>

          {/* Rows */}
          <AnimatePresence mode="popLayout">
            {isLoading ? (
              [1, 2, 3, 4].map((i) => (
                <Box key={i} sx={{ px: 4, py: 3, borderBottom: '1px solid rgba(42,52,57,0.04)' }}>
                  <Skeleton variant="rectangular" height={44} sx={{ borderRadius: '8px' }} />
                </Box>
              ))
            ) : filtered.length === 0 ? (
              <Box sx={{ py: 12, textAlign: 'center' }}>
                <Typography
                  sx={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: `${NT_TEXT}4d`,
                    fontStyle: 'italic',
                  }}
                >
                  {search
                    ? `No posts matching "${search}"`
                    : 'No posts yet — start writing to build your library.'}
                </Typography>
              </Box>
            ) : (
              <motion.div variants={containerVariants} initial="hidden" animate="visible">
                {filtered.map((post, idx) => (
                  <MatrixRow
                    key={post.id}
                    post={post}
                    striped={idx % 2 !== 0}
                    onArchive={handleArchive}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </Box>
      </Box>
    </Box>
  );
}
