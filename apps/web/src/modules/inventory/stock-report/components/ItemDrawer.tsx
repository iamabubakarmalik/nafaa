/**
 * Side panel for one product: value and age, stock per branch, variants,
 * batches with expiry, IMEI/serial units or carpet rolls, monthly sales and
 * the latest stock moves.
 */

import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { ArrowRightLeft, Barcode, ExternalLink, History, X } from 'lucide-react';
import { IconButton, Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import { STOCK_KEY, stockAnalysisApi, type StockQuery } from '../api/stock-report.api';
import { FLAG_META, LINE_STATUS, MOVE_LABEL, ageText, coverText, dateText, qty } from './meta';

function Fact({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-[0.6875rem] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-[0.9375rem] font-semibold tabular-nums text-slate-900">{value}</p>
      {hint && <p className="text-[0.6875rem] text-slate-500">{hint}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      {children}
    </section>
  );
}

export function ItemDrawer({ productId, query, money, cost, deviceLink, onClose }: {
  productId: string;
  query: Pick<StockQuery, 'from' | 'to' | 'deadDays'>;
  money: (n: number) => string;
  cost: (n: number) => string;
  deviceLink?: (productId: string) => string;
  onClose: () => void;
}) {
  const theme = useChartTheme();
  const q = useQuery({ queryKey: [STOCK_KEY, 'item', productId, query], queryFn: () => stockAnalysisApi.item(productId, query) });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const d = q.data;
  const l = d?.line;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex justify-end">
      <div className="absolute inset-0 bg-slate-950/40" onClick={onClose} aria-hidden />
      <aside role="dialog" aria-modal="true" data-drawer aria-label={l?.name ?? 'Stock details'}
        className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-200">
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-slate-900">{l?.name ?? d?.product?.name ?? '…'}</h2>
            {l && <p className="truncate text-[0.8125rem] text-slate-500">{[l.category?.name, l.brand?.name, l.supplier?.name && `Supplier: ${l.supplier.name}`, l.sku].filter(Boolean).join(' · ')}</p>}
          </div>
          <IconButton label="Band karein" onClick={onClose}><X className="h-4 w-4" /></IconButton>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {q.isLoading ? (
            <div className="space-y-3">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
          ) : !l ? (
            <p className="py-10 text-center text-[0.875rem] text-slate-500">Is branch me is cheez ka koi stock ya sale nahi</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5">
                <span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ring-1', LINE_STATUS[l.status].tone)}>{LINE_STATUS[l.status].label}</span>
                {l.flags.filter((f) => FLAG_META[f]).map((f) => <span key={f} className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ring-1', FLAG_META[f]!.tone)}>{FLAG_META[f]!.label}</span>)}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Fact label="Stock" value={`${qty(l.stock)} ${l.unit}`} hint={`alert ${qty(l.alert)}${l.detail ? ` · ${l.detail}` : ''}`} />
                <Fact label="Cost" value={cost(l.valueAtCost)} hint={`ausat ${cost(l.cost)} / ${l.unit}`} />
                <Fact label="Bechne par" value={money(l.retail)} hint={`rate ${money(l.price)}`} />
                <Fact label="Mumkin profit" value={cost(l.profit)} hint={l.margin != null ? `${l.margin.toFixed(1)}% margin` : undefined} />
                <Fact label="Period me biki" value={`${qty(l.sold.qty)} ${l.unit}`} hint={`${money(l.sold.revenue)} · pichli period ${qty(l.prevSold.qty)}`} />
                <Fact label="Kitne din chalega" value={coverText(l.cover)} hint={`roz ${qty(l.perDay)} ${l.unit}`} />
                <Fact label="Aakhri sale" value={ageText(l.saleAge)} hint={l.lastSoldAt ? dateText(l.lastSoldAt) : undefined} />
                <Fact label="Maal aaya" value={ageText(l.stockAge, '—')} hint={l.lastInAt ? dateText(l.lastInAt) : 'Product banne ki date se'} />
              </div>

              {l.agri?.reg && (
                <p className={cn('rounded-xl px-3 py-2 text-[0.8125rem]', l.agri.reg.state === 'expired' ? 'bg-rose-50 text-rose-800' : 'bg-amber-50 text-amber-900')}>
                  Registration: {l.agri.reg.state === 'expired' ? 'khatam — bechna mana hai' : l.agri.reg.state === 'soon' ? `${l.agri.reg.days} din me khatam` : 'date likhi nahi'}
                </p>
              )}

              {l.shops.length > 1 && (
                <Section title="Branch war">
                  <ul className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
                    {l.shops.map((s) => (
                      <li key={s.shopId} className="flex items-center justify-between gap-3 px-3 py-2 text-[0.8125rem]">
                        <span className="min-w-0"><span className="block truncate font-medium text-slate-800">{s.name}</span><span className="text-[0.6875rem] text-slate-500">biki {qty(s.sold)} · alert {qty(s.alert)}</span></span>
                        <span className="text-right tabular-nums"><span className={cn('block font-semibold', s.stock <= 0 ? 'text-rose-700' : s.stock <= s.alert ? 'text-amber-700' : 'text-slate-900')}>{qty(s.stock)} {l.unit}</span><span className="text-[0.6875rem] text-slate-500">{cost(s.cost)}</span></span>
                      </li>
                    ))}
                  </ul>
                  <Link to="/transfers" className="mt-2 inline-flex items-center gap-1 text-[0.75rem] font-semibold text-brand-700 hover:underline"><ArrowRightLeft className="h-3.5 w-3.5" />Branch ko bhejein</Link>
                </Section>
              )}

              {d.variants.length > 0 && (
                <Section title={`Variants · ${d.variants.length}`}>
                  <ul className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
                    {d.variants.map((v) => (
                      <li key={v.id} className="flex items-center justify-between gap-3 px-3 py-2 text-[0.8125rem]">
                        <span className="truncate text-slate-800">{v.name}</span>
                        <span className="shrink-0 tabular-nums"><b>{qty(v.stock)}</b> <span className="text-slate-500">· {cost(v.cost)}</span></span>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {d.batches.length > 0 && (
                <Section title={`Batch · ${d.batches.length}`}>
                  <ul className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
                    {d.batches.map((b) => (
                      <li key={b.id} className="flex items-center justify-between gap-3 px-3 py-2 text-[0.8125rem]">
                        <span className="min-w-0"><span className="block font-mono text-slate-800">{b.batchNumber}</span><span className="text-[0.6875rem] text-slate-500">{b.expiryDate ? dateText(b.expiryDate) : 'Expiry nahi'}{b.shop ? ` · ${b.shop}` : ''}</span></span>
                        <span className="text-right tabular-nums">
                          <span className="block font-semibold">{qty(b.qty)} {l.unit}</span>
                          {b.days !== null && <span className={cn('text-[0.6875rem]', b.days < 0 ? 'text-rose-700' : b.days <= 30 ? 'text-amber-700' : 'text-slate-500')}>{b.days < 0 ? 'expire ho chuka' : `${b.days} din baqi`} · {cost(b.cost)}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {d.units.length > 0 && (
                <Section title={`${d.units[0].label} · ${d.units.length}${l.devices && l.devices.count > d.units.length ? ` / ${l.devices.count}` : ''}`}>
                  <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-xl ring-1 ring-slate-200">
                    {d.units.map((u) => (
                      <li key={u.id} className="flex items-center justify-between gap-3 px-3 py-2 text-[0.8125rem]">
                        <span className="min-w-0"><span className="block font-mono text-slate-800">{u.ref}</span><span className="text-[0.6875rem] text-slate-500">{[u.note, u.shop, u.warrantyEnd && `warranty ${dateText(u.warrantyEnd)}`].filter(Boolean).join(' · ')}</span></span>
                        <span className="text-right tabular-nums"><span className="block">{cost(u.cost)}</span><span className={cn('text-[0.6875rem]', (u.ageDays ?? 0) > 90 ? 'text-rose-700' : 'text-slate-500')}>{ageText(u.ageDays)}</span></span>
                      </li>
                    ))}
                  </ul>
                  {deviceLink && <Link to={deviceLink(l.productId)} className="mt-2 inline-flex items-center gap-1 text-[0.75rem] font-semibold text-brand-700 hover:underline"><Barcode className="h-3.5 w-3.5" />Units sambhalein</Link>}
                </Section>
              )}

              {d.rolls.length > 0 && (
                <Section title={`Rolls aur pieces · ${d.rolls.length}`}>
                  <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-xl ring-1 ring-slate-200">
                    {d.rolls.map((r) => (
                      <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2 text-[0.8125rem]">
                        <span className="min-w-0"><span className="block font-mono text-slate-800">{r.ref}</span><span className="text-[0.6875rem] text-slate-500">{r.kind === 'roll' ? 'Roll' : 'Cut piece'}{r.shop ? ` · ${r.shop}` : ''} · {ageText(r.ageDays)}</span></span>
                        <span className="text-right tabular-nums"><span className="block font-semibold">{qty(r.sqft)} sqft</span><span className="text-[0.6875rem] text-slate-500">{cost(r.cost)} · {money(r.retail)}</span></span>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {d.monthly.length > 0 && (
                <Section title="Mahine war sale">
                  <div className="h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={d.monthly} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                        <XAxis dataKey="key" tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={(k: string) => new Date(`${k}-15`).toLocaleDateString('en-PK', { month: 'short' })} />
                        <Tooltip formatter={(v, _n, p) => [`${qty(Number(v))} ${l.unit} · ${formatPKR((p as { payload?: { revenue?: number } }).payload?.revenue ?? 0)}`, 'Biki']} {...theme.tooltip} />
                        <Bar dataKey="qty" fill={theme.primary} radius={[5, 5, 0, 0]} barSize={22} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Section>
              )}

              <Section title="Aakhri harkat">
                {!d.moves.length ? <p className="text-[0.8125rem] text-slate-500">Koi harkat nahi</p> : (
                  <ul className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
                    {d.moves.map((m) => (
                      <li key={m.id} className="flex items-center justify-between gap-3 px-3 py-2 text-[0.8125rem]">
                        <span className="min-w-0"><span className="block text-slate-800">{MOVE_LABEL[m.type] ?? m.type}{m.reference ? ` · ${m.reference}` : ''}</span><span className="text-[0.6875rem] text-slate-500">{dateText(m.createdAt)}{m.shop ? ` · ${m.shop}` : ''}</span></span>
                        <span className={cn('shrink-0 font-semibold tabular-nums', m.quantity >= 0 ? 'text-emerald-700' : 'text-rose-700')}>{m.quantity >= 0 ? '+' : ''}{qty(m.quantity)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            </>
          )}
        </div>

        <footer className="flex flex-wrap gap-2 border-t border-slate-200 px-5 py-3">
          <Link to={`/products/${productId}`} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-slate-900 px-3 text-[0.8125rem] font-semibold text-white hover:bg-slate-800"><ExternalLink className="h-4 w-4" />Product kholein</Link>
          <Link to={`/stock-movements?product=${productId}`} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-3 text-[0.8125rem] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"><History className="h-4 w-4" />Poori harkat</Link>
        </footer>
      </aside>
    </div>,
    document.body,
  );
}
