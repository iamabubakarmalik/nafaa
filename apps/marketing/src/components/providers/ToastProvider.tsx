'use client';

import { Toaster } from 'sonner';
import { useTheme } from 'next-themes';

export function ToastProvider() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      position="top-center"
      theme={(resolvedTheme as 'light' | 'dark') ?? 'system'}
      richColors
      closeButton
      duration={4000}
      toastOptions={{
        className:
          'font-sans !rounded-xl !border !shadow-card !ring-1 !ring-inset',
      }}
    />
  );
}
