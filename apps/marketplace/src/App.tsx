import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'sonner';
import { useAuthStore } from '@/stores/auth.store';
import { useThemeStore } from '@/stores/theme.store';
import { AppRouter } from './router/AppRouter';
import { ErrorBoundary } from './components/ErrorBoundary';
import { InstallPrompt } from './components/InstallPrompt';
import { PushPermissionBanner } from './components/PushPermissionBanner';
import { CommandPalette } from './components/CommandPalette';
import { OfflineIndicator } from './components/OfflineIndicator';
import { UpdatePrompt } from './components/UpdatePrompt';
import './i18n';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (count, error: any) => {
        if (error?.response?.status === 401 || error?.response?.status === 404) return false;
        return count < 2;
      },
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      gcTime: 5 * 60_000,
    },
  },
});

export default function App() {
  const initAuth = useAuthStore((s) => s.initialize);
  const initTheme = useThemeStore((s) => s.initialize);

  useEffect(() => {
    initAuth();
    initTheme();
  }, [initAuth, initTheme]);

  return (
    <ErrorBoundary>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <AppRouter />
            <CommandPalette />
            <InstallPrompt />
            <PushPermissionBanner />
            <OfflineIndicator />
            <UpdatePrompt />
          </BrowserRouter>
          <Toaster
            position="top-center"
            richColors
            closeButton
            duration={3500}
            toastOptions={{
              classNames: {
                toast: 'font-sans',
                title: 'font-bold',
              },
            }}
          />
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}
