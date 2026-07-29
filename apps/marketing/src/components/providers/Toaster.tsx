'use client';

import { Toaster as SonnerToaster } from 'sonner';
import { useTheme } from 'next-themes';

export function Toaster() {
  const { resolvedTheme } = useTheme();
  return (
    <SonnerToaster
      theme={(resolvedTheme as 'light' | 'dark') ?? 'light'}
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        style: {
          borderRadius: '14px',
          fontFamily: 'var(--font-inter), system-ui',
          fontWeight: 500,
        },
      }}
    />
  );
}
