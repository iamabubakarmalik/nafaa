'use client';

import { useState, useRef, useEffect } from 'react';
import { Globe, Check } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { locales, localeNames, type Locale } from '@/i18n/config';
import { trackEvent } from '@/lib/analytics/events';
import { cn } from '@/lib/cn';

export function LangSwitcher() {
  const { locale, setLocale, t } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={t('common.language')}
        className={cn(
          'h-10 px-3 rounded-xl flex items-center gap-2 font-semibold text-sm',
          'bg-ink-100/70 dark:bg-ink-800/70 hover:bg-ink-200 dark:hover:bg-ink-700',
          'text-ink-700 dark:text-ink-200',
          'ring-1 ring-inset ring-ink-200/50 dark:ring-ink-700/50',
          'transition-all duration-300 ease-out-expo',
        )}
      >
        <Globe className="h-4 w-4" />
        <span className={locale === 'ur' ? 'font-urdu text-base' : ''}>
          {localeNames[locale]}
        </span>
      </button>

      {open && (
        <div
          className={cn(
            'absolute right-0 rtl:left-0 rtl:right-auto mt-2 w-48 z-50',
            'glass-strong rounded-2xl overflow-hidden shadow-card-hover',
            'animate-in fade-in slide-in-from-top-2 duration-200',
          )}
        >
          {locales.map((l) => (
            <button
              key={l}
              onClick={() => { setLocale(l as Locale); setOpen(false); }}
              className={cn(
                'w-full px-4 py-3 flex items-center justify-between text-sm',
                'hover:bg-ink-100/70 dark:hover:bg-ink-800/70',
                locale === l && 'bg-brand-50/70 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-semibold',
              )}
            >
              <span className={l === 'ur' ? 'font-urdu text-base' : ''}>
                {localeNames[l as Locale]}
              </span>
              {locale === l && <Check className="h-4 w-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
