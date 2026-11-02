/**
 * "What to bake" for a business day: orders due that day plus the counter
 * sale expected from the same weekday, less fresh stock still good and what
 * is already planned. Tick lines, adjust the count and make a plan.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Cake, ChefHat, Info, ListPlus, ShoppingBag, Sparkles } from 'lucide-react';
import { Button, Card, Skeleton, Table, THead, TBody, Tr, Th, Td } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { productionApi } from '../../api/production.api';
import { LoadFailed } from '../charts';
import { PRODUCTION_KEY, byWeight, flavorLabel, fmtQty, qtyInput, sizeLabel, timeOnly } from '../meta';
import type { BuilderLine } from './PlanBuilder';
import { t, Trans } from '@core/i18n';

export function SuggestPanel({ date, canManage, onPlan }: { date: string; canManage: boolean; onPlan: (lines: BuilderLine[]) => void }) {
  const q = useQuery({ queryKey: [PRODUCTION_KEY, 'suggest', date], queryFn: () => productionApi.suggest(date), staleTime: 60_000 });
  const d = q.data;
  const [qty, setQty] = useState<Record<string, string>>({});
  const [picked, setPicked] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!d) return;
    setQty(Object.fromEntries(d.rows.map((r) => [r.productId, String(r.suggested)])));
    setPicked(new Set(d.rows.filter((r) => r.suggested > 0).map((r) => r.productId)));
  }, [d]);
  const weekday = useMemo(() => new Date(`${date}T12:00:00`).toLocaleDateString('en-PK', { weekday: 'long' }), [date]);

  if (q.isError && !d) return <LoadFailed what={t('Andaze')} retry={() => q.refetch()} />;
  if (!d) return <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>;

  const make = () => onPlan([
    ...d.rows.filter((r) => picked.has(r.productId) && Number(qty[r.productId]) > 0).map((r) => ({
      key: r.productId, productId: r.productId, productName: r.name, plannedQty: qty[r.productId], unit: r.unit,
      note: r.orderRefs.length ? t('Orders: {{value}}', { value: r.orderRefs.join(', ') }) : undefined,
    })),
  ]);
  const count = d.rows.filter((r) => picked.has(r.productId) && Number(qty[r.productId]) > 0).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200/80">
        <Sparkles className="h-5 w-5 text-brand-600" />
        <p className="min-w-0 flex-1 text-[0.8125rem] text-slate-600">
          {d.basis === 'guess'
            ? <Trans text={'Abhi kisi cheez par "khud banate hain" nahi laga, is liye pichle {{days}} din ki {{top}} cheezein dikh rahi hain. Product me "Khud banate hain" chunein to sirf woh aayengi.'} values={{ days: d.days, top: <b>{t('sab se zyada biki')}</b> }} />
            : <>{t('{{weekday}} ke liye: us din ke orders + pichle 4 {{weekday}} ki ausat sale, minus jo taaza maal pehle se para hai aur jo plan me hai.', { weekday })}</>}
        </p>
        {canManage && <Button onClick={make} disabled={!count} leftIcon={<ListPlus className="h-4 w-4" />}>{count ? t('{{count}} cheezon ka plan banayein', { count }) : t('Cheezein chunein')}</Button>}
      </div>

      {(d.customCakes.length > 0 || d.bulkOrders.length > 0) && (
        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Cake className="h-4 w-4 text-brand-600" />{t('Us din ke order')}</span>} description={t('Jo cake kisi maal se jure nahi, unhein alag se plan me daalein')}>
          <ul className="divide-y divide-slate-100 text-[0.8125rem]">
            {d.customCakes.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-2 py-2">
                <span className="w-14 font-semibold tabular-nums text-slate-900">{timeOnly(c.neededBy)}</span>
                <Link to={`/bakery/cake-orders/${c.id}`} className="min-w-0 flex-1 truncate text-slate-800 hover:text-brand-700">{c.customerName} · {sizeLabel(c.size)} {flavorLabel(c.flavor)}{c.messageOnCake ? ` · "${c.messageOnCake}"` : ''}</Link>
                {canManage && <Button size="xs" variant="secondary" onClick={() => onPlan([{ key: c.id, productName: t('Cake {{orderNumber}} — {{size}} {{flavor}}', { orderNumber: c.orderNumber, size: sizeLabel(c.size), flavor: flavorLabel(c.flavor) }), plannedQty: '1', cakeOrderId: c.id, note: c.customerName }])}>{t('Plan me daalein')}</Button>}
              </li>
            ))}
            {d.bulkOrders.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-2 py-2">
                <ShoppingBag className="h-4 w-4 text-amber-600" />
                <span className="min-w-0 flex-1 truncate text-slate-800">{t('{{organizationName}} · {{orderNumber}} — is ki cheezein neeche ginti me shamil hain', { organizationName: b.organizationName, orderNumber: b.orderNumber })}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {!d.rows.length ? (
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <ChefHat className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-900">{t('Andaza lagane ke liye abhi data nahi')}</p>
          <p className="mt-1 text-sm text-slate-500">{t('Kuch din counter par sale hogi ya products par "Khud banate hain" lagega to yahan roz ka plan khud banne lagega.')}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
          <Table minWidth="46rem" className="text-[0.8125rem] [&_table]:text-[0.8125rem]">
              <THead>
                <Tr className="bg-slate-50/70 text-start text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
                  <Th className="w-10 px-4 py-2.5"><input type="checkbox" aria-label={t('Sab chunein')} className="h-4 w-4 accent-brand-600" checked={picked.size === d.rows.length} onChange={(e) => setPicked(e.target.checked ? new Set(d.rows.map((r) => r.productId)) : new Set())} /></Th>
                  <Th className="px-2 py-2.5">{t('Item')}</Th>
                  <Th className="px-2 py-2.5 text-end">{t('Orders')}</Th>
                  <Th className="px-2 py-2.5 text-end" title={t('Pichle 4 {{weekday}} ki ausat', { weekday })}>{t('{{weekday}} ausat', { weekday })}</Th>
                  <Th className="px-2 py-2.5 text-end" title={t('Pichle {{days}} din ki roz ki ausat', { days: d.days })}>{t('Roz ausat')}</Th>
                  <Th className="px-2 py-2.5 text-end">{t('Taaza para')}</Th>
                  <Th className="px-2 py-2.5 text-end">{t('Plan me')}</Th>
                  <Th className="px-4 py-2.5 text-end">{t('Banana hai')}</Th>
                </Tr>
              </THead>
              <TBody>
                {d.rows.map((r) => (
                  <Tr key={r.productId} className={cn(!picked.has(r.productId) && 'opacity-60')}>
                    <Td className="px-4 py-2"><input type="checkbox" aria-label={t('{{name}} chunein', { name: r.name })} className="h-4 w-4 accent-brand-600" checked={picked.has(r.productId)}
                      onChange={(e) => setPicked((s) => { const n = new Set(s); if (e.target.checked) n.add(r.productId); else n.delete(r.productId); return n; })} /></Td>
                    <Td className="px-2 py-2">
                      <p className="font-medium text-slate-900">{r.name}</p>
                      {r.wasteRate > 15 && <p className="text-[0.6875rem] text-amber-700">{t('{{wasteRate}}% waste hota hai — andaza thora kam kiya', { wasteRate: r.wasteRate })}</p>}
                      {r.orderRefs.length > 0 && <p className="truncate text-[0.6875rem] text-pink-700">{r.orderRefs.join(', ')}</p>}
                    </Td>
                    <Td className="px-2 py-2 text-end tabular-nums">{r.orders ? fmtQty(r.orders) : '—'}</Td>
                    <Td className="px-2 py-2 text-end tabular-nums text-slate-600">{fmtQty(r.weekdayAvg)}</Td>
                    <Td className="px-2 py-2 text-end tabular-nums text-slate-600">{fmtQty(r.avgDaily)}</Td>
                    <Td className="px-2 py-2 text-end tabular-nums text-slate-600">{r.freshLeft ? fmtQty(r.freshLeft) : '—'}</Td>
                    <Td className="px-2 py-2 text-end tabular-nums text-slate-600">{r.planned ? fmtQty(r.planned) : '—'}</Td>
                    <Td className="px-4 py-2 text-end">
                      <input inputMode={byWeight(r.unit) ? 'decimal' : 'numeric'} value={qty[r.productId] ?? ''} aria-label={t('{{name}} kitne', { name: r.name })} disabled={!canManage}
                        onChange={(e) => { const v = qtyInput(e.target.value, byWeight(r.unit)); setQty((x) => ({ ...x, [r.productId]: v })); if (Number(v) > 0) setPicked((s) => new Set(s).add(r.productId)); }}
                        className="h-8 w-20 rounded-lg border border-slate-300 bg-white px-2 text-end font-semibold tabular-nums" />
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          <p className="flex items-start gap-1.5 border-t border-slate-100 px-4 py-2.5 text-[0.75rem] text-slate-500"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />{t('Yeh sirf andaza hai — mausam, chhutti aur mauqe ke hisaab se ginti badal lein.')}</p>
        </div>
      )}
    </div>
  );
}
