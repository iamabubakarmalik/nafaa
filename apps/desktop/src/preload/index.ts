import { contextBridge, ipcRenderer } from 'electron';

/**
 * Exposed API to renderer (web app) via window.electron
 * Context isolation = ON, so this is the ONLY way web can talk to main process
 */

export interface ElectronAPI {
  // App info
  getVersion: () => Promise<string>;
  getPlatform: () => Promise<NodeJS.Platform>;

  // Settings
  getApiUrl: () => Promise<string>;
  setApiUrl: (url: string) => Promise<boolean>;
  getLocale: () => Promise<'en' | 'ur' | 'roman_ur'>;
  setLocale: (lang: 'en' | 'ur' | 'roman_ur') => Promise<boolean>;

  // App actions
  openExternal: (url: string) => Promise<void>;
  relaunch: () => Promise<void>;

  // Future: notifications, printer, scanner (added in DT-3)
  isElectron: true;
}

const electronAPI: ElectronAPI = {
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getPlatform: () => ipcRenderer.invoke('app:getPlatform'),
  getApiUrl: () => ipcRenderer.invoke('app:getApiUrl'),
  setApiUrl: (url) => ipcRenderer.invoke('app:setApiUrl', url),
  getLocale: () => ipcRenderer.invoke('app:getLocale'),
  setLocale: (lang) => ipcRenderer.invoke('app:setLocale', lang),
  openExternal: (url) => ipcRenderer.invoke('app:openExternal', url),
  relaunch: () => ipcRenderer.invoke('app:relaunch'),
  isElectron: true,
};

// ─── Expose to renderer ─────────────────────────────────────────
contextBridge.exposeInMainWorld('electron', electronAPI);

// ─── Type declaration for renderer (web TS) ─────────────────────
declare global {
  interface Window {
    electron?: ElectronAPI;
  }
}
