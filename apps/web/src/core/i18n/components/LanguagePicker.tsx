/**
 * Language choosers.
 *
 *  - <LanguageCards />  three large options with a sample line in each
 *    language; used in Settings → Language.
 *  - <LanguageSwitch /> a compact three-way switch for the profile menu and
 *    the login and sign-up pages.
 *
 * Names and samples are always written in their own language and script, so
 * people can find their language whatever the screen is showing now.
 */

import { useEffect, useState } from 'react';
import { Check, Languages } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { ensureFont } from '@/design-system/theme/apply';
import { URDU_FONTS } from '@/design-system/tokens/typography';
import { LOCALES, type Locale, type LocaleInfo } from '../locales';
import { currentLocale, t } from '../runtime';
import { changeLanguage } from '../sync';

/** Urdu samples render in the Urdu font even while the app is in English. */
function useUrduFont() {
  useEffect(() => {
    ensureFont(URDU_FONTS[0]);
  }, []);
}

function useSwitcher() {
  const active = currentLocale();
  const [pending, setPending] = useState<Locale | null>(null);
  const choose = (id: Locale) => {
    if (id === active || pending) return;
    setPending(id);
    void changeLanguage(id);
  };
  return { active, pending, choose };
}

const scriptProps = (l: LocaleInfo) =>
  l.dir === 'rtl' ? { dir: 'rtl' as const, lang: 'ur', className: 'font-[family:var(--font-urdu-ui)]' } : { dir: 'ltr' as const, lang: l.htmlLang };

export function LanguageCards({ className }: { className?: string }) {
  useUrduFont();
  const { active, pending, choose } = useSwitcher();
  return (
    <div role="radiogroup" aria-label="Language / Zaban / زبان" className={cn('grid gap-3 sm:grid-cols-3', className)}>
      {LOCALES.map((l) => {
        const on = l.id === active;
        const script = scriptProps(l);
        return (
          <button
            key={l.id}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={!!pending}
            onClick={() => choose(l.id)}
            className={cn(
              'relative flex min-h-[6.5rem] flex-col items-start gap-1.5 rounded-2xl border p-4 text-start transition',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
              on ? 'border-brand-500 bg-brand-50 ring-1 ring-inset ring-brand-500' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
              pending && pending !== l.id && 'opacity-60',
            )}
          >
            <span className="flex w-full items-center gap-2">
              <span {...script} className={cn('text-[1.0625rem] font-bold text-slate-900', script.className, l.dir === 'rtl' && 'leading-[1.9]')}>
                {l.native}
              </span>
              {l.native !== l.name && <span className="text-[0.75rem] font-medium text-slate-500" lang="en" dir="ltr">{l.name}</span>}
              <span className={cn('ms-auto flex h-5 w-5 items-center justify-center rounded-full', on ? 'bg-brand-600 text-white' : 'border border-slate-300')}>
                {on && <Check className="h-3.5 w-3.5" />}
              </span>
            </span>
            <span {...script} className={cn('text-[0.875rem] text-slate-600', script.className, l.dir === 'rtl' && 'leading-[1.9]')}>
              {l.sample}
            </span>
            {pending === l.id && <span className="text-[0.75rem] font-medium text-brand-700">{t('Badal rahe hain…')}</span>}
          </button>
        );
      })}
    </div>
  );
}

const SHORT: Record<Locale, string> = { en: 'English', ur: 'اردو', roman: 'Roman' };

export function LanguageSwitch({ className, showIcon = false }: { className?: string; showIcon?: boolean }) {
  useUrduFont();
  const { active, pending, choose } = useSwitcher();
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {showIcon && <Languages className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />}
      <div role="radiogroup" aria-label="Language / Zaban / زبان" className="grid flex-1 grid-cols-3 rounded-xl bg-slate-100 p-1">
        {LOCALES.map((l) => {
          const on = l.id === active;
          return (
            <button
              key={l.id}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={!!pending}
              onClick={() => choose(l.id)}
              lang={l.dir === 'rtl' ? 'ur' : l.htmlLang}
              className={cn(
                'inline-flex h-8 items-center justify-center rounded-lg px-2 text-[0.75rem] font-semibold transition disabled:cursor-wait',
                l.dir === 'rtl' && 'font-[family:var(--font-urdu-ui)] text-[0.875rem]',
                on ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800',
                pending === l.id && 'animate-pulse',
              )}
            >
              {SHORT[l.id]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
