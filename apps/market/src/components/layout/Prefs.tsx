'use client';
/** Language menu and light/dark switch (saved per device; dark class on <html>). */
import { Globe, Moon, Sun } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { cn } from '@/components/ui';
import { LANGS, switchLang } from '@/lib/i18n';

export type ThemePref = 'light' | 'dark' | 'system';

export function applyTheme(pref: ThemePref) {
  try {
    localStorage.setItem('nm-theme', pref);
  } catch {
    // Private mode: the choice lasts for this page only.
  }
  const dark = pref === 'dark' || (pref === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
}

export function readTheme(): ThemePref {
  try {
    const v = localStorage.getItem('nm-theme');
    return v === 'dark' || v === 'light' ? v : 'system';
  } catch {
    return 'system';
  }
}

export function ThemeToggle({ className }: { className?: string }) {
  const { t } = useApp();
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains('dark')), []);
  return (
    <button
      type="button"
      aria-label={dark ? t('account.light') : t('account.dark')}
      onClick={() => {
        applyTheme(dark ? 'light' : 'dark');
        setDark(!dark);
      }}
      className={cn('grid h-10 w-10 place-items-center rounded-full text-gray-600 hover:bg-gray-100', className)}
    >
      {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}

export function LangMenu({ className }: { className?: string }) {
  const { t, lang } = useApp();
  const path = usePathname() || '/';
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  return (
    <div ref={box} className={cn('relative', className)}>
      <button type="button" aria-haspopup="menu" aria-expanded={open} aria-label={t('account.language')} onClick={() => setOpen(!open)} className="flex h-10 items-center gap-1 rounded-full px-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100">
        <Globe className="h-5 w-5" />
        <span className="hidden sm:inline">{lang === 'en' ? 'EN' : lang === 'ur' ? 'اردو' : 'Roman'}</span>
      </button>
      {open && (
        <div role="menu" className="absolute end-0 top-11 z-50 w-44 animate-scale-in overflow-hidden rounded-2xl bg-white py-1 shadow-soft-lg ring-1 ring-gray-200">
          {LANGS.map((l) => (
            <Link key={l} role="menuitem" href={switchLang(path, l)} onClick={() => setOpen(false)} className={cn('block px-4 py-2.5 text-sm hover:bg-gray-50', l === lang ? 'font-bold text-brand-700' : 'text-gray-800')}>
              {t(`lang.${l}`)}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
