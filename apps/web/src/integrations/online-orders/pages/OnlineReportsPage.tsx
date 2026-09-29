import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, Download, MapPin, ShieldBan, Users } from 'lucide-react';
import { apiErrorMessage, onlineOrdersApi } from '../api/online-orders.api';
import { useSalesChannels } from '../hooks/useSalesChannels';
import { rs } from '../lib/labels';
import { Badge, Banner, Btn, Card, EmptyState, Page, Segmented, Stat, inputCls } from '../components/ui/kit';
import { cn } from '@core/lib/cn';

/* ═════════════════════════════════════════════════════════════
   ONLINE REPORTS — kitna bika, kahan se, kaun sa shehar RTO karta
   hai, kaun sa courier behtar, COD kitne din se atka.
   ═════════════════════════════════════════════════════════════ */

type Range = '7' | '30' | '90' | 'custom';
const pkDay = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(d);

export default function OnlineReportsPage() {
  const [range, setRange] = useState<Range>('30');
  const [from, setFrom] = useState(pkDay(new Date(Date.now() - 29 * 86_400_000)));
  const [to, setTo] = useState(pkDay(new Date()));
  const [channel, setChannel] = useState('');
  const { data: channels } = useSalesChannels();

  const q = useMemo(() => {
    if (range === 'custom') return { from, to };
    const days = Number(range);
    return { from: pkDay(new Date(Date.now() - (days - 1) * 86_400_000)), to: pkDay(new Date()) };
  }, [range, from, to]);

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['online-report', q, channel],
    queryFn: () => onlineOrdersApi.report({ ...q, integrationId: channel || undefined }),
    placeholderData: (prev) => prev,
  });
  const exp = useMutation({
    mutationFn: () => onlineOrdersApi.exportCsv({ ...q, integrationId: channel || undefined }),
    onSuccess: () => toast.success('CSV download ho gayi — Excel me kholein'),
    onError: (e) => toast.error(apiErrorMessage(e, 'CSV nahi bani')),
  });

  const maxDay = Math.max(1, ...(data?.byDay ?? []).map((d) => d.value));
  const t = data?.totals;

  return (
    <Page back={{ to: '/online-orders', label: 'Online orders' }} title="Online reports"
      subtitle="Online sale ka poora hisaab — channel, shehar, courier, RTO aur COD."
      actions={
        <>
          <Link to="/online-orders/customers"><Btn icon={<Users className="h-4 w-4" />}>Customers</Btn></Link>
          <Link to="/online-store/blocklist"><Btn icon={<ShieldBan className="h-4 w-4" />}>Block list</Btn></Link>
          <Btn loading={exp.isPending} onClick={() => exp.mutate()} icon={<Download className="h-4 w-4" />}>CSV (Excel)</Btn>
        </>
      }>
      <div className="flex flex-wrap items-center gap-2">
        <Segmented value={range} onChange={setRange} items={[
          { value: '7', label: '7 din' }, { value: '30', label: '30 din' }, { value: '90', label: '90 din' }, { value: 'custom', label: 'Tareekh' },
        ]} />
        {range === 'custom' && (
          <>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={cn(inputCls, 'w-auto')} />
            <span className="text-slate-400">—</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={cn(inputCls, 'w-auto')} />
          </>
        )}
        {(channels?.length ?? 0) > 1 && (
          <select value={channel} onChange={(e) => setChannel(e.target.value)} className={cn(inputCls, 'w-auto')}>
            <option value="">Sab channels</option>
            {channels!.map((c) => <option key={c.id} value={c.id}>{c.displayName}</option>)}
          </select>
        )}
        {isFetching && <span className="text-[12px] text-slate-400">Taaza ho raha…</span>}
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />)}</div>
      ) : error || !data || !t ? (
        <Card><EmptyState title="Report nahi bani">{apiErrorMessage(error)}</EmptyState></Card>
      ) : t.orders === 0 ? (
        <Card><EmptyState title="Is waqt me koi online order nahi">Tareekh badal kar dekhein.</EmptyState></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Orders" value={t.orders} hint={`${rs(t.value)} · ausat ${rs(t.avgOrderValue)}`} />
            <Stat label="Deliver" value={`${t.delivered}`} hint={`${rs(t.deliveredValue)} · ${t.deliveryRate}% bheje hue`} />
            <Stat label="RTO (wapas)" value={`${t.rtoRate}%`} hint={`${t.returned} / ${t.dispatched} parcel`} tone={t.rtoRate >= 15 ? 'attention' : undefined} />
            <Stat label="Cancel / reject" value={`${t.cancelRate}%`} hint={`${t.cancelled} order`} tone={t.cancelRate >= 20 ? 'attention' : undefined} />
            <Stat label="Accept me waqt" value={t.avgAcceptMinutes === null ? '—' : t.avgAcceptMinutes < 60 ? `${t.avgAcceptMinutes} min` : `${Math.round(t.avgAcceptMinutes / 60)} ghante`} hint="order aane se bill tak" />
            <Stat label="Delivery me waqt" value={t.avgDeliveryDays === null ? '—' : `${t.avgDeliveryDays} din`} hint="courier ko dene se deliver tak" />
            <Stat label="Customers" value={t.customers} hint={`${t.repeatCustomers} ne dobara kharida`} />
            <Stat label="Naye (accept baqi)" value={t.pending} hint="abhi faisla nahi hua" tone={t.pending > 0 ? 'attention' : undefined} />
          </div>

          {data.riskyCities.length > 0 && (
            <Banner tone="warning" title="In shehron me RTO zyada hai" icon={<AlertTriangle className="h-4 w-4" />}>
              {data.riskyCities.map((c) => `${c.city} ${c.rtoRate}%`).join(' · ')} — yahan ke COD order call karke confirm karein ya advance lein.
            </Banner>
          )}

          <Card title="Roz ki sale" description={`${data.range.from} se ${data.range.to}`}>
            <div className="flex h-40 items-end gap-[2px]">
              {data.byDay.map((d) => (
                <div key={d.day} className="group relative flex h-full flex-1 flex-col justify-end" title={`${d.day}: ${d.orders} order · ${rs(d.value)}`}>
                  <div className="rounded-t bg-emerald-500/80 transition group-hover:bg-emerald-600" style={{ height: `${Math.max(d.value ? 3 : 0, (d.value / maxDay) * 100)}%` }} />
                </div>
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-slate-400"><span>{data.byDay[0]?.day}</span><span>{data.byDay[data.byDay.length - 1]?.day}</span></div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Channel-wise" flush>
              <Table head={['Channel', 'Orders', 'Sale', 'Deliver %', 'RTO %']}
                rows={data.byChannel.map((c) => [c.name, c.orders, rs(c.value), `${c.deliveryRate}%`, <Rto key="r" v={c.rtoRate} n={c.dispatched} />])} />
            </Card>
            <Card title="Courier-wise" flush>
              {data.byCourier.length === 0
                ? <EmptyState title="Abhi koi parcel nahi bheja" />
                : <Table head={['Courier', 'Bheje', 'Deliver %', 'RTO %']}
                    rows={data.byCourier.map((c) => [c.name, c.dispatched, `${c.deliveryRate}%`, <Rto key="r" v={c.rtoRate} n={c.dispatched} />])} />}
            </Card>
            <Card title={<span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-slate-400" /> Shehar-wise</span>} flush>
              <Table head={['Shehar', 'Orders', 'Sale', 'RTO %']}
                rows={data.byCity.map((c) => [c.city, c.orders, rs(c.value), <Rto key="r" v={c.rtoRate} n={c.dispatched} />])} />
            </Card>
            <Card title="Sab se zyada bikne wale" flush>
              <Table head={['Product', 'Qty', 'Sale']}
                rows={data.topProducts.map((p) => [<span key="n" className="line-clamp-1">{p.name}</span>, p.qty, rs(p.value)])} />
            </Card>
          </div>

          <Card title="COD kitne din se courier ke paas" description="Deliver ho chuka, paisa abhi jama nahi hua (poore account ka)."
            actions={<Link to="/online-orders/cod"><Btn size="sm">COD safha</Btn></Link>}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {data.codAging.map((a, i) => (
                <div key={a.label} className={cn('rounded-lg border p-3', i === 3 && a.count ? 'border-rose-200 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/5' : 'border-slate-200 dark:border-slate-800')}>
                  <div className="text-[12px] text-slate-500">{a.label}</div>
                  <div className="text-lg font-semibold tabular-nums text-slate-900 dark:text-white">{rs(a.value)}</div>
                  <div className="text-[12px] text-slate-500">{a.count} parcel</div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </Page>
  );
}

function Rto({ v, n }: { v: number; n: number }) {
  if (!n) return <span className="text-slate-400">—</span>;
  return <Badge tone={v >= 25 ? 'critical' : v >= 12 ? 'warning' : 'success'}>{v}%</Badge>;
}

function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  if (!rows.length) return <EmptyState title="Kuch nahi" />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead className="bg-slate-50 text-left text-[11.5px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/40">
          <tr>{head.map((h, i) => <th key={h} className={cn('px-4 py-2 sm:px-5', i > 0 && 'text-right')}>{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((r, i) => (
            <tr key={i}>{r.map((c, j) => <td key={j} className={cn('px-4 py-2 sm:px-5', j > 0 ? 'text-right tabular-nums' : 'max-w-[240px] font-medium text-slate-900 dark:text-white')}>{c}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
