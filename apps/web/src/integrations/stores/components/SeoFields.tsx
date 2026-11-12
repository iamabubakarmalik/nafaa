/**
 * Search-engine fields shared by pages, posts, collections and products:
 * the Google title and description with a live preview of the result, and
 * the page address (handle).
 */

import { Input, Textarea } from '@/design-system/components';
import { t } from '@core/i18n';
import { cn } from '@core/lib/cn';
import { toHandle } from '../lib/format';

export function SeoFields({ base, prefix, handle, onHandle, title, onTitle, description, onDescription, fallbackTitle, fallbackDescription }: {
  /** Store address, e.g. https://hiba.nafaa.store */
  base: string;
  /** URL folder, e.g. /pages/ */
  prefix: string;
  handle: string;
  onHandle?: (v: string) => void;
  title: string;
  onTitle: (v: string) => void;
  description: string;
  onDescription: (v: string) => void;
  fallbackTitle: string;
  fallbackDescription: string;
}) {
  const shownTitle = title || fallbackTitle;
  const shownDesc = description || fallbackDescription;
  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200/70">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-400">{t('Google me aise dikhega')}</p>
        <p className="mt-1 truncate text-[0.75rem] text-slate-600 dir-ltr">{base.replace(/^https?:\/\//, '')}{prefix}{handle}</p>
        <p className="truncate text-[1rem] font-medium text-[#1a0dab]">{shownTitle || t('Page ka naam')}</p>
        <p className="line-clamp-2 text-[0.8125rem] text-slate-600">{shownDesc || t('Page ki chhoti tafseel yahan dikhegi.')}</p>
      </div>
      {onHandle && (
        <Input label={t('Page ka address (URL)')} value={handle} onChange={(e) => onHandle(toHandle(e.target.value))}
          leftIcon={<span className="text-[0.75rem] text-slate-400 dir-ltr">{prefix}</span>} hint={t('Badalne par purana address khud naye par bhej diya jata hai')} />
      )}
      <Counter label={t('Google title')} value={title} max={70} onChange={onTitle} placeholder={fallbackTitle} />
      <Counter label={t('Google tafseel')} value={description} max={160} onChange={onDescription} placeholder={fallbackDescription} multiline />
    </div>
  );
}

function Counter({ label, value, max, onChange, placeholder, multiline }: { label: string; value: string; max: number; onChange: (v: string) => void; placeholder?: string; multiline?: boolean }) {
  const over = value.length > max;
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-[0.8125rem] font-medium text-slate-700">
        {label}<span className={cn('tabular-nums text-[0.75rem]', over ? 'text-rose-600' : 'text-slate-400')}>{value.length}/{max}</span>
      </span>
      {multiline
        ? <Textarea rows={2} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
        : <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />}
    </label>
  );
}

/** Plain text from HTML, for fallback descriptions. */
export const textOf = (html: string | null | undefined, max = 160) => (html ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
