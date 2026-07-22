import { useEffect, useState } from 'react';
import { isElectron, getElectron } from './electron';

/**
 * Hook to detect Electron and access app info.
 * Use this in any component to check if user is on desktop app.
 */
export function useDesktop() {
  const [version, setVersion] = useState<string | null>(null);
  const [platform, setPlatform] = useState<string | null>(null);

  const inDesktop = isElectron();
  const electron = getElectron();

  useEffect(() => {
    if (!electron) return;
    electron.getVersion().then(setVersion).catch(() => {});
    electron.getPlatform().then(setPlatform).catch(() => {});
  }, [electron]);

  return {
    isDesktop: inDesktop,
    version,
    platform,
    electron,
  };
}

/**
 * Hook to listen for tray navigation events.
 * Useful in your router to navigate when user clicks tray menu items.
 */
export function useTrayNavigation(onNavigate: (path: string) => void) {
  useEffect(() => {
    const electron = getElectron();
    if (!electron) return;
    return electron.onTrayNavigate(onNavigate);
  }, [onNavigate]);
}

/**
 * Hook to listen for auto-update events.
 * Returns current update status.
 */
export function useAutoUpdate() {
  const [status, setStatus] = useState<{
    state: 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error';
    version?: string;
    percent?: number;
    message?: string;
  }>({ state: 'idle' });

  useEffect(() => {
    const electron = getElectron();
    if (!electron) return;

    const cleanups = [
      electron.onUpdateAvailable((e) =>
        setStatus({ state: 'available', version: e.version }),
      ),
      electron.onUpdateNotAvailable(() =>
        setStatus({ state: 'idle' }),
      ),
      electron.onUpdateProgress((e) =>
        setStatus({ state: 'downloading', percent: e.percent }),
      ),
      electron.onUpdateDownloaded((e) =>
        setStatus({ state: 'ready', version: e.version }),
      ),
      electron.onUpdateError((e) =>
        setStatus({ state: 'error', message: e.message }),
      ),
    ];

    return () => cleanups.forEach((c) => c());
  }, []);

  return status;
}
