/**
 * Reorder suggestions: what to buy before it runs out, grouped by branch
 * and supplier. Quantities can be changed; "Purchase banayein" opens the
 * purchase editor with the lines filled in (navigation only, nothing is
 * saved here). An order belongs to one branch, so the app switches to that
 * branch first when needed.
 *
 * `AiReorderPanel` renders data the assistant already sent; the standalone
 * `ReorderSuggestions` fetches /ai/reorder with its own lead-time controls.
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, PackageCheck, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Skeleton } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { hasPermission, PERMISSIONS } from '@core/lib/permissions';
import { useAuthStore } from '@core/stores/auth.store';
import type { PurchasePrefill } from '@modules/purchasing/purchases/editor/PurchaseEditorPage';
import { aiApi, type AiReorder, type AiReorderGroup } from '../api';
import { isPushLayout, useAiStore } from '../store';
import { t } from '@core/i18n';

const qtyText = (n: number) => Number(n.toFixed(2)).toLocaleString('en-PK');

function GroupCard({ g, canBuy, onOrder }: { g: AiReorderGroup; canBuy: boolean; onOrder: (g: AiReorderGroup, qty: Record<string, number>) => void }) {
  const [qty, setQty] = useState<Record<string, number>>({});
  const value = (id: string, fallback: number) => qty[id] ?? fallback;
  const total = g.rows.reduce((s, r) => s + (r.lastCost ?? 0) * value(r.productId, r.suggestQty), 0);
  const hasCost = g.rows.some((r) => r.lastCost != null);
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
        <div className="min-w-0">
          <div className="truncate text-[0.8125rem] font-semibold text-slate-900">{g.supplier?.name ?? t('Supplier nahi chuna')}</div>
          <div className="text-[0.6875rem] text-slate-500">{t('{{shopName}} · {{count}} cheezein{{value}}', { shopName: g.shopName, count: g.rows.length, value: hasCost && total > 0 ? t(' · takriban {{total}}', { total: formatPKR(total, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) }) : '' })}</div>
        </div>
        {canBuy && (
          <Button size="xs" leftIcon={<ShoppingCart className="h-3.5 w-3.5" />} onClick={() => onOrder(g, qty)}>{t('Purchase banayein')}</Button>
        )}
      </div>
      <ul className="divide-y divide-slate-100">
        {g.rows.map((r) => (
          <li key={r.productId} className="flex items-center gap-2 px-3 py-1.5">
            <div className="min-w-0 flex-1">
              <div className="truncate text-[0.8125rem] text-slate-800">{r.name}</div>
              <div className="text-[0.6875rem] text-slate-500">
                {t('Stock {{stock}} {{unit}} · roz {{perDay}} · {{value}}{{value2}}', { stock: qtyText(r.stock), unit: r.unit, perDay: qtyText(r.perDay), value: r.daysLeft == null ? t('bikri nahi') : r.daysLeft <= 0 ? t('khatam') : t('{{daysLeft}} din', { daysLeft: Math.round(r.daysLeft) }), value2: r.onOrder > 0 ? t(' · {{onOrder}} order me', { onOrder: qtyText(r.onOrder) }) : '' })}
              </div>
            </div>
            <label className="sr-only" htmlFor={`rq-${g.shopId}-${r.productId}`}>{t('{{name}} quantity', { name: r.name })}</label>
            <input
              id={`rq-${g.shopId}-${r.productId}`}
              type="number"
              min={0}
              step="any"
              inputMode="decimal"
              value={value(r.productId, r.suggestQty)}
              onChange={(e) => setQty((q) => ({ ...q, [r.productId]: Math.max(0, Number(e.target.value) || 0) }))}
              className="h-8 w-20 rounded-lg border border-slate-200 bg-white px-2 text-end text-[0.8125rem] tabular-nums text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Opens the purchase editor with the group's lines; switches branch if needed. */
function useOrder() {
  const navigate = useNavigate();
  const currentShopId = useAuthStore((s) => s.currentShopId);
  const setCurrentShop = useAuthStore((s) => s.setCurrentShop);
  const close = useAiStore((s) => s.setOpen);
  return (g: AiReorderGroup, qty: Record<string, number>) => {
    const lines = g.rows.map((r) => ({ productId: r.productId, qty: qty[r.productId] ?? r.suggestQty })).filter((l) => l.qty > 0);
    if (!lines.length) { toast.error(t('Mangwane ke liye koi quantity nahi')); return; }
    if (currentShopId !== g.shopId) {
      setCurrentShop(g.shopId);
      toast.success(t('{{shopName}} khul gayi — order isi branch ka banega', { shopName: g.shopName }));
    }
    const prefill: PurchasePrefill = { supplierId: g.supplier?.id, supplierName: g.supplier?.name, lines };
    if (!isPushLayout()) close(false);
    navigate('/purchases/new?order=1', { state: { prefill } });
  };
}

/** Low or out of stock items that did not sell in the window: a note only, never ordered from here. */
function IdleNote({ idle, days }: { idle: AiReorder['idle']; days: number }) {
  const [open, setOpen] = useState(false);
  if (!idle?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
        className="flex w-full items-center gap-1.5 px-3 py-2 text-start text-[0.75rem] font-medium text-slate-600 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-xl">
        <ChevronRight className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
        {t('Bikri nahi hui — abhi order ki zaroorat nahi ({{count}})', { count: idle.length })}
      </button>
      {open && (
        <ul className="space-y-0.5 px-3 pb-2 ps-8 text-[0.75rem] text-slate-600">
          <li className="pb-1 text-[0.6875rem] text-slate-400">{t('Pichhle {{days}} din me in ki koi sale nahi hui.', { days })}</li>
          {idle.map((r) => <li key={r.productId}>{r.name} · {qtyText(r.stock)} {r.unit}</li>)}
        </ul>
      )}
    </div>
  );
}

export function AiReorderPanel({ reorder }: { reorder: AiReorder }) {
  const user = useAuthStore((s) => s.user);
  const canBuy = hasPermission(user?.role, user?.permissions, PERMISSIONS.PURCHASES_CREATE);
  const order = useOrder();
  const idle = reorder.idle ?? [];
  return (
    <div className="space-y-2">
      {reorder.groups.length ? (
        <>
          <p className="text-[0.75rem] text-slate-500">
            {t('Pichhle {{historyDays}} din ki bikri se · supplier {{leadDays}} din me deta hai · {{coverDays}} din ka maal', { historyDays: reorder.historyDays, leadDays: reorder.leadDays, coverDays: reorder.coverDays })}
          </p>
          {reorder.groups.map((g) => <GroupCard key={`${g.shopId}:${g.supplier?.id ?? 'none'}`} g={g} canBuy={canBuy} onOrder={order} />)}
        </>
      ) : (
        <p className="rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] text-slate-600">{t('Abhi kuch mangwane ki zaroorat nahi.')}</p>
      )}
      <IdleNote idle={idle} days={reorder.historyDays} />
    </div>
  );
}

const LEAD = [1, 3, 7] as const;
const COVER = [7, 14, 30] as const;

/** Standalone panel with its own data and lead-time controls (on the /ai page). */
export function ReorderSuggestions() {
  const [lead, setLead] = useState<number>(3);
  const [cover, setCover] = useState<number>(14);
  const q = useQuery({ queryKey: ['ai', 'reorder', lead, cover], queryFn: () => aiApi.reorder(lead, cover), staleTime: 60_000, retry: false });
  const pill = (on: boolean) =>
    `rounded-full px-2.5 py-1 text-[0.75rem] font-medium transition ${on ? 'bg-brand-600 text-brand-fg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`;
  const body = useMemo(() => {
    if (q.isLoading) return <div className="space-y-2"><Skeleton className="h-16" /><Skeleton className="h-16" /></div>;
    if (q.isError || !q.data) return <p className="text-[0.8125rem] text-slate-500">{t('Reorder list abhi nahi khul saki (permission ya internet).')}</p>;
    return <AiReorderPanel reorder={q.data} />;
  }, [q.isLoading, q.isError, q.data]);

  return (
    <section aria-labelledby="ai-reorder-title" className="space-y-3">
      <div className="flex items-center gap-2">
        <PackageCheck className="h-4 w-4 text-brand-600" />
        <h2 id="ai-reorder-title" className="text-[0.875rem] font-semibold text-slate-900">{t('Kya mangwana hai?')}</h2>
      </div>
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t('Supplier kitne din me deta hai')}>
        <span className="me-1 text-[0.75rem] text-slate-500">{t('Supplier deta hai:')}</span>
        {LEAD.map((d) => <button key={d} type="button" className={pill(lead === d)} aria-pressed={lead === d} onClick={() => setLead(d)}>{t('{{d}} din', { d })}</button>)}
      </div>
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t('Kitne din ka maal')}>
        <span className="me-1 text-[0.75rem] text-slate-500">{t('Maal chahiye:')}</span>
        {COVER.map((d) => <button key={d} type="button" className={pill(cover === d)} aria-pressed={cover === d} onClick={() => setCover(d)}>{t('{{d}} din', { d })}</button>)}
      </div>
      {body}
    </section>
  );
}
