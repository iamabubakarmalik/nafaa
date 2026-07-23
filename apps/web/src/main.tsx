import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from '@app/App';
import './index.css';
import { initSyncEngine } from '@core/lib/offline/syncEngine';

if (typeof window !== 'undefined') {
  initSyncEngine();
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
