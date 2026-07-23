import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { InstallPrompt } from './components/InstallPrompt';
import { PushPermissionBanner } from './components/PushPermissionBanner';
import { MarketplaceRouter } from './router/MarketplaceRouter';
import { useCustomerAuthStore } from '@stores/customerAuth.store';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
  },
});

export default function App() {
  const init = useCustomerAuthStore((s) => s.initialize);
  useEffect(() => { init(); }, [init]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <MarketplaceRouter />
      </BrowserRouter>
      <Toaster position="top-right" richColors closeButton duration={3500} />
      <InstallPrompt />
      <PushPermissionBanner />
    </QueryClientProvider>
  );
}
