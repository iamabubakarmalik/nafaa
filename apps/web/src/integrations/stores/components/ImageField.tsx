/**
 * One image setting (logo, banner, collection image): a preview with
 * upload, replace and remove. Uploads go through the shared upload service.
 */

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import { uploadImage } from '../lib/upload';

export function ImageField({ label, hint, value, onChange, square, disabled }: {
  label?: string;
  hint?: string;
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  /** Square preview (logo, favicon) instead of a wide one (banner). */
  square?: boolean;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error(t('Sirf tasveer chunein')); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error(t('Tasveer 8 MB se choti honi chahiye')); return; }
    setBusy(true);
    try {
      onChange(await uploadImage(file));
    } catch {
      toast.error(t('Tasveer upload nahi hui'));
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = '';
    }
  };

  return (
    <div>
      {label && <p className="mb-1 text-[0.8125rem] font-medium text-slate-700">{label}</p>}
      <div className="flex items-center gap-3">
        <button type="button" disabled={disabled || busy} onClick={() => ref.current?.click()}
          className={cn('relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-400 hover:border-brand-400 hover:text-brand-600',
            square ? 'h-16 w-16' : 'h-16 w-28')}>
          {busy ? <Loader2 className="h-5 w-5 animate-spin" />
            : value ? <img src={value} alt="" className="h-full w-full object-cover" />
              : <ImagePlus className="h-5 w-5" />}
        </button>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap gap-1.5">
            <button type="button" disabled={disabled || busy} onClick={() => ref.current?.click()}
              className="rounded-lg bg-white px-2.5 py-1 text-[0.75rem] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
              {value ? t('Badlein') : t('Upload')}
            </button>
            {value && (
              <button type="button" disabled={disabled || busy} onClick={() => onChange(null)} aria-label={t('Hatayein')}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[0.75rem] font-medium text-rose-600 hover:bg-rose-50">
                <Trash2 className="h-3.5 w-3.5" />{t('Hatayein')}
              </button>
            )}
          </div>
          {hint && <p className="text-[0.75rem] text-slate-500">{hint}</p>}
        </div>
      </div>
      <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => void pick(e.target.files?.[0])} />
    </div>
  );
}
