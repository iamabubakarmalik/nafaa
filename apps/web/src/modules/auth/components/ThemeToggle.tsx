/** Light / dark / system switch for screens outside the app shell (sign-in, onboarding). */

import { Monitor, Moon, Sun } from 'lucide-react';
import { useAppearance, useAppearanceStore, type ThemeMode } from '@/design-system';
import { cn } from '@core/lib/cn';

const MODES: Array<{ mode: ThemeMode; label: string; icon: typeof Sun }> = [
  { mode: 'light', label: 'Light', icon: Sun },
  { mode: 'dark', label: 'Dark', icon: Moon },
  { mode: 'system', label: 'System', icon: Monitor },
];

export function ThemeToggle({ className }: { className?: string }) {
  const { mode } = useAppearance();
  const setMode = useAppearanceStore((s) => s.setMode);
  return (
    <div role="radiogroup" aria-label="Theme" className={cn('inline-flex rounded-lg bg-slate-100 p-0.5', className)}>
      {MODES.map(({ mode: m, label, icon: Icon }) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={mode === m}
          aria-label={label}
          title={label}
          onClick={() => setMode(m)}
          className={cn(
            'flex h-7 w-8 items-center justify-center rounded-md transition',
            mode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800',
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}
