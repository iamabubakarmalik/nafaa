'use client';

import { useState, useRef, useEffect } from 'react';
import { Globe, Check } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { locales, localeNames, type Locale } from '@/i18n/config';
import { cn } from '@/lib/cn';

export function LangSwitcher() {
  const { locale, setLocale } = useLocale();
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
        className="h-10 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 inline-flex items-center gap-2 font-semibold text-sm"
      >
        <Globe className="h-4 w-4" />
        <span className={locale === 'ur' ? 'font-urdu' : ''}>{localeNames[locale]}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden z-50">
          {locales.map((l) => (
            <button
              key={l}
              onClick={() => {
                setLocale(l as Locale);
                setOpen(false);
              }}
              className={cn(
                'w-full px-4 py-3 text-left text-sm flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800',
                locale === l && 'bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-semibold',
              )}
            >
              <span className={l === 'ur' ? 'font-urdu text-base' : ''}>{localeNames[l as Locale]}</span>
              {locale === l && <Check className="h-4 w-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
