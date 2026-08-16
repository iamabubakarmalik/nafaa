import { useEffect, useState, useCallback } from 'react';
import { isElectron, getElectron } from './electron';
import { useNavigate } from 'react-router-dom';

/**
 * Hook to detect Electron and access app info.
 */
export function useDesktop() {
  const [version, setVersion] = useState<string | null>(null);
  const [platform, setPlatform] = useState<string | null>(null);
  const [arch, setArch] = useState<string | null>(null);

  const inDesktop = isElectron();
  const electron = getElectron();

  useEffect(() => {
    if (!electron) return;
    (electron as any).getVersion?.().then(setVersion).catch(() => {});
    (electron as any).getPlatform?.().then(setPlatform).catch(() => {});
    (electron as any).getArch?.().then(setArch).catch(() => {});
  }, [electron]);

  return {
    isDesktop: inDesktop,
    version,
    platform,
    arch,
    isMac: platform === 'darwin',
    isWindows: platform === 'win32',
    isLinux: platform === 'linux',
    electron,
  };
}

/**
 * Hook to listen for tray + menu navigation from Electron.
 * Auto-wires React Router navigate.
 */
export function useDesktopNavigation() {
  const navigate = useNavigate();

  useEffect(() => {
    const electron = getElectron();
    if (!electron) return;

    const cleanups: Array<() => void> = [];

    // Tray menu items
    if ((electron as any).onTrayNavigate) {
      cleanups.push((electron as any).onTrayNavigate((path: string) => {
        navigate(path);
      }));
    }

    // Application menu items
    if ((electron as any).onMenuNavigate) {
      cleanups.push((electron as any).onMenuNavigate((path: string) => {
        navigate(path);
      }));
    }

    // Menu print
    if ((electron as any).onMenuPrint) {
      cleanups.push((electron as any).onMenuPrint(() => {
        window.print();
      }));
    }

    return () => cleanups.forEach((c) => c());
  }, [navigate]);
}

/**
 * Hook to listen for auto-update events.
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
      electron.onUpdateAvailable((e: any) =>
        setStatus({ state: 'available', version: e.version }),
      ),
      electron.onUpdateNotAvailable(() =>
        setStatus({ state: 'idle' }),
      ),
      electron.onUpdateProgress((e: any) =>
        setStatus({ state: 'downloading', percent: e.percent }),
      ),
      electron.onUpdateDownloaded((e: any) =>
        setStatus({ state: 'ready', version: e.version }),
      ),
      electron.onUpdateError((e: any) =>
        setStatus({ state: 'error', message: e.message }),
      ),
    ];

    return () => cleanups.forEach((c) => c());
  }, []);

  return status;
}

/**
 * Native theme sync — desktop theme changes to OS theme.
 */
export function useDesktopTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const electron = getElectron() as any;
    if (!electron?.isDarkMode) return;

    electron.isDarkMode().then((isDark: boolean) => {
      setTheme(isDark ? 'dark' : 'light');
    });

    if (electron.onThemeChanged) {
      return electron.onThemeChanged((newTheme: 'light' | 'dark') => {
        setTheme(newTheme);
        // Apply to document
        if (newTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      });
    }
  }, []);

  return theme;
}

/**
 * Desktop reload helpers.
 */
export function useDesktopReload() {
  const electron = getElectron() as any;

  const reload = useCallback(() => {
    if (electron?.reload) {
      electron.reload();
    } else {
      window.location.reload();
    }
  }, [electron]);

  const forceReload = useCallback(() => {
    if (electron?.forceReload) {
      electron.forceReload();
    } else {
      window.location.reload();
    }
  }, [electron]);

  const clearCacheAndReload = useCallback(async () => {
    if (electron?.clearCache) {
      await electron.clearCache();
      electron.forceReload();
    } else {
      window.location.reload();
    }
  }, [electron]);

  return { reload, forceReload, clearCacheAndReload };
}

/**
 * Keyboard shortcuts — Ctrl/Cmd+R for reload, etc.
 */
export function useDesktopShortcuts() {
  const { reload, forceReload } = useDesktopReload();
  const electron = getElectron() as any;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const cmd = e.metaKey || e.ctrlKey;
      if (!cmd) return;

      // Cmd/Ctrl+R = reload (backup — menu also does this)
      if (e.key === 'r' && !e.shiftKey) {
        e.preventDefault();
        reload();
        return;
      }
      // Cmd/Ctrl+Shift+R = force reload
      if (e.key === 'r' && e.shiftKey) {
        e.preventDefault();
        forceReload();
        return;
      }
      // F12 = toggle devtools (desktop only)
      if (e.key === 'F12' && electron?.toggleDevTools) {
        e.preventDefault();
        electron.toggleDevTools();
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [reload, forceReload, electron]);
}

// Backwards-compatible alias
export function useTrayNavigation(onNavigate: (path: string) => void) {
  useEffect(() => {
    const electron = getElectron();
    if (!electron) return;
    return electron.onTrayNavigate(onNavigate);
  }, [onNavigate]);
}
