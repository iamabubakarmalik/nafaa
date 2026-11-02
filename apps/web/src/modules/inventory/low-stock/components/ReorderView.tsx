/**
 * The reorder list (merged from Smart Reorder): everything worth ordering,
 * one card per supplier and branch. Quantities can be changed or a line left
 * out before the order is made; each card turns into a purchase order, a
 * WhatsApp message or a printed sheet.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, PackageCheck, ShoppingCart, Store, X } from 'lucide-react';
import { Button, Skeleton, Table, THead, TBody, Tr, Th, Td } from '@/design-system/components';
import { PrintButton } from '@core/print';
import { waLink } from '@core/lib/whatsapp/templates';
import type { LowRow } from '../api';
import { daysText, groupBySupplier, openWhatsApp, orderMessage, qty, type OrderGroup } from './meta';
import { reorderSheetDoc } from './print';
import { t } from '@core/i18n';

export function ReorderView({ rows, loading, qtyOf, setQty, removed, toggleRemoved, cost, costHidden, showShop, shop, canOrder, onOrder }: {
  rows: LowRow[];
  loading: boolean;
  qtyOf: (r: LowRow) => number;
  setQty: (key: string, v: number) => void;
  removed: Set<string>;
  toggleRemoved: (key: string) => void;
  cost: (n: number) => string;
  costHidden: boolean;
  showShop: boolean;
  shop: string;
  canOrder: boolean;
  onOrder: (g: OrderGroup) => void;
}) {
  const groups = useMemo(() => groupBySupplier(rows), [rows]);
  const live = (g: OrderGroup) => ({ ...g, rows: g.rows.filter((r) => !removed.has(r.key)) });
  const value = (g: OrderGroup) => g.rows.filter((r) => !removed.has(r.key)).reduce((s, r) => s + qtyOf(r) * r.lastCost, 0);

  if (loading) return <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-40 rounded-3xl" />)}</div>;
  if (!groups.length) {
    return (
      <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
        <PackageCheck className="mx-auto h-10 w-10 text-emerald-400" />
        <p className="mt-3 font-semibold text-slate-900">{t('Abhi kuch mangwane ki zaroorat nahi')}</p>
        <p className="mt-1 text-sm text-slate-500">{t('Jo maal kam hai woh ya to order me hai, ya bik nahi raha. Settings me "kitne din ka maal" badal kar dekhein.')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[0.8125rem] text-slate-600">{t('{{count}} supplier · quantity badal sakte hain, ya X se line hata dein', { count: groups.length })}</p>
        <PrintButton label={t('Sab ki sheet')} size="sm" doc={() => reorderSheetDoc(groups.map(live), qtyOf, shop, !costHidden)} />
      </div>
      {groups.map((g) => {
        const text = orderMessage(live(g), shop, qtyOf);
        return (
          <section key={g.key} className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <h2 className="truncate text-[0.9375rem] font-semibold text-slate-900">
                  {g.supplier ? <Link to={`/suppliers/${g.supplier.id}`} className="hover:text-brand-700">{g.supplier.name}</Link> : t('Supplier chunna hai')}
                </h2>
                <p className="flex flex-wrap items-center gap-x-2 text-[0.75rem] text-slate-500">
                  {g.supplier?.phone && <span>{g.supplier.phone}</span>}
                  {showShop && <span className="inline-flex items-center gap-1"><Store className="h-3 w-3" />{g.shopName}</span>}
                  <span>{t('{{value}} cheezein', { value: g.rows.length - g.rows.filter((r) => removed.has(r.key)).length })}</span>
                  {!costHidden && <span className="font-semibold text-slate-700">{cost(value(g))}</span>}
                  {!g.supplier && <span>{t('Pehle kabhi nahi khareeda — order me supplier chunein')}</span>}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <PrintButton size="sm" label={t('Sheet')} doc={() => reorderSheetDoc([live(g)], qtyOf, shop, !costHidden)} />
                <Button size="sm" variant="secondary" leftIcon={<MessageCircle className="h-3.5 w-3.5" />} onClick={() => openWhatsApp(waLink(g.supplier?.phone, text), text)}>{t('WhatsApp')}</Button>
                {canOrder && <Button size="sm" leftIcon={<ShoppingCart className="h-3.5 w-3.5" />} onClick={() => onOrder(live(g))}>{t('Order banayein')}</Button>}
              </div>
            </header>
            <div className="overflow-x-auto">
              <Table minWidth="44rem" className="[&>table]:text-[0.8125rem]">
                <THead>
                  <Tr className="border-b border-slate-100 text-start text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
                    <Th className="px-4 py-2">{t('Cheez')}</Th>
                    <Th className="px-3 py-2 text-end">{t('Abhi')}</Th>
                    <Th className="px-3 py-2 text-end">{t('Roz sale')}</Th>
                    <Th className="px-3 py-2 text-end">{t('Kitne din')}</Th>
                    <Th className="px-3 py-2 text-end">{t('Order me')}</Th>
                    <Th className="px-3 py-2 text-end">{t('Mangwana')}</Th>
                    {!costHidden && <Th className="px-3 py-2 text-end">{t('Amount')}</Th>}
                    <Th className="w-10 px-2 py-2" />
                  </Tr>
                </THead>
                <TBody className="divide-y divide-slate-100">
                  {g.rows.map((r) => {
                    const off = removed.has(r.key);
                    return (
                      <Tr key={r.key} className={off ? 'opacity-40' : undefined}>
                        <Td className="text-inherit px-4 py-2"><span className="font-medium text-slate-900">{r.name}</span>{r.category && <span className="ms-1.5 text-[0.75rem] text-slate-400">{r.category.name}</span>}</Td>
                        <Td className={`px-3 py-2 text-end tabular-nums ${r.stock <= 0 ? 'font-semibold text-rose-700' : ''}`}>{qty(r.stock)} {r.unit}</Td>
                        <Td className="text-inherit px-3 py-2 text-end tabular-nums">{r.perDay > 0 ? qty(r.perDay) : '—'}</Td>
                        <Td className="text-inherit px-3 py-2 text-end tabular-nums">{r.stock <= 0 ? t('Khatam') : daysText(r.daysLeft)}</Td>
                        <Td className="px-3 py-2 text-end tabular-nums text-sky-700">{r.onOrder > 0 ? qty(r.onOrder) : '—'}</Td>
                        <Td className="text-inherit px-3 py-2 text-end">
                          <input type="number" min={0} step="any" value={qtyOf(r)} disabled={off} aria-label={t('{{name}} kitna mangwana', { name: r.name })}
                            onChange={(e) => setQty(r.key, Math.max(0, Number(e.target.value) || 0))}
                            className="h-8 w-20 rounded-lg border border-slate-200 px-2 text-end tabular-nums outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
                          <span className="ms-1 text-[0.75rem] text-slate-500">{r.unit}</span>
                        </Td>
                        {!costHidden && <Td className="text-inherit px-3 py-2 text-end tabular-nums">{cost(qtyOf(r) * r.lastCost)}</Td>}
                        <Td className="text-inherit px-2 py-2">
                          <button type="button" onClick={() => toggleRemoved(r.key)} title={off ? t('Wapas jorein') : t('Is order se hatayein')} className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button>
                        </Td>
                      </Tr>
                    );
                  })}
                </TBody>
              </Table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
