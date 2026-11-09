/**
 * Product search for the social studio: photo, price and shop link. Picked
 * products show as chips; the list shows recent products until you type.
 */

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, ImageOff, Package, X } from 'lucide-react';
import { SearchField } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { t } from '@core/i18n';
import { socialApi, type SocialProduct } from './social.api';

export const rs = (n: number) => formatPKR(n, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export function ProductThumb({ src, size = 40 }: { src?: string | null; size?: number }) {
  return (
    <span className="flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200" style={{ width: size, height: size }}>
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <ImageOff className="h-4 w-4 text-slate-400" />}
    </span>
  );
}

export function ProductPicker({ value, onChange, max = 10 }: { value: SocialProduct[]; onChange: (v: SocialProduct[]) => void; max?: number }) {
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  useEffect(() => { const id = setTimeout(() => setTerm(search.trim()), 300); return () => clearTimeout(id); }, [search]);
  const q = useQuery({ queryKey: ['social', 'products', term], queryFn: () => socialApi.products({ search: term }), placeholderData: (p) => p, staleTime: 60_000 });
  const picked = new Set(value.map((p) => p.id));
  const toggle = (p: SocialProduct) => {
    if (picked.has(p.id)) onChange(value.filter((x) => x.id !== p.id));
    else if (value.length < max) onChange(max === 1 ? [p] : [...value, p]);
  };

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((p) => (
            <span key={p.id} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 py-0.5 pe-1 ps-0.5 text-[0.75rem] font-medium text-slate-800 ring-1 ring-slate-200">
              <ProductThumb src={p.images[0]} size={22} />
              <span className="max-w-[10rem] truncate">{p.name}</span>
              <button type="button" onClick={() => toggle(p)} aria-label={t('Hataein')} className="rounded-full p-0.5 text-slate-500 hover:bg-slate-200"><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
      )}
      <SearchField value={search} onChange={setSearch} placeholder={t('Product dhoondein…')} label={t('Product search')} />
      <ul className="max-h-56 divide-y divide-slate-100 overflow-auto rounded-xl ring-1 ring-slate-200">
        {(q.data ?? []).map((p) => (
          <li key={p.id}>
            <button type="button" onClick={() => toggle(p)} className={cn('flex w-full items-center gap-2.5 px-3 py-2 text-start hover:bg-slate-50', picked.has(p.id) && 'bg-sky-50/60')}>
              <ProductThumb src={p.images[0]} size={32} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.8125rem] font-medium text-slate-900">{p.name}</span>
                <span className="block text-[0.6875rem] text-slate-500">
                  {rs(p.price)}{p.comparePrice && p.comparePrice > p.price ? ` · ${t('pehle')} ${rs(p.comparePrice)}` : ''}{p.link ? ` · ${t('link hai')}` : ''}
                </span>
              </span>
              {picked.has(p.id) && <Check className="h-4 w-4 text-sky-600" />}
            </button>
          </li>
        ))}
        {q.data && !q.data.length && <li className="flex items-center gap-2 px-3 py-3 text-[0.8125rem] text-slate-500"><Package className="h-4 w-4" />{t('Koi product nahi mila')}</li>}
      </ul>
    </div>
  );
}
