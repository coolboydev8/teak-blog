import React from 'react';
import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import nordicTheme from './nordicTheme';

const createEmotionCache = () => {
  return createCache({
    key: "mui",
    prepend: true,
  });
};

const emotionCache = createEmotionCache();

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  return (
    <CacheProvider value={emotionCache}>
      <ThemeProvider theme={nordicTheme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </CacheProvider>
  );
}
