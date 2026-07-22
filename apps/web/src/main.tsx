import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import App from '@app/App';
import MarketplaceApp from '@marketplace/MarketplaceApp';
import './index.css';
import { initSyncEngine } from '@core/lib/offline/syncEngine';

// Initialize offline sync engine ONCE (business side only)
if (typeof window !== 'undefined') {
  initSyncEngine();
}

// Top-level split:
//   /market/*  → Customer marketplace app (its own auth, own shell, own router)
//   everything else → Business POS app
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/market/*" element={<MarketplaceApp />} />
        <Route path="/*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
