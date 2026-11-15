/**
 * Image upload controls for the Market: one image (logo, cover) or a list
 * (shop gallery, product photos). Files go through the shared uploads API.
 */

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { uploadsApi } from '@modules/organization/settings/api/uploads.api';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import { errorText } from '../api/market.api';

type Purpose = 'shop-logo' | 'product-image' | 'product-gallery';

async function uploadImage(file: File, purpose: Purpose): Promise<string | null> {
  if (!file.type.startsWith('image/')) { toast.error(t('Sirf tasveer (JPG, PNG, WebP)')); return null; }
  if (file.size > 10 * 1024 * 1024) { toast.error(t('Tasveer 10 MB se chhoti honi chahiye')); return null; }
  try {
    const r = await uploadsApi.single({ file, name: file.name, type: file.type }, { purpose });
    return (r as { url?: string }).url ?? null;
  } catch (e) {
    toast.error(errorText(e, t('Tasveer upload nahi hui')));
    return null;
  }
}

/** A single image with upload, replace and remove. */
export function ImageSlot({ label, value, onChange, aspect = 'square', hint, purpose = 'shop-logo', disabled }: {
  label: string; value?: string | null; onChange: (url: string) => void; aspect?: 'square' | 'wide'; hint?: string; purpose?: Purpose; disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const pick = async (file: File) => {
    setBusy(true);
    const url = await uploadImage(file, purpose);
    setBusy(false);
    if (url) onChange(url);
  };
  return (
    <div className={aspect === 'wide' ? 'min-w-0 flex-1' : 'w-32 shrink-0'}>
      <p className="mb-1.5 text-[0.8125rem] font-medium text-slate-700">{label}</p>
      <button type="button" onClick={() => ref.current?.click()} disabled={busy || disabled}
        className={cn('relative flex w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-500 transition hover:border-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-60',
          aspect === 'wide' ? 'aspect-[16/7]' : 'aspect-square')}>
        {value ? <img src={value} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <span className="flex items-center gap-1.5 text-[0.8125rem]"><ImagePlus className="h-4 w-4" />{t('Tasveer chunein')}</span>}
        {busy && <span className="absolute inset-0 flex items-center justify-center bg-white/70"><Loader2 className="h-5 w-5 animate-spin" /></span>}
      </button>
      <div className="mt-1.5 flex items-center justify-between gap-2 text-[0.75rem] text-slate-500">
        {hint && <span className="min-w-0">{hint}</span>}
        {value && !disabled && <button type="button" onClick={() => onChange('')} className="shrink-0 font-medium text-rose-600 hover:underline">{t('Hatayein')}</button>}
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void pick(f); e.target.value = ''; }} />
    </div>
  );
}

/** A row of images; the first one is the main photo. */
export function ImageList({ values, onChange, max = 8, purpose = 'product-gallery', disabled }: {
  values: string[]; onChange: (urls: string[]) => void; max?: number; purpose?: Purpose; disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const add = async (files: FileList) => {
    setBusy(true);
    const next = [...values];
    for (const f of Array.from(files).slice(0, max - values.length)) {
      const url = await uploadImage(f, purpose);
      if (url) next.push(url);
    }
    setBusy(false);
    onChange(next);
  };
  const makeMain = (i: number) => onChange([values[i], ...values.filter((_, j) => j !== i)]);
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((url, i) => (
        <div key={`${url}-${i}`} className={cn('group relative h-20 w-20 overflow-hidden rounded-xl ring-1', i === 0 ? 'ring-2 ring-brand-500' : 'ring-slate-200')}>
          <button type="button" onClick={() => makeMain(i)} disabled={disabled} title={t('Pehli tasveer banayein')} className="absolute inset-0">
            <img src={url} alt="" className="h-full w-full object-cover" />
          </button>
          {i === 0 && <span className="absolute bottom-0 start-0 end-0 bg-brand-600/90 py-0.5 text-center text-[0.625rem] font-semibold text-brand-fg">{t('Pehli')}</span>}
          {!disabled && (
            <button type="button" onClick={() => onChange(values.filter((_, j) => j !== i))} aria-label={t('Hatayein')}
              className="absolute end-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/70 text-white opacity-0 transition group-hover:opacity-100 focus:opacity-100">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}
      {values.length < max && !disabled && (
        <button type="button" onClick={() => ref.current?.click()} disabled={busy}
          className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-200 text-[0.6875rem] text-slate-500 transition hover:border-brand-400 disabled:opacity-60">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <><ImagePlus className="h-5 w-5" />{t('Tasveer')}</>}
        </button>
      )}
      <input ref={ref} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { if (e.target.files?.length) void add(e.target.files); e.target.value = ''; }} />
    </div>
  );
}
