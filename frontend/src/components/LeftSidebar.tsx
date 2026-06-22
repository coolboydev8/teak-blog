import { Box, Tooltip } from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText } from 'lucide-react';

const NT_ACCENT = '#3AA8C1';
const NT_BORDER = 'rgba(42,52,57,0.06)';

const sidebarItems = [
  { icon: LayoutDashboard, label: 'Insights', to: '/' },
  { icon: FileText,        label: 'Library',  to: '/library' },
];

export const LeftSidebar = () => {
  const location = useLocation();

  return (
    <Box
      component="aside"
      sx={{
        width: 80,
        borderRight: `1px solid ${NT_BORDER}`,
        display: { xs: 'none', md: 'flex' },
        flexDirection: 'column',
        alignItems: 'center',
        py: 5,
        gap: 4,
        bgcolor: 'rgba(255,255,255,0.5)',
        position: 'sticky',
        top: 80,
        height: 'calc(100vh - 80px)',
        flexShrink: 0,
      }}
    >
      {sidebarItems.map(({ icon: Icon, label, to }) => {
        const isActive = location.pathname === to;
        return (
          <Tooltip key={label} title={label} placement="right">
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
                textDecoration: 'none',
                bgcolor: isActive ? NT_ACCENT : 'transparent',
                color: isActive ? 'white' : 'rgba(42,52,57,0.4)',
                boxShadow: isActive ? '0 8px 24px rgba(58,168,193,0.3)' : 'none',
                transition: 'all 0.2s',
                '&:hover': isActive
                  ? {}
                  : { bgcolor: 'white', color: NT_ACCENT, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' },
              }}
            >
              <Icon size={24} />
            </Box>
          </Tooltip>
        );
      })}
    </Box>
  );
};
