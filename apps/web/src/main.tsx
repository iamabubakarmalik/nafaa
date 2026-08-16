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

  // ═══ Prewarm heavy caches (background — non-blocking) ═══
  setTimeout(() => {
    import('@core/lib/offline/offlinePrewarm')
      .then(({ prewarmAllData }) => prewarmAllData(true).catch(() => {}))
      .catch(() => {});
  }, 8000);

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
