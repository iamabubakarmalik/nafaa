/**
 * Renders a section's or block's settings from the API theme schema
 * (SettingField list). Collection and product pickers read the store's own
 * lists; text marked "translatable" gets an Urdu box when the store has
 * Urdu turned on.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { Input, Select, Switch, Textarea } from '@/design-system/components';
import { t } from '@core/i18n';
import { storesApi, type SettingField } from '../api/stores.api';
import { SK } from '../lib/hooks';
import { fieldLabel } from '../lib/sections';
import { ImageField } from './ImageField';
import { RichTextEditor } from './RichTextEditor';

type Values = Record<string, unknown>;
type Localized = { en?: string; ur?: string };

const asText = (v: unknown, lang: 'en' | 'ur' = 'en'): string => {
  if (v == null) return '';
  if (typeof v === 'object') return String((v as Localized)[lang] ?? '');
  return lang === 'en' ? String(v) : '';
};

export function SettingsForm({ storeId, fields, values, onChange, urdu }: {
  storeId: string;
  fields: SettingField[];
  values: Values;
  /** `tag` groups quick typing in one box into one undo step. */
  onChange: (next: Values, tag?: string) => void;
  /** Store has Urdu turned on: translatable text gets a second box. */
  urdu?: boolean;
}) {
  const needs = new Set(fields.map((f) => f.type));
  const collections = useQuery({ queryKey: SK.collections(storeId), queryFn: () => storesApi.collections(storeId), enabled: needs.has('collection'), staleTime: 60_000 });

  const set = (key: string, v: unknown, typing = false) => onChange({ ...values, [key]: v }, typing ? key : undefined);
  const setLocalized = (f: SettingField, lang: 'en' | 'ur', text: string) => {
    const cur = values[f.key];
    const base: Localized = cur && typeof cur === 'object' ? { ...(cur as Localized) } : { en: asText(cur) };
    base[lang] = text;
    set(f.key, base.ur ? base : (base.en ?? ''), true);
  };

  if (!fields.length) return <p className="text-[0.8125rem] text-slate-500">{t('Is hisse me badalne ko kuch nahi.')}</p>;

  return (
    <div className="space-y-3.5">
      {fields.map((f) => {
        const label = fieldLabel(f);
        const hint = f.help ? t(f.help) : undefined;
        const val = values[f.key] ?? f.default;
        switch (f.type) {
          case 'text': case 'url': case 'video': case 'textarea': {
            const multi = f.type === 'textarea';
            const both = f.translatable && urdu;
            const box = (lang: 'en' | 'ur') => (multi
              ? <Textarea rows={3} value={asText(val, lang)} dir={lang === 'ur' ? 'rtl' : undefined} onChange={(e) => (f.translatable ? setLocalized(f, lang, e.target.value) : set(f.key, e.target.value, true))} />
              : <Input value={asText(val, lang)} dir={lang === 'ur' ? 'rtl' : undefined} inputMode={f.type === 'text' ? undefined : 'url'}
                placeholder={f.type === 'video' ? 'https://youtube.com/watch?v=...' : undefined}
                onChange={(e) => (f.translatable ? setLocalized(f, lang, e.target.value) : set(f.key, e.target.value, true))} />);
            return (
              <div key={f.key}>
                <p className="mb-1 text-[0.8125rem] font-medium text-slate-700">{label}</p>
                {both ? (
                  <div className="space-y-1.5">
                    <div className="flex items-start gap-2"><span className="mt-2 w-7 shrink-0 text-[0.6875rem] font-bold text-slate-400">EN</span><div className="min-w-0 flex-1">{box('en')}</div></div>
                    <div className="flex items-start gap-2"><span className="mt-2 w-7 shrink-0 text-[0.6875rem] font-bold text-slate-400">اردو</span><div className="min-w-0 flex-1">{box('ur')}</div></div>
                  </div>
                ) : box('en')}
                {hint && <p className="mt-1 text-[0.75rem] text-slate-500">{hint}</p>}
              </div>
            );
          }
          case 'richtext':
            return (
              <div key={f.key}>
                <p className="mb-1 text-[0.8125rem] font-medium text-slate-700">{label}</p>
                <RichTextEditor value={asText(val)} onChange={(html) => set(f.key, html, true)} minHeight={120} />
              </div>
            );
          case 'image':
            return <ImageField key={f.key} label={label} hint={hint} value={asText(val) || null} onChange={(url) => set(f.key, url ?? '')} />;
          case 'color':
            return <ColorInput key={f.key} label={label} value={asText(val) || '#000000'} onChange={(v) => set(f.key, v, true)} />;
          case 'date':
            return <Input key={f.key} type="datetime-local" label={label} hint={hint} value={asText(val).slice(0, 16)} onChange={(e) => set(f.key, e.target.value)} />;
          case 'number':
            return <Input key={f.key} type="number" label={label} hint={hint} value={val == null ? '' : String(val)} min={f.min} max={f.max} step={f.step}
              onChange={(e) => set(f.key, e.target.value === '' ? null : Number(e.target.value), true)} />;
          case 'checkbox':
            return <Switch key={f.key} label={label} description={hint} checked={!!val} onChange={(e) => set(f.key, e.target.checked)} />;
          case 'select':
            return <Select key={f.key} label={label} hint={hint} value={asText(val)} options={(f.options ?? []).map((o) => ({ value: o.value, label: t(o.label) }))} onChange={(e) => set(f.key, e.target.value)} />;
          case 'range': {
            const n = Number(val ?? f.min ?? 0);
            return (
              <label key={f.key} className="block">
                <span className="mb-1 flex items-center justify-between text-[0.8125rem] font-medium text-slate-700">
                  {label}<span className="tabular-nums text-slate-500">{n}{f.unit ?? ''}</span>
                </span>
                <input type="range" min={f.min ?? 0} max={f.max ?? 100} step={f.step ?? 1} value={n} onChange={(e) => set(f.key, Number(e.target.value), true)}
                  className="w-full accent-brand-600" />
                {hint && <span className="mt-0.5 block text-[0.75rem] text-slate-500">{hint}</span>}
              </label>
            );
          }
          case 'collection':
            return <Select key={f.key} label={label} hint={hint} value={asText(val)}
              options={[{ value: '', label: t('Sab products') }, ...(collections.data ?? []).map((c) => ({ value: c.handle, label: c.title }))]}
              onChange={(e) => set(f.key, e.target.value)} />;
          case 'product': case 'products':
            return <ProductPicker key={f.key} storeId={storeId} label={label} multi={f.type === 'products'}
              value={f.type === 'products' ? (Array.isArray(val) ? (val as string[]) : []) : (asText(val) ? [asText(val)] : [])}
              onChange={(ids) => set(f.key, f.type === 'products' ? ids : (ids[0] ?? ''))} />;
          default:
            return null;
        }
      })}
    </div>
  );
}

export function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-[0.8125rem] font-medium text-slate-700">{label}</span>
      <span className="flex items-center gap-2">
        <input value={value} onChange={(e) => onChange(e.target.value)} maxLength={7}
          className="w-20 rounded-lg border border-slate-200 px-2 py-1 font-mono text-[0.75rem] uppercase text-slate-700 dir-ltr" />
        <input type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'} onChange={(e) => onChange(e.target.value)}
          className="h-8 w-8 cursor-pointer rounded-lg border border-slate-200 bg-white p-0.5" aria-label={label} />
      </span>
    </label>
  );
}

/** Picks one or more website products by name search. Stores product ids. */
export function ProductPicker({ storeId, label, value, onChange, multi, max = 12 }: {
  storeId: string; label: string; value: string[]; onChange: (ids: string[]) => void; multi?: boolean; max?: number;
}) {
  const [q, setQ] = useState('');
  const search = useQuery({
    queryKey: [...SK.products(storeId), 'picker', q],
    queryFn: () => storesApi.products(storeId, { search: q, limit: 8 }),
    enabled: q.trim().length >= 2,
    staleTime: 30_000,
  });
  const chosen = useQuery({
    queryKey: [...SK.products(storeId), 'picked', value.join(',')],
    queryFn: () => Promise.all(value.map((id) => storesApi.product(storeId, id).catch(() => null))),
    enabled: value.length > 0,
    staleTime: 60_000,
  });
  const names = new Map((chosen.data ?? []).filter(Boolean).map((p) => [p!.productId, p!.name]));
  const add = (id: string) => {
    if (value.includes(id)) return;
    onChange(multi ? [...value, id].slice(0, max) : [id]);
    setQ('');
  };
  return (
    <div>
      <p className="mb-1 text-[0.8125rem] font-medium text-slate-700">{label}</p>
      {value.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1.5">
          {value.map((id) => (
            <span key={id} className="inline-flex max-w-full items-center gap-1 rounded-lg bg-slate-100 py-0.5 pe-1 ps-2 text-[0.75rem] text-slate-700">
              <span className="truncate">{names.get(id) ?? '…'}</span>
              <button type="button" onClick={() => onChange(value.filter((x) => x !== id))} aria-label={t('Hatayein')} className="rounded p-0.5 hover:bg-slate-200"><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
      )}
      {(multi || value.length === 0) && (
        <div className="relative">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Product ka naam likhein')} leftIcon={<Search className="h-4 w-4" />} />
          {q.trim().length >= 2 && (
            <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-60 overflow-auto rounded-xl bg-white py-1 shadow-lg ring-1 ring-slate-200">
              {(search.data?.items ?? []).map((p) => (
                <li key={p.productId}>
                  <button type="button" onClick={() => add(p.productId)} className="flex w-full items-center gap-2 px-3 py-1.5 text-start text-[0.8125rem] hover:bg-slate-50">
                    {p.image ? <img src={p.image} alt="" className="h-7 w-7 rounded object-cover" /> : <span className="h-7 w-7 rounded bg-slate-100" />}
                    <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  </button>
                </li>
              ))}
              {search.data && !search.data.items.length && <li className="px-3 py-2 text-[0.8125rem] text-slate-500">{t('Kuch nahi mila')}</li>}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
