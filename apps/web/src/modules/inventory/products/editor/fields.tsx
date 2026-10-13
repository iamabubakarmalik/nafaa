/** Small building blocks shared by every product editor step. */

import { useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Check, Plus, ScanLine, Search, Sparkles, Star, Wand2, X, type LucideIcon } from 'lucide-react';
import { Field } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { UploadDropzone } from '@core/components/uploads/UploadDropzone';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import { brandsApi } from '@modules/inventory/brands/api/brands.api';
import { tagsApi } from '@modules/inventory/tags/api/tags.api';
import { autoSku } from './draft';
import type { ImageDraft } from './types';

export function Section({ icon: Icon, title, hint, children, actions, className }: {
  icon?: LucideIcon; title: ReactNode; hint?: ReactNode; children: ReactNode; actions?: ReactNode; className?: string;
}) {
  return (
    <section className={cn('rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5', className)}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          {Icon && <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Icon className="h-4 w-4" /></span>}
          <div className="min-w-0">
            <h3 className="text-[0.9375rem] font-semibold text-slate-900">{title}</h3>
            {hint && <p className="mt-0.5 text-[0.75rem] text-slate-500">{hint}</p>}
          </div>
        </div>
        {actions}
      </header>
      {children}
    </section>
  );
}

const inputCls = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[0.9375rem] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20';
export const inputClass = inputCls;

export function TextField({ label, value, onChange, onBlur, error, hint, required, placeholder, autoFocus, big, right }: {
  label: ReactNode; value: string; onChange: (v: string) => void; onBlur?: () => void; error?: string; hint?: ReactNode;
  required?: boolean; placeholder?: string; autoFocus?: boolean; big?: boolean; right?: ReactNode;
}) {
  return (
    <Field label={label} error={error} hint={hint} required={required}>
      {(id, d) => (
        <div className="flex gap-2">
          <input id={id} aria-describedby={d} value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} placeholder={placeholder} autoFocus={autoFocus}
            className={cn(inputCls, big && 'h-12 text-[1.0625rem] font-semibold', error && 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20')} />
          {right}
        </div>
      )}
    </Field>
  );
}

/** Number input that keeps an empty box empty instead of showing 0. */
export function NumberField({ label, value, onChange, onBlur, error, hint, prefix, suffix, required, placeholder, allowEmpty, big }: {
  label: ReactNode; value: number | null; onChange: (v: number | null) => void; onBlur?: () => void; error?: string; hint?: ReactNode;
  prefix?: string; suffix?: string; required?: boolean; placeholder?: string; allowEmpty?: boolean; big?: boolean;
}) {
  const [text, setText] = useState<string | null>(null);
  const shown = text ?? (value === null || (value === 0 && allowEmpty) ? '' : String(value));
  return (
    <Field label={label} error={error} hint={hint} required={required}>
      {(id, d) => (
        <div className="relative">
          {prefix && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[0.8125rem] font-medium text-slate-400">{prefix}</span>}
          <input id={id} aria-describedby={d} inputMode="decimal" value={shown} placeholder={placeholder ?? '0'}
            onChange={(e) => {
              const t = e.target.value.replace(/[^\d.]/g, '');
              setText(t);
              onChange(t === '' ? (allowEmpty ? null : 0) : Number(t));
            }}
            onBlur={() => { setText(null); onBlur?.(); }}
            className={cn(inputCls, 'tabular-nums', prefix && 'pl-11', suffix && 'pr-12', big && 'h-12 text-[1.125rem] font-bold', error && 'border-rose-400')} />
          {suffix && <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[0.75rem] font-medium text-slate-400">{suffix}</span>}
        </div>
      )}
    </Field>
  );
}

export function Tiles<T extends string>({ value, onChange, options, columns = 'grid-cols-3 sm:grid-cols-4' }: {
  value: T; onChange: (v: T) => void; options: Array<{ value: T; label: string; hint?: string; icon?: LucideIcon | string }>; columns?: string;
}) {
  return (
    <div className={cn('grid gap-2', columns)} role="radiogroup">
      {options.map((o) => {
        const on = o.value === value;
        const Icon = o.icon;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={on} onClick={() => onChange(o.value)}
            className={cn('relative flex min-h-[3rem] flex-col items-center justify-center gap-0.5 rounded-xl border px-2 py-2 text-center transition',
              on ? 'border-brand-500 bg-brand-50 text-brand-800 ring-2 ring-brand-500/20' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50')}>
            {typeof Icon === 'string' ? <span className="text-lg leading-none">{Icon}</span> : Icon ? <Icon className="h-4 w-4" /> : null}
            <span className="text-[0.8125rem] font-semibold leading-tight">{o.label}</span>
            {o.hint && <span className="text-[0.6875rem] leading-tight text-slate-500">{o.hint}</span>}
            {on && <Check className="absolute right-1.5 top-1.5 h-3.5 w-3.5 text-brand-600" />}
          </button>
        );
      })}
    </div>
  );
}

export function Chip({ on, onClick, children, color }: { on: boolean; onClick: () => void; children: ReactNode; color?: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on}
      className={cn('inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[0.8125rem] font-medium transition',
        on ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}
      style={on && color ? { backgroundColor: color } : undefined}>
      {on && <Check className="h-3.5 w-3.5" />}{children}
    </button>
  );
}

export function Toggle({ on, onChange, title, hint, icon: Icon }: { on: boolean; onChange: (v: boolean) => void; title: ReactNode; hint?: ReactNode; icon?: LucideIcon }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)}
      className={cn('flex w-full items-center gap-3 rounded-xl border p-3 text-left transition', on ? 'border-brand-300 bg-brand-50/60' : 'border-slate-200 bg-white hover:bg-slate-50')}>
      {Icon && <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', on ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500')}><Icon className="h-4 w-4" /></span>}
      <span className="min-w-0 flex-1">
        <span className="block text-[0.875rem] font-semibold text-slate-900">{title}</span>
        {hint && <span className="block text-[0.75rem] text-slate-500">{hint}</span>}
      </span>
      <span className={cn('relative h-6 w-11 shrink-0 rounded-full transition', on ? 'bg-brand-600' : 'bg-slate-300')}>
        <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition', on ? 'left-[1.375rem]' : 'left-0.5')} />
      </span>
    </button>
  );
}

const CATEGORY_COLORS = ['#2563eb', '#16a34a', '#d97706', '#db2777', '#7c3aed', '#0891b2', '#ea580c', '#65a30d'];

/** Category chips with search and create-in-place. */
export function CategoryField({ value, onChange, suggestions, error }: {
  value: string | null; onChange: (id: string | null, name?: string) => void; suggestions?: string[]; error?: string;
}) {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list, staleTime: 5 * 60_000 });
  const [q, setQ] = useState('');
  const create = useMutation({
    mutationFn: (name: string) => categoriesApi.create({ name, color: CATEGORY_COLORS[data.length % CATEGORY_COLORS.length] }),
    onSuccess: (c) => { qc.invalidateQueries({ queryKey: ['categories'] }); onChange(c.id, c.name); setQ(''); toast.success(`Category "${c.name}" ban gayi`); },
    onError: (e: Error) => toast.error(e.message || 'Category nahi bani'),
  });
  const term = q.trim().toLowerCase();
  // Switched-off categories are not offered, unless this product already has one.
  const shown = data.filter((c) => (c.isActive !== false || c.id === value) && (!term || c.name.toLowerCase().includes(term)));
  const exact = data.some((c) => c.name.toLowerCase() === term);
  const missing = (suggestions ?? []).filter((s) => !data.some((c) => c.name.toLowerCase() === s.toLowerCase())).slice(0, 6);
  return (
    <Field label="Category" error={error}>
      {() => (
        <div className="space-y-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ya nayi likhein…"
              onKeyDown={(e) => { if (e.key === 'Enter' && term && !exact) { e.preventDefault(); create.mutate(q.trim()); } }}
              className={cn(inputCls, 'h-10 pl-9 text-[0.875rem]')} />
          </div>
          <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
            <Chip on={!value} onClick={() => onChange(null)}>Koi nahi</Chip>
            {shown.map((c) => <Chip key={c.id} on={value === c.id} color={c.color} onClick={() => onChange(c.id, c.name)}>{c.name}</Chip>)}
            {term && !exact && (
              <button type="button" disabled={create.isPending} onClick={() => create.mutate(q.trim())}
                className="inline-flex h-8 items-center gap-1 rounded-full border border-dashed border-brand-400 px-3 text-[0.8125rem] font-semibold text-brand-700 hover:bg-brand-50">
                <Plus className="h-3.5 w-3.5" />"{q.trim()}" banayein
              </button>
            )}
          </div>
          {missing.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-[0.75rem] text-slate-500">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />Ek click mein:
              {missing.map((s) => <button key={s} type="button" onClick={() => create.mutate(s)} className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-800 hover:bg-amber-100">+ {s}</button>)}
            </div>
          )}
        </div>
      )}
    </Field>
  );
}

export function BrandField({ value, onChange }: { value: string | null; onChange: (id: string | null) => void }) {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ['brands'], queryFn: () => brandsApi.list(), staleTime: 5 * 60_000 });
  const [adding, setAdding] = useState('');
  const create = useMutation({
    mutationFn: (name: string) => brandsApi.create({ name, isActive: true }),
    onSuccess: (b: { id: string; name: string }) => { qc.invalidateQueries({ queryKey: ['brands'] }); onChange(b.id); setAdding(''); toast.success(`Brand "${b.name}" ban gaya`); },
    onError: (e: Error) => toast.error(e.message || 'Brand nahi bana'),
  });
  const all = (Array.isArray(data) ? data : (data as { items?: Array<{ id: string; name: string; isActive?: boolean }> }).items ?? []) as Array<{ id: string; name: string; isActive?: boolean }>;
  const list = all.filter((b) => b.isActive !== false || b.id === value);
  return (
    <Field label="Brand">
      {(id) => (
        <div className="flex gap-2">
          <select id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} className={cn(inputCls, 'flex-1')}>
            <option value="">Koi brand nahi</option>
            {list.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <input value={adding} onChange={(e) => setAdding(e.target.value)} placeholder="Naya brand"
            onKeyDown={(e) => { if (e.key === 'Enter' && adding.trim()) { e.preventDefault(); create.mutate(adding.trim()); } }}
            className={cn(inputCls, 'w-32 sm:w-40')} />
          <button type="button" disabled={!adding.trim() || create.isPending} onClick={() => create.mutate(adding.trim())} aria-label="Brand banayein"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white disabled:opacity-40"><Plus className="h-4 w-4" /></button>
        </div>
      )}
    </Field>
  );
}

export function TagsField({ value, onChange }: { value: string[]; onChange: (ids: string[]) => void }) {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ['tags'], queryFn: tagsApi.list, staleTime: 5 * 60_000 });
  const [name, setName] = useState('');
  const create = useMutation({
    mutationFn: (n: string) => tagsApi.create({ name: n }),
    onSuccess: (t: { id: string }) => { qc.invalidateQueries({ queryKey: ['tags'] }); onChange([...value, t.id]); setName(''); },
    onError: (e: Error) => toast.error(e.message || 'Tag nahi bana'),
  });
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <Field label="Tags" hint="Dhoondne aur filter ke liye — jaise #sasta, #naya, #ramzan">
      {() => (
        <div className="flex flex-wrap items-center gap-1.5">
          {data.map((t: { id: string; name: string; color?: string }) => <Chip key={t.id} on={value.includes(t.id)} color={t.color} onClick={() => toggle(t.id)}>#{t.name}</Chip>)}
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="+ naya tag"
            onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) { e.preventDefault(); create.mutate(name.trim()); } }}
            className="h-8 w-28 rounded-full border border-dashed border-slate-300 bg-transparent px-3 text-[0.8125rem] outline-none focus:border-brand-500" />
        </div>
      )}
    </Field>
  );
}

/** Upload, reorder and remove pictures; the first one is the main picture. */
export function ImagesField({ value, onChange, max = 10 }: { value: ImageDraft[]; onChange: (v: ImageDraft[]) => void; max?: number }) {
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {value.map((img, i) => (
            <figure key={img.id ?? img.url} className={cn('group relative aspect-square overflow-hidden rounded-xl bg-slate-100 ring-1', i === 0 ? 'ring-2 ring-brand-500' : 'ring-slate-200')}>
              <img src={img.url} alt="" className="h-full w-full object-cover" />
              {i === 0 && <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-md bg-brand-600 px-1.5 py-0.5 text-[0.625rem] font-bold text-white"><Star className="h-3 w-3 fill-current" />Main</span>}
              <div className="absolute inset-x-1 bottom-1 flex justify-between opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                <span className="flex gap-1">
                  {i > 0 && <button type="button" onClick={() => move(i, -1)} aria-label="Pehle" className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 text-slate-700 shadow"><ArrowLeft className="h-3.5 w-3.5" /></button>}
                  {i < value.length - 1 && <button type="button" onClick={() => move(i, 1)} aria-label="Baad mein" className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 text-slate-700 shadow"><ArrowRight className="h-3.5 w-3.5" /></button>}
                </span>
                <button type="button" onClick={() => onChange(value.filter((_, x) => x !== i))} aria-label="Hatayein" className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-600 text-white shadow"><X className="h-3.5 w-3.5" /></button>
              </div>
            </figure>
          ))}
        </div>
      )}
      {value.length < max && (
        <UploadDropzone purpose="product-image" maxFiles={max - value.length} hint="Pehli tasveer main hogi — teer se sort badlein"
          onUploaded={(records) => onChange([...value, ...records.map((r) => ({ url: r.url }))])} />
      )}
    </div>
  );
}

/** SKU with an auto button, barcode with a camera scan button. */
export function CodeFields({ name, sku, barcode, prefix, onSku, onBarcode }: {
  name: string; sku: string; barcode: string; prefix: string; onSku: (v: string) => void; onBarcode: (v: string) => void;
}) {
  const [scan, setScan] = useState(false);
  const btn = 'inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-slate-100 px-3 text-[0.8125rem] font-semibold text-slate-700 hover:bg-slate-200';
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {scan && <BarcodeScanner onDetected={(c: string) => { onBarcode(c); setScan(false); }} onClose={() => setScan(false)} />}
      <TextField label="SKU (apna code)" value={sku} onChange={onSku} placeholder="Khali chhorein to khud ban jayega"
        right={<button type="button" onClick={() => onSku(autoSku(name, prefix))} className={btn}><Wand2 className="h-4 w-4" />Auto</button>} />
      <TextField label="Barcode" value={barcode} onChange={onBarcode} placeholder="Dabbe par likha number"
        right={<button type="button" onClick={() => setScan(true)} className={btn}><ScanLine className="h-4 w-4" />Scan</button>} />
    </div>
  );
}

/** Live profit card for a cost and a sale price. */
export function MarginCard({ cost, price, money }: { cost: number; price: number; money: (n: number) => string }) {
  const profit = price - cost;
  const margin = price > 0 ? (profit / price) * 100 : 0;
  const tone = !price || !cost ? 'slate' : profit < 0 ? 'rose' : margin >= 20 ? 'success' : 'amber';
  const advice = !price ? 'Bechne ki qeemat likhein' : !cost ? 'Cost likhein to profit dikhega' : profit < 0 ? 'Cost se sasta bik raha hai — ghata hoga' : margin < 10 ? 'Profit kam hai — rate dobara dekh lein' : margin >= 20 ? 'Acha profit' : 'Theek profit';
  const cls = { slate: 'bg-slate-50 text-slate-700', rose: 'bg-rose-50 text-rose-800', success: 'bg-success-50 text-success-800', amber: 'bg-amber-50 text-amber-900' }[tone];
  const bar = { slate: 'bg-slate-300', rose: 'bg-rose-500', success: 'bg-success-500', amber: 'bg-amber-400' }[tone];
  return (
    <div className={cn('rounded-2xl p-4', cls)}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[0.75rem] font-medium opacity-80">Har ek par profit</p>
          <p className="text-[1.375rem] font-bold tabular-nums">{price && cost ? money(profit) : '—'}</p>
        </div>
        <p className="text-[1.75rem] font-bold tabular-nums">{price && cost ? `${margin.toFixed(1)}%` : ''}</p>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/60"><div className={cn('h-full rounded-full transition-all', bar)} style={{ width: `${Math.max(0, Math.min(100, margin * 2))}%` }} /></div>
      <p className="mt-2 text-[0.75rem] font-medium">{advice}</p>
    </div>
  );
}
