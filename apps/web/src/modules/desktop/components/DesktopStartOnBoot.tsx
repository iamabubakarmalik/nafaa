import { useEffect, useState } from 'react';
import { Power, MinusSquare, Cloud, Info } from 'lucide-react';
import { useDesktop } from '@core/lib/desktop/useDesktop';
import { getElectron } from '@core/lib/desktop/electron';
import { toast } from 'sonner';

/**
 * Desktop-specific settings:
 * - Start on boot (auto-start when computer turns on)
 * - Minimize to tray on close
 * - Native theme sync
 */
export function DesktopStartOnBoot() {
  const { isDesktop, platform } = useDesktop();
  const electron = getElectron() as any;

  const [startOnBoot, setStartOnBoot] = useState(false);
  const [minimizeToTray, setMinimizeToTray] = useState(true);
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>('system');

  useEffect(() => {
    if (!electron) return;
    electron.getStartOnBoot?.().then(setStartOnBoot).catch(() => {});
    electron.getMinimizeToTray?.().then(setMinimizeToTray).catch(() => {});
    electron.getTheme?.().then(setTheme).catch(() => {});
  }, [electron]);

  if (!isDesktop) return null;

  const handleStartOnBoot = async (value: boolean) => {
    setStartOnBoot(value);
    await electron.setStartOnBoot?.(value);
    toast.success(value ? 'Auto-start enabled' : 'Auto-start disabled');
  };

  const handleMinimizeToTray = async (value: boolean) => {
    setMinimizeToTray(value);
    await electron.setMinimizeToTray?.(value);
    toast.success(value ? 'Close = minimize to tray' : 'Close = quit');
  };

  const handleTheme = async (value: 'system' | 'light' | 'dark') => {
    setTheme(value);
    await electron.setTheme?.(value);
    toast.success(`Theme: ${value}`);
  };

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-5 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-12 w-12 rounded-2xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
          <Power className="h-6 w-6 text-blue-700 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="font-extrabold text-slate-900 dark:text-white">Desktop Preferences</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {platform === 'darwin' ? 'macOS' : platform === 'win32' ? 'Windows' : 'Linux'} specific settings
          </p>
        </div>
      </div>

      {/* Start on boot */}
      <label className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition">
        <input
          type="checkbox"
          checked={startOnBoot}
          onChange={(e) => handleStartOnBoot(e.target.checked)}
          className="mt-1 h-5 w-5 rounded accent-emerald-600"
        />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Power className="h-4 w-4 text-emerald-600" />
            Auto-start on boot
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Computer on hote hi Nafaa background me start ho jayega
          </div>
        </div>
      </label>

      {/* Minimize to tray */}
      <label className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition">
        <input
          type="checkbox"
          checked={minimizeToTray}
          onChange={(e) => handleMinimizeToTray(e.target.checked)}
          className="mt-1 h-5 w-5 rounded accent-emerald-600"
        />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <MinusSquare className="h-4 w-4 text-blue-600" />
            Close button → minimize to tray
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            X dabaane pe app tray me chali jayegi, quit nahi hogi (background sync jari)
          </div>
        </div>
      </label>

      {/* Theme */}
      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-2">
        <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
          <Cloud className="h-4 w-4 text-violet-600" />
          Theme
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(['system', 'light', 'dark'] as const).map((t) => (
            <button
              key={t}
              onClick={() => handleTheme(t)}
              className={`px-3 py-2 rounded-lg text-xs font-extrabold capitalize transition ${
                theme === t
                  ? 'bg-violet-600 text-white shadow-md'
                  : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:border-violet-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
          System = OS ke saath sync (recommended)
        </p>
      </div>

      {/* Shortcuts info */}
      <div className="rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 p-3">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-900 dark:text-blue-200 space-y-1 font-semibold">
            <div className="font-extrabold mb-1">Global Shortcuts (kaam karte hain jab app background me ho):</div>
            <div><kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 rounded font-mono text-[10px]">Ctrl+Shift+B</kbd> — Focus barcode input</div>
            <div><kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 rounded font-mono text-[10px]">Ctrl+Shift+S</kbd> — Open POS quickly</div>
          </div>
        </div>
      </div>
    </div>
  );
}
