import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, Search, Truck, Wallet } from 'lucide-react';
import { apiErrorMessage, onlineOrdersApi } from '../api/online-orders.api';
import { rs, whenText } from '../lib/labels';
import { Badge, Btn, Card, EmptyState, Page, Stat, inputCls } from '../components/ui/kit';
import { cn } from '@core/lib/cn';

/* ═════════════════════════════════════════════════════════════
   COD & COURIER — paisa kahan hai?
   Raste me · courier ke paas (deliver ho chuka, jama nahi hua) ·
   is mahine mila · RTO %. Settlement sheet aaye to chuno → mil gaya.
   ═════════════════════════════════════════════════════════════ */

export default function CodPage() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ['cod-summary'], queryFn: onlineOrdersApi.codSummary, refetchInterval: 60_000 });
  const [courier, setCourier] = useState<string>('all');
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [reference, setReference] = useState('');

  const settle = useMutation({
    mutationFn: () => onlineOrdersApi.settleCod([...picked], reference.trim() || undefined),
    onSuccess: (r) => {
      toast.success(`${r.settled} orders ka paisa mil gaya ✓`);
      setPicked(new Set());
      setReference('');
      qc.invalidateQueries({ queryKey: ['cod-summary'] });
      qc.invalidateQueries({ queryKey: ['online-orders'] });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data?.withCourier ?? []).filter((o) =>
      (courier === 'all' || (o.courier ?? 'Courier nahi likha') === courier) &&
      (!term || `${o.externalOrderNumber ?? ''} ${o.customerName} ${o.trackingNumber ?? ''} ${o.customerCity ?? ''}`.toLowerCase().includes(term)));
  }, [data, courier, q]);

  const pickedValue = rows.filter((r) => picked.has(r.id)).reduce((s, r) => s + r.total, 0);
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <Page back={{ to: '/online-orders', label: 'Online orders' }} title="COD & courier"
      subtitle="Cash on delivery ka paisa kahan hai — courier-wise. Settlement sheet aaye to orders chun kar 'mil gaya' karein."
      actions={<Link to="/online-store/couriers"><Btn icon={<Truck className="h-4 w-4" />}>Couriers jorein</Btn></Link>}>
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />)}</div>
      ) : error || !data ? (
        <Card><EmptyState title="Hisaab nahi khula">{apiErrorMessage(error)}</EmptyState></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Raste me (COD)" value={rs(data.totals.inTransitValue)} hint={`${data.totals.inTransit} parcel`} />
            <Stat label="Courier ke paas" value={rs(data.totals.withCourierValue)} hint={`${data.totals.withCourier} deliver — paisa jama nahi hua`}
              tone={data.totals.withCourierValue > 0 ? 'attention' : undefined} />
            <Stat label="Is mahine mila" value={rs(data.totals.settledMonthValue)} hint={`${data.totals.settledMonth} orders`} />
            <Stat label="RTO (30 din)" value={`${data.totals.rtoRate}%`} hint={`${data.totals.returned30} / ${data.totals.dispatched30} parcel wapas`} />
          </div>

          <Card title="Courier-wise" flush>
            {data.couriers.length === 0 ? (
              <EmptyState icon={<Truck className="h-5 w-5" />} title="Abhi koi parcel nahi bheja">Order par "Rider/courier ko de diya" me courier aur CN daalein — hisaab yahan banega.</EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-[13px]">
                  <thead className="bg-slate-50 text-left text-[11.5px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/40">
                    <tr>
                      <th className="px-4 py-2 sm:px-5">Courier</th>
                      <th className="px-3 py-2 text-right">Raste me</th>
                      <th className="px-3 py-2 text-right">Courier ke paas</th>
                      <th className="px-3 py-2 text-right">Is mahine mila</th>
                      <th className="px-4 py-2 text-right sm:px-5">RTO (30 din)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data.couriers.map((c) => (
                      <tr key={c.code} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="px-4 py-2.5 font-semibold text-slate-900 dark:text-white sm:px-5">{c.name}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{rs(c.inTransitValue)} <span className="text-slate-400">· {c.inTransit}</span></td>
                        <td className={cn('px-3 py-2.5 text-right tabular-nums', c.withCourierValue > 0 && 'font-semibold text-orange-700 dark:text-orange-300')}>
                          {rs(c.withCourierValue)} <span className="font-normal text-slate-400">· {c.withCourier}</span>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{rs(c.settledMonthValue)} <span className="text-slate-400">· {c.settledMonth}</span></td>
                        <td className="px-4 py-2.5 text-right sm:px-5">
                          <Badge tone={c.rtoRate >= 25 ? 'critical' : c.rtoRate >= 12 ? 'warning' : 'success'}>{c.rtoRate}%</Badge>
                          <span className="ml-1.5 text-[12px] text-slate-400">{c.returned30}/{c.dispatched30}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card flush title="Courier ke paas — settlement ka intezar"
            description="Customer ne courier ko paisa de diya, courier ne abhi aap ko jama nahi karwaya. Courier ki settlement sheet se mila kar chunein.">
            <div className="flex flex-wrap items-center gap-2 px-4 sm:px-5">
              <select value={courier} onChange={(e) => setCourier(e.target.value)} className={cn(inputCls, 'w-auto')}>
                <option value="all">Sab couriers</option>
                {[...new Set((data.withCourier ?? []).map((o) => o.courier ?? 'Courier nahi likha'))].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="relative min-w-[200px] flex-1">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Order #, CN, customer…" className={cn(inputCls, 'pl-8')} />
              </div>
            </div>

            {picked.size > 0 && (
              <div className="mx-4 mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-white sm:mx-5">
                <span className="text-[13px] font-semibold">{picked.size} chune · {rs(pickedValue)}</span>
                <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Settlement / cheque ref (optional)"
                  className="h-8 min-w-[180px] flex-1 rounded-md border border-white/20 bg-white/10 px-2.5 text-[12.5px] text-white placeholder:text-white/50 outline-none" />
                <Btn size="sm" variant="plain" className="text-white hover:bg-white/10" onClick={() => setPicked(new Set())}>Chhoro</Btn>
                <Btn size="sm" variant="success" loading={settle.isPending} onClick={() => settle.mutate()} icon={<Wallet className="h-3.5 w-3.5" />}>Paisa mil gaya</Btn>
              </div>
            )}

            <div className="mt-3 border-t border-slate-100 dark:border-slate-800">
              {rows.length === 0 ? (
                <EmptyState icon={<CheckCircle2 className="h-5 w-5" />} title="Kisi courier ke paas paisa nahi atka">Deliver hue sab COD orders ka paisa aa chuka hai.</EmptyState>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  <li className="flex items-center gap-3 bg-slate-50 px-4 py-2 text-[11.5px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/40 sm:px-5">
                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300" aria-label="Sab chuno"
                      checked={rows.length > 0 && rows.every((r) => picked.has(r.id))}
                      onChange={(e) => setPicked(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())} />
                    <span className="w-20">Order</span>
                    <span className="flex-1">Customer · courier · CN</span>
                    <span className="hidden w-32 text-right sm:block">Deliver hua</span>
                    <span className="w-24 text-right">Raqam</span>
                  </li>
                  {rows.map((o) => (
                    <li key={o.id}>
                      <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 sm:px-5">
                        <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={picked.has(o.id)} onChange={() => toggle(o.id)} />
                        <Link to={`/online-orders?order=${o.id}`} onClick={(e) => e.stopPropagation()} className="w-20 text-[13px] font-semibold text-slate-900 hover:underline dark:text-white">
                          #{o.externalOrderNumber ?? o.externalOrderId}
                        </Link>
                        <span className="min-w-0 flex-1 truncate text-[13px] text-slate-600 dark:text-slate-300">
                          {o.customerName}{o.customerCity ? ` · ${o.customerCity}` : ''} · {o.courier ?? '—'}{o.trackingNumber ? <span className="font-mono text-[12px]"> · {o.trackingNumber}</span> : null}
                        </span>
                        <span className="hidden w-32 text-right text-[12px] text-slate-500 sm:block">
                          {o.deliveredAt ? whenText(o.deliveredAt) : '—'}
                          {o.daysWaiting !== null && o.daysWaiting >= 7 && <Badge tone="warning" className="ml-1">{o.daysWaiting} din</Badge>}
                        </span>
                        <span className="w-24 text-right text-[13px] font-semibold tabular-nums text-slate-900 dark:text-white">{rs(o.total)}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </>
      )}
    </Page>
  );
}
