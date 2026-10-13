/**
 * Bakery: besides what to bake (the main list marks items made in-house),
 * two things need watching every morning. Raw materials (maida, cheeni,
 * makkhan) — without them nothing can be made — and fresh goods that must
 * sell today or be thrown away.
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MessageCircle, ShoppingCart, Timer, Wheat } from 'lucide-react';
import { Button, Skeleton } from '@/design-system/components';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { cn } from '@core/lib/cn';
import { waLink } from '@core/lib/whatsapp/templates';
import { useAuthStore } from '@core/stores/auth.store';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import type { PurchasePrefill } from '@modules/purchasing/purchases/editor/PurchaseEditorPage';
import { ingredientsApi } from '@industries/bakery/api/ingredients.api';
import { freshnessApi } from '@industries/bakery/api/freshness.api';
import { openWhatsApp, qty } from '../meta';

const hoursLeft = (iso?: string) => {
  const t = iso ? new Date(iso).getTime() : NaN;
  return Number.isNaN(t) ? null : (t - Date.now()) / 3_600_000;
};
const hoursText = (h: number) => {
  if (h < 0) return Math.abs(h) < 24 ? `${Math.round(Math.abs(h))} ghante guzar gaye` : `${Math.round(Math.abs(h) / 24)} din guzar gaye`;
  if (h < 1) return `${Math.round(h * 60)} minute baqi`;
  return `${Math.round(h)} ghante baqi`;
};

/** Fresh goods whose time runs out within a day. */
export function BakeryBanner() {
  const { data } = useQuery({ queryKey: ['bakery-freshness-low'], queryFn: () => freshnessApi.list({}), retry: false });
  const rows = useMemo(() => (data ?? [])
    .filter((f) => f.status !== 'DISCARDED' && Number(f.currentQty) > 0)
    .map((f) => ({ ...f, left: hoursLeft(f.expiryDate || f.bestBefore) }))
    .filter((f) => f.left !== null && f.left < 24)
    .sort((a, b) => a.left! - b.left!), [data]);
  if (!rows.length) return null;
  const gone = rows.filter((f) => f.left! <= 0).length;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200/70">
      <span className="inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-amber-900">
        <Timer className="h-4 w-4 text-amber-600" />Aaj hi bech dein{gone ? ` · ${gone} ka waqt guzar gaya` : ''}:
      </span>
      {rows.slice(0, 8).map((f) => (
        <span key={f.id} className={cn('rounded-full bg-white px-2.5 py-1 text-[0.75rem] font-medium ring-1', f.left! <= 0 ? 'text-rose-800 ring-rose-200' : 'text-amber-900 ring-amber-200')}>
          {f.productName} · {qty(Number(f.currentQty))} · {hoursText(f.left!)}
        </span>
      ))}
    </div>
  );
}

/** Raw materials at or under their level, with an order and a WhatsApp list. */
export function BakeryIngredients() {
  const navigate = useNavigate();
  const { cost } = useMasked();
  const shop = useAuthStore((s) => s.user?.assignedShop?.name ?? s.tenant?.name ?? '');
  const canBuy = usePermission(PERMISSIONS.PURCHASES_CREATE);
  const [onlyCritical, setOnlyCritical] = useState(false);
  const { data, isLoading, error } = useQuery({ queryKey: ['bakery-ingredients-low'], queryFn: () => ingredientsApi.list({}), retry: false });

  const rows = useMemo(() => (data ?? [])
    .filter((i) => i.isActive !== false)
    .map((i) => {
      const level = Number(i.reorderLevel ?? i.minStock ?? 0);
      const have = Number(i.currentStock) || 0;
      return { ...i, level, have, short: Math.max(level - have, 0) };
    })
    .filter((i) => i.have <= i.level && (!onlyCritical || i.isCritical || i.have <= 0))
    .sort((a, b) => Number(b.have <= 0) - Number(a.have <= 0) || Number(b.isCritical) - Number(a.isCritical) || b.short - a.short), [data, onlyCritical]);

  // Raw materials name their supplier as text; one WhatsApp list per supplier.
  const bySupplier = useMemo(() => {
    const m = new Map<string, typeof rows>();
    for (const r of rows) m.set(r.supplierName || '', [...(m.get(r.supplierName || '') ?? []), r]);
    return [...m.entries()].sort((a, b) => Number(!a[0]) - Number(!b[0]) || a[0].localeCompare(b[0]));
  }, [rows]);

  const order = (list: typeof rows) => {
    const prefill: PurchasePrefill = { lines: list.map((r) => ({ ingredientId: r.id, qty: Math.max(1, Math.ceil(r.short)) })) };
    navigate('/purchases/new?order=1', { state: { prefill } });
  };
  const message = (name: string, list: typeof rows) => [
    `Assalam-o-Alaikum${name ? ` ${name}` : ''},`, '', `${shop} ke liye ye saamaan bhej dein:`, '',
    ...list.map((r, i) => `${i + 1}. ${r.name} — ${qty(Math.max(r.short, 1))} ${r.unit}`), '', 'Shukriya',
  ].join('\n');

  if (isLoading) return <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>;
  if (error) return <p className="rounded-3xl bg-white px-6 py-10 text-center text-sm text-slate-500 ring-1 ring-slate-200/80">Raw material dekhne ki permission nahi, ya list nahi aa saki.</p>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[0.8125rem] text-slate-600">Saamaan ke baghair kuch nahi banta — jo hadd se neeche hai woh yahan hai.</p>
        <label className="inline-flex items-center gap-2 text-[0.8125rem] font-medium text-slate-700">
          <input type="checkbox" checked={onlyCritical} onChange={(e) => setOnlyCritical(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
          Sirf zaroori / khatam
        </label>
      </div>
      {!rows.length ? (
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <Wheat className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-900">Saamaan poora hai</p>
          <p className="mt-1 text-sm text-slate-500">Maida, cheeni, makkhan — sab hadd se upar hai.</p>
        </div>
      ) : bySupplier.map(([name, list]) => {
        const phone = list.find((r) => r.supplierPhone)?.supplierPhone;
        const total = list.reduce((s, r) => s + r.short * Number(r.costPerUnit || 0), 0);
        return (
          <section key={name || 'none'} className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5 sm:px-5">
              <h2 className="text-[0.875rem] font-semibold text-slate-900">{name || 'Supplier nahi likha'} <span className="font-normal text-slate-500">· {list.length} cheezein · andazan {cost(total)}</span></h2>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" leftIcon={<MessageCircle className="h-3.5 w-3.5" />} onClick={() => openWhatsApp(waLink(phone, message(name, list)), message(name, list))}>WhatsApp</Button>
                {canBuy && <Button size="sm" leftIcon={<ShoppingCart className="h-3.5 w-3.5" />} onClick={() => order(list)}>Order banayein</Button>}
              </div>
            </header>
            <ul className="divide-y divide-slate-100">
              {list.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 sm:px-5">
                  <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1', r.have <= 0 ? 'bg-rose-50 text-rose-700 ring-rose-200' : 'bg-amber-50 text-amber-800 ring-amber-200')}><Wheat className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900">{r.name}{r.isCritical && <span className="ml-2 rounded-full bg-rose-50 px-2 py-0.5 text-[0.6875rem] font-medium text-rose-700 ring-1 ring-rose-200">Zaroori</span>}</p>
                    <p className="text-[0.75rem] text-slate-500">{r.category} · hadd {qty(r.level)} {r.unit}</p>
                  </div>
                  <div className="text-right">
                    <p className={cn('font-bold tabular-nums', r.have <= 0 ? 'text-rose-700' : 'text-amber-700')}>{qty(r.have)} {r.unit}</p>
                    <p className="text-[0.75rem] tabular-nums text-slate-500">mangwana {qty(r.short)} {r.unit}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
