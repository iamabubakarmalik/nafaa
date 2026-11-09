/**
 * Where the product can be bought: a searchable supplier dropdown with a
 * "+ Naya supplier" form in place (name and phone), and one row per supplier
 * with its code, usual cost, minimum order, delivery days and the preferred
 * mark. Costs are per base unit and hidden without cost.view.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, ChevronDown, Plus, Search, Star, Trash2, Truck, UserPlus, X } from 'lucide-react';
import { suppliersApi } from '@modules/purchasing/suppliers/api/suppliers.api';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { Section, inputClass } from './fields';
import type { StepContext, SupplierLinkDraft } from './types';
import { t as tr } from '@core/i18n';

const num = (v: string) => { const n = Number(v.replace(/[^\d.]/g, '')); return v.trim() && Number.isFinite(n) ? n : null; };
const day = (v?: string | null) => (v ? new Date(v).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: '2-digit' }) : '');

/** Searchable supplier list with inline create; calls onPick with the chosen supplier. */
export function SupplierPicker({ exclude, onPick }: { exclude: string[]; onPick: (s: { id: string; name: string }) => void }) {
  const qc = useQueryClient();
  const canAdd = usePermission(PERMISSIONS.SUPPLIERS_EDIT);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState<{ name: string; phone: string } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const list = useQuery({ queryKey: ['suppliers', 'picker'], queryFn: () => suppliersApi.list({ status: 'active', sort: 'recent', limit: 500 }), staleTime: 60_000, enabled: open });
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) { setOpen(false); setAdding(null); } };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  const term = q.trim().toLowerCase();
  const rows = useMemo(() => (list.data?.items ?? [])
    .filter((s) => !exclude.includes(s.id) && (!term || [s.name, s.phone, s.city].some((v) => v?.toLowerCase().includes(term))))
    .slice(0, 40), [list.data, exclude, term]);
  const create = useMutation({
    mutationFn: (v: { name: string; phone: string }) => suppliersApi.create({ name: v.name.trim(), phone: v.phone.trim() || undefined }),
    onSuccess: (s) => {
      void qc.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success(tr('Supplier "{{name}}" ban gaya', { name: s.name }));
      onPick({ id: s.id, name: s.name }); setAdding(null); setQ(''); setOpen(false);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || tr('Supplier nahi bana')),
  });
  const pick = (s: { id: string; name: string }) => { onPick(s); setQ(''); setOpen(false); };
  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className={cn(inputClass, 'flex h-10 items-center gap-2 text-start text-[0.875rem] text-slate-500')}>
        <Truck className="h-4 w-4 text-slate-400" /><span className="flex-1">{tr('Supplier chunein ya naya banayein…')}</span><ChevronDown className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          {adding ? (
            <form className="space-y-2 p-3" onSubmit={(e) => { e.preventDefault(); if (adding.name.trim()) create.mutate(adding); }}>
              <p className="text-[0.8125rem] font-semibold text-slate-800">{tr('Naya supplier')}</p>
              <input autoFocus value={adding.name} onChange={(e) => setAdding({ ...adding, name: e.target.value })} placeholder={tr('Naam (zaroori)')} className={cn(inputClass, 'h-9 text-[0.875rem]')} />
              <input value={adding.phone} inputMode="tel" onChange={(e) => setAdding({ ...adding, phone: e.target.value })} placeholder={tr('Phone (marzi)')} className={cn(inputClass, 'h-9 text-[0.875rem]')} />
              <div className="flex justify-end gap-1.5">
                <button type="button" onClick={() => setAdding(null)} className="h-9 rounded-xl px-3 text-[0.8125rem] font-semibold text-slate-600 hover:bg-slate-100">{tr('Rehne dein')}</button>
                <button type="submit" disabled={!adding.name.trim() || create.isPending} className="h-9 rounded-xl bg-brand-600 px-3 text-[0.8125rem] font-semibold text-brand-fg disabled:opacity-50">{create.isPending ? tr('Ban raha…') : tr('Banayein aur jorein')}</button>
              </div>
            </form>
          ) : (
            <>
              <div className="relative border-b border-slate-100 p-2">
                <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr('Naam, phone ya sheher…')} className={cn(inputClass, 'h-9 ps-8 text-[0.875rem]')}
                  onKeyDown={(e) => { if (e.key === 'Enter' && rows[0]) { e.preventDefault(); pick(rows[0]); } if (e.key === 'Escape') setOpen(false); }} />
              </div>
              <ul className="max-h-60 overflow-y-auto py-1">
                {list.isLoading && <li className="px-3 py-2 text-[0.8125rem] text-slate-500">{tr('Aa rahe hain…')}</li>}
                {rows.map((s) => (
                  <li key={s.id}>
                    <button type="button" onClick={() => pick(s)} className="flex w-full items-center gap-2 px-3 py-2 text-start hover:bg-slate-50">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.875rem] font-medium text-slate-900">{s.name}</span>
                        <span className="block truncate text-[0.6875rem] text-slate-500">{[s.phone, s.city].filter(Boolean).join(' · ') || '—'}</span>
                      </span>
                    </button>
                  </li>
                ))}
                {!list.isLoading && !rows.length && <li className="px-3 py-2 text-[0.8125rem] text-slate-500">{term ? tr('Is naam ka supplier nahi') : tr('Abhi koi supplier nahi')}</li>}
              </ul>
              {canAdd && (
                <button type="button" onClick={() => setAdding({ name: q.trim(), phone: '' })}
                  className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2.5 text-[0.8125rem] font-semibold text-brand-700 hover:bg-brand-50">
                  <UserPlus className="h-4 w-4" />{q.trim() ? tr('"{{name}}" naya supplier banayein', { name: q.trim() }) : tr('+ Naya supplier')}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function SuppliersField<X>({ ctx }: { ctx: StepContext<X> }) {
  const c = ctx.draft.core;
  const canCost = usePermission(PERMISSIONS.COST_VIEW);
  const canSee = usePermission(PERMISSIONS.SUPPLIERS_VIEW);
  const links = c.suppliers;
  const set = (suppliers: SupplierLinkDraft[]) => ctx.setCore({ suppliers });
  const update = (i: number, patch: Partial<SupplierLinkDraft>) => set(links.map((l, x) => (x === i ? { ...l, ...patch } : l)));
  const add = (s: { id: string; name: string }) => set([...links, {
    supplierId: s.id, supplierName: s.name, supplierSku: '', ...(canCost ? { costPrice: c.costPrice > 0 ? c.costPrice : null } : {}),
    minOrderQty: null, leadDays: null, unitId: null, isPreferred: links.length === 0, notes: '',
  }]);
  const prefer = (i: number) => set(links.map((l, x) => ({ ...l, isPreferred: x === i })));
  const remove = (i: number) => {
    const next = links.filter((_, x) => x !== i);
    if (links[i].isPreferred && next.length) next[0] = { ...next[0], isPreferred: true };
    set(next);
  };
  const packs = c.units.filter((u) => !u.isBase && u.id && u.isActive);
  if (!canSee) return null;
  return (
    <Section icon={Truck} title={tr('Suppliers — kahan se aata hai')} hint={tr('Purchase order me Preferred supplier aur uski cost khud bharti hai. Cost ek {{unit}} ki likhein.', { unit: c.unit })}>
      <SupplierPicker exclude={links.map((l) => l.supplierId)} onPick={add} />
      {links.length > 0 && (
        <div className="mt-3 space-y-2">
          {links.map((l, i) => (
            <div key={l.supplierId} className={cn('rounded-xl border p-3', l.isPreferred ? 'border-brand-200 bg-brand-50/40' : 'border-slate-200')}>
              <div className="flex flex-wrap items-center gap-2">
                <p className="min-w-0 flex-1 truncate text-[0.875rem] font-semibold text-slate-900">{l.supplierName}</p>
                <button type="button" onClick={() => prefer(i)} aria-pressed={l.isPreferred}
                  className={cn('inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-[0.75rem] font-semibold transition', l.isPreferred ? 'bg-brand-600 text-brand-fg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
                  {l.isPreferred ? <Check className="h-3.5 w-3.5" /> : <Star className="h-3.5 w-3.5" />}{l.isPreferred ? tr('Preferred') : tr('Preferred banayein')}
                </button>
                <button type="button" onClick={() => remove(i)} aria-label={tr('Hatayein')} className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-4">
                <label className="text-[0.75rem] font-medium text-slate-500">{tr('Supplier ka code (SKU)')}
                  <input value={l.supplierSku} onChange={(e) => update(i, { supplierSku: e.target.value })} className={cn(inputClass, 'mt-1 h-9 text-[0.875rem]')} />
                </label>
                {canCost && (
                  <label className="text-[0.75rem] font-medium text-slate-500">{tr('Aam cost / {{unit}}', { unit: c.unit })}
                    <input inputMode="decimal" value={l.costPrice ?? ''} onChange={(e) => update(i, { costPrice: num(e.target.value) })} className={cn(inputClass, 'mt-1 h-9 text-[0.875rem] tabular-nums')} />
                  </label>
                )}
                <label className="text-[0.75rem] font-medium text-slate-500">{tr('Kam se kam order ({{unit}})', { unit: c.unit })}
                  <input inputMode="decimal" value={l.minOrderQty ?? ''} onChange={(e) => update(i, { minOrderQty: num(e.target.value) })} className={cn(inputClass, 'mt-1 h-9 text-[0.875rem] tabular-nums')} />
                </label>
                <label className="text-[0.75rem] font-medium text-slate-500">{tr('Kitne din me aata hai')}
                  <input inputMode="numeric" value={l.leadDays ?? ''} onChange={(e) => { const n = num(e.target.value); update(i, { leadDays: n == null ? null : Math.min(365, Math.round(n)) }); }} className={cn(inputClass, 'mt-1 h-9 text-[0.875rem] tabular-nums')} />
                </label>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.75rem] text-slate-500">
                {packs.length > 0 && (
                  <label className="inline-flex items-center gap-1.5">{tr('Aksar is me mangwate hain:')}
                    <select value={l.unitId ?? ''} onChange={(e) => update(i, { unitId: e.target.value || null })} className="h-7 rounded-lg border border-slate-200 bg-white px-1.5 text-[0.75rem] text-slate-700">
                      <option value="">{c.unit}</option>
                      {packs.map((u) => <option key={u.id} value={u.id}>{u.unitName} ({u.conversionRate} {c.unit})</option>)}
                    </select>
                  </label>
                )}
                {canCost && l.lastPurchasePrice != null && l.lastPurchasePrice > 0 && (
                  <span>{tr('Pichhli purchase: {{price}} / {{unit}} · {{date}}', { price: formatPKR(l.lastPurchasePrice), unit: c.unit, date: day(l.lastPurchasedAt) })}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {!links.length && <p className="mt-2 flex items-center gap-1.5 text-[0.75rem] text-slate-500"><Plus className="h-3.5 w-3.5" />{tr('Marzi hai — purchase karne par supplier khud jur jata hai')}</p>}
      {links.length > 0 && !links.some((l) => l.isPreferred) && <p className="mt-2 flex items-center gap-1 text-[0.75rem] text-amber-700"><X className="h-3.5 w-3.5" />{tr('Ek supplier Preferred chunein')}</p>}
    </Section>
  );
}
