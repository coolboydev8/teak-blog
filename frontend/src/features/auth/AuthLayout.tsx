import { Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#F8F8FF',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Topographic SVG background */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          opacity: 0.09,
          pointerEvents: 'none',
        }}
      >
        <svg width="100%" height="100%" viewBox="0 0 1000 800" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
          {[...Array(14)].map((_, i) => (
            <ellipse
              key={i}
              cx={500} cy={400}
              rx={100 + i * 70} ry={80 + i * 60}
              fill="none"
              stroke="#2A3439"
              strokeWidth="1"
              strokeOpacity={0.6 - i * 0.03}
            />
          ))}
          {[...Array(10)].map((_, i) => (
            <ellipse
              key={`r-${i}`}
              cx={800} cy={150}
              rx={60 + i * 50} ry={50 + i * 40}
              fill="none"
              stroke="#2A3439"
              strokeWidth="0.8"
              strokeOpacity={0.4 - i * 0.03}
            />
          ))}
          {[...Array(8)].map((_, i) => (
            <ellipse
              key={`l-${i}`}
              cx={100} cy={700}
              rx={50 + i * 45} ry={40 + i * 38}
              fill="none"
              stroke="#2A3439"
              strokeWidth="0.8"
              strokeOpacity={0.3 - i * 0.02}
            />
          ))}
        </svg>
      </Box>

      {/* Glass blur overlay */}
      <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(248,248,255,0.45)', backdropFilter: 'blur(4px)' }} />

      {/* Brand mark top-left */}
      <Box sx={{ position: 'absolute', top: 32, left: 32, zIndex: 20, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ width: 36, height: 36, bgcolor: '#3AA8C1', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(58,168,193,0.25)' }}>
          <Typography sx={{ color: 'white', fontFamily: '"Inter", sans-serif', fontWeight: 900, fontSize: '0.65rem', letterSpacing: '-0.02em' }}>NT</Typography>
        </Box>
        <Typography sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(42,52,57,0.7)' }}>
          Nordic Trust
        </Typography>
      </Box>

      {/* Card */}
      <Box sx={{ position: 'relative', zIndex: 20, width: '100%', maxWidth: 460, mx: 2 }}>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        >
          <Box
            sx={{
              bgcolor: 'white',
              borderRadius: '40px',
              p: { xs: 5, md: 7 },
              border: '1px solid rgba(255,255,255,0.85)',
              boxShadow: '32px 32px 64px rgba(0,0,0,0.04), -32px -32px 64px rgba(255,255,255,1)',
            }}
          >
            {children}
          </Box>
        </motion.div>
      </Box>

      {/* Bottom bar */}
      <Box sx={{ position: 'absolute', bottom: 24, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', px: 4, zIndex: 20, pointerEvents: 'none' }}>
        <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3em', color: 'rgba(42,52,57,0.5)' }}>
          © 2026 Nordic Trust Financial Group
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {[0, 1, 2].map((i) => (
            <Box key={i} sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: i === 0 ? '#3AA8C1' : 'rgba(58,168,193,0.2)' }} />
          ))}
        </Box>
      </Box>
    </Box>
  );
}
