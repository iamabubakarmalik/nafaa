'use client';

/**
 * Theme controls (island).
 * - ThemeToggle: the header icon button. Switches between light and dark and
 *   remembers the choice. The icon is picked by CSS (theme.css), so the server
 *   HTML is right on the first paint with no hydration mismatch.
 * - ThemeChoice: the footer control with System / Light / Dark, the only way
 *   back to "follow my device" after a manual choice.
 */
import { useEffect, useState } from 'react';
import { track } from '@/lib/analytics/track';
import { cx } from '@/components/ui/cx';
import { shellStrings } from '@/lib/i18n/shell';
import { MonitorGlyph, MoonGlyph, SunGlyph } from './glyphs';
import { useSiteLocale } from './LocaleGate';

type ThemePref = 'system' | 'light' | 'dark';

interface ThemeApi {
  get(): ThemePref;
  set(pref: ThemePref): void;
  dark(): boolean;
}

function api(): ThemeApi | null {
  return (window as unknown as { __nafaaTheme?: ThemeApi }).__nafaaTheme ?? null;
}

function setPref(pref: ThemePref) {
  api()?.set(pref);
  track('theme_change', { theme: pref });
}

export function ThemeToggle({ className }: { className?: string }) {
  const t = shellStrings(useSiteLocale());
  return (
    <button
      type="button"
      onClick={() => setPref(api()?.dark() ? 'light' : 'dark')}
      className={cx(
        'inline-flex size-9 items-center justify-center rounded-md text-fg-muted transition-colors duration-fast hover:bg-surface-3 hover:text-fg-strong',
        className,
      )}
    >
      <span className="sr-only">{t.themeSwitch}</span>
      <MoonGlyph size={18} className="theme-icon-light" />
      <SunGlyph size={18} className="theme-icon-dark" />
    </button>
  );
}

const OPTIONS: { value: ThemePref; label: 'themeSystem' | 'themeLight' | 'themeDark'; icon: typeof SunGlyph }[] = [
  { value: 'system', label: 'themeSystem', icon: MonitorGlyph },
  { value: 'light', label: 'themeLight', icon: SunGlyph },
  { value: 'dark', label: 'themeDark', icon: MoonGlyph },
];

export function ThemeChoice() {
  const [pref, setState] = useState<ThemePref>('system');
  const t = shellStrings(useSiteLocale());

  useEffect(() => {
    const sync = () => setState(api()?.get() ?? 'system');
    sync();
    window.addEventListener('nafaa:theme', sync);
    return () => window.removeEventListener('nafaa:theme', sync);
  }, []);

  return (
    <div role="radiogroup" aria-label={t.theme} className="inline-flex rounded-md border border-line p-0.5">
      {OPTIONS.map(({ value, label, icon: Glyph }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={pref === value}
          onClick={() => setPref(value)}
          className={cx(
            'inline-flex h-7 items-center gap-1.5 rounded px-2 text-xs transition-colors duration-fast',
            pref === value ? 'bg-surface-3 text-fg-strong' : 'text-fg-subtle hover:text-fg-strong',
          )}
        >
          <Glyph size={14} />
          {t[label]}
        </button>
      ))}
    </div>
  );
}
