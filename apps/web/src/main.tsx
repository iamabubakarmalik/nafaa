import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from '@app/App';
import './index.css';
import { initSyncEngine } from '@core/lib/offline/syncEngine';
import { registerSW } from 'virtual:pwa-register';

if (typeof window !== 'undefined') {
  // ═══ Init offline sync engine ═══
  initSyncEngine();

  // ═══ Prewarm heavy caches on boot (if authenticated) ═══
  const runInitialPrewarm = () => {
    // Only prewarm if user is authenticated
    import('@core/stores/auth.store').then(({ useAuthStore }) => {
      if (useAuthStore.getState().isAuthenticated && navigator.onLine) {
        import('@core/lib/offline/offlinePrewarm')
          .then(({ prewarmAllData }) => prewarmAllData(true).catch(() => {}))
          .catch(() => {});
        // Also trigger sync
        import('@core/lib/offline/syncEngine')
          .then(({ downloadAllData }) => downloadAllData(true).catch(() => {}))
          .catch(() => {});
      }
    }).catch(() => {});
  };
  setTimeout(runInitialPrewarm, 3000);

  // ═══ Watch auth state — prewarm after ANY login (online/offline) ═══
  import('@core/stores/auth.store').then(({ useAuthStore }) => {
    let lastAuthState = useAuthStore.getState().isAuthenticated;
    let lastUserId = useAuthStore.getState().user?.id;
    useAuthStore.subscribe((state) => {
      const currentAuth = state.isAuthenticated;
      const currentUserId = state.user?.id;
      // Detect login (was false, now true) OR user change
      const isLogin = !lastAuthState && currentAuth;
      const isUserChange = currentUserId && lastUserId && currentUserId !== lastUserId;
      if ((isLogin || isUserChange) && navigator.onLine) {
        console.log('[auth-watch] Login detected — triggering prewarm + sync');
        setTimeout(() => {
          import('@core/lib/offline/offlinePrewarm').then(({ prewarmAfterLogin }) => {
            prewarmAfterLogin().catch(() => {});
          }).catch(() => {});
          import('@core/lib/offline/syncEngine').then(({ downloadAllData }) => {
            downloadAllData(true).catch(() => {});
          }).catch(() => {});
        }, 800);
      }
      lastAuthState = currentAuth;
      lastUserId = currentUserId;
    });
  }).catch(() => {});

  // ═══ Register Service Worker (PWA) ═══
  const updateSW = registerSW({
    onNeedRefresh() {
      // Naya version deploy hua — user ko batao, 1 click refresh
      console.log('[PWA] New version available');
      import('sonner').then(({ toast }) => {
        toast.info('🚀 Nafaa ka naya version ready hai', {
          description: 'Latest features ke liye refresh karein',
          duration: 15000,
          action: {
            label: 'Refresh',
            onClick: () => updateSW(true),
          },
        });
      }).catch(() => {});
    },
    onOfflineReady() {
      console.log('[PWA] App ready to work offline');
    },
    onRegisteredSW(swUrl) {
      console.log('[PWA] Service Worker registered:', swUrl);
    },
    onRegisterError(err) {
      console.error('[PWA] SW registration failed:', err);
    },
  });

  // Expose for manual refresh if needed
  (window as any).__updateSW = updateSW;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
