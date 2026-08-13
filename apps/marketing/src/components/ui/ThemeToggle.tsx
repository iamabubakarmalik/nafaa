'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun, Monitor } from 'lucide-react';
import { cn } from '@/lib/cn';
import { trackEvent } from '@/lib/analytics/events';

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-10 w-10 rounded-xl bg-ink-100 dark:bg-ink-800" />;
  }

  const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';

  return (
    <button
      onClick={() => { trackEvent('theme_switch', { from: theme, to: next }); setTheme(next); }}
      aria-label="Toggle theme"
      className={cn(
        'relative h-10 w-10 rounded-xl flex items-center justify-center',
        'bg-ink-100/70 dark:bg-ink-800/70 hover:bg-ink-200 dark:hover:bg-ink-700',
        'text-ink-700 dark:text-ink-200',
        'transition-all duration-300',
        'ring-1 ring-inset ring-ink-200/50 dark:ring-ink-700/50',
      )}
    >
      {theme === 'light' && <Sun className="h-4 w-4" />}
      {theme === 'dark' && <Moon className="h-4 w-4" />}
      {theme === 'system' && <Monitor className="h-4 w-4" />}
    </button>
  );
}
