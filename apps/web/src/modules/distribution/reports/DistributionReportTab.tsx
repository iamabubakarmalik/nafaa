/**
 * Distribution tab of the report centre. Two views:
 *   DSR      one business day per booker: planned and visited shops, strike
 *            rate, orders, lines per call, drop size, no-order reasons,
 *            recovery and working hours.
 *   Summary  the chosen period: booked vs invoiced, delivery outcomes,
 *            returns, cash at the door, recoveries, and the split by route,
 *            booker, product and scheme.
 *   Visits   per booker per day in the period: productive and unproductive
 *            shops, strike rate, coverage, time in market, distance between
 *            check-ins and GPS flags, with the flagged visits listed.
 * Each view prints (A4 / PDF / thermal) and exports CSV.
 */

import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CalendarDays, Clock, Download, MapPin, Navigation, Route as RouteIcon, ShoppingBag, Truck, UserRound, Wallet } from 'lucide-react';
import { Button, FilterMenu, KpiCard, KpiRow, Segmented, Skeleton, Table, TBody, Td, Th, THead, Tr } from '@/design-system/components';
import { PrintButton, type PrintDoc } from '@core/print';
import { cn } from '@core/lib/cn';
import { downloadCsv } from '@modules/reports/center/print';
import type { Formatter } from '@modules/reports/center/components/parts';
import { DIST_KEY, distributionApi, type Dsr, type DistSummary } from '../api/distribution.api';
import { Empty, Panel, Pill } from '../components/parts';
import { dayKeyLabel, dayTime, trim } from '../lib/meta';
import { phase2Api, type VisitAnalytics } from '../api/phase2.api';
import { t as tr } from '@core/i18n';

type View = 'dsr' | 'summary' | 'visits';
const hm = (min: number) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;
const hour = (h: number | null) => (h == null ? '—' : `${((h + 11) % 12) + 1}${h < 12 ? 'am' : 'pm'}`);

export function DistributionReportTab({ period, f }: { period: { from: string; to: string }; f: Formatter }) {
  const [params] = useSearchParams();
  const [view, setView] = useState<View>(params.get('view') === 'summary' ? 'summary' : params.get('view') === 'visits' ? 'visits' : 'dsr');
  const [date, setDate] = useState(params.get('date') ?? period.to);
  const [routeId, setRouteId] = useState('');
  const [bookerId, setBookerId] = useState('');
  const routesQ = useQuery({ queryKey: [DIST_KEY, 'routes'], queryFn: () => distributionApi.routes(), staleTime: 5 * 60_000 });
  const from = period.from === 'all' ? undefined : period.from;
  const filters = { routeId: routeId || undefined, bookerId: bookerId || undefined };
  const dsrQ = useQuery({ queryKey: [DIST_KEY, 'dsr', date, filters], queryFn: () => distributionApi.dsr({ date, ...filters }), enabled: view === 'dsr', placeholderData: keepPreviousData });
  const visitsQ = useQuery({
    queryKey: [DIST_KEY, 'visits-report', from, period.to, filters],
    queryFn: () => phase2Api.visits({ from: from ?? period.to, to: period.to, ...filters, flags: true }),
    enabled: view === 'visits', placeholderData: keepPreviousData,
  });
  const sumQ = useQuery({ queryKey: [DIST_KEY, 'summary', from, period.to, filters], queryFn: () => distributionApi.summary({ from, to: period.to, ...filters }), enabled: view === 'summary', placeholderData: keepPreviousData });

  const bookers = useMemo(() => {
    const m = new Map<string, string>();
    (routesQ.data ?? []).forEach((r) => { if (r.bookerId) m.set(r.bookerId, r.bookerName ?? tr('Booker')); });
    return [...m.entries()];
  }, [routesQ.data]);
  const routeName = routesQ.data?.find((r) => r.id === routeId)?.name;
  const bookerName = bookers.find(([id]) => id === bookerId)?.[1];

  const doc = (): PrintDoc => {
    if (view === 'dsr') { if (!dsrQ.data) throw new Error(tr('Report abhi aa rahi hai')); return dsrDoc(dsrQ.data, f, routeName, bookerName); }
    if (view === 'visits') { if (!visitsQ.data) throw new Error(tr('Report abhi aa rahi hai')); return visitsDoc(visitsQ.data, f, routeName, bookerName); }
    if (!sumQ.data) throw new Error(tr('Report abhi aa rahi hai'));
    return summaryDoc(sumQ.data, f, routeName, bookerName);
  };
  const csv = () => {
    const name = view === 'dsr' ? `dsr-${date}.csv` : view === 'visits' ? `visits-${visitsQ.data?.from}-${visitsQ.data?.to}.csv` : `distribution-${sumQ.data?.from}-${sumQ.data?.to}.csv`;
    try { downloadCsv(doc(), name); toast.success(tr('CSV ban gayi')); } catch (e) { toast.error((e as Error).message); }
  };
  const ready = view === 'dsr' ? !!dsrQ.data : view === 'visits' ? !!visitsQ.data : !!sumQ.data;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
        <Segmented label={tr('Report')} value={view} onChange={(v) => setView(v as View)} items={[{ value: 'dsr', label: tr('DSR (din)') }, { value: 'summary', label: tr('Period summary') }, { value: 'visits', label: tr('Visits') }]} />
        {view === 'dsr' && (
          <label className="inline-flex h-9 items-center gap-2 rounded-xl bg-white px-3 text-[0.8125rem] ring-1 ring-slate-200">
            <CalendarDays className="h-4 w-4 text-slate-400" />
            <input type="date" aria-label={tr('Din')} value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="bg-transparent outline-none" />
          </label>
        )}
        <FilterMenu icon={MapPin} label={tr('Route')} value={routeId} active={!!routeId} valueLabel={routeName}
          options={[{ value: '', label: tr('Sab routes') }, ...(routesQ.data ?? []).map((r) => ({ value: r.id, label: r.name }))]} onChange={setRouteId} />
        <FilterMenu icon={UserRound} label={tr('Booker')} value={bookerId} active={!!bookerId} valueLabel={bookerName}
          options={[{ value: '', label: tr('Sab bookers') }, ...bookers.map(([id, name]) => ({ value: id, label: name }))]} onChange={setBookerId} />
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" disabled={!ready} leftIcon={<Download className="h-4 w-4" />} onClick={csv}>{tr('CSV')}</Button>
          <PrintButton doc={doc} disabled={!ready} />
        </div>
      </div>

      {view === 'dsr' ? <DsrView data={dsrQ.data} f={f} /> : view === 'visits' ? <VisitsView data={visitsQ.data} f={f} /> : <SummaryView data={sumQ.data} f={f} />}
    </div>
  );
}

function DsrView({ data, f }: { data?: Dsr; f: Formatter }) {
  if (!data) return <Skeleton className="h-72 rounded-3xl" />;
  const t = data.totals;
  return (
    <>
      <KpiRow cols={5}>
        <KpiCard icon={MapPin} color="#2563eb" label={tr('Visits')} value={`${t.visited}/${t.planned}`} hint={tr('kiye / plan')} />
        <KpiCard icon={ShoppingBag} color="#16a34a" label={tr('Strike rate')} value={`${Math.round(t.strikeRate)}%`} hint={tr('{{productive}} dukanon par order', { productive: t.productive })} />
        <KpiCard icon={Truck} color="#7c3aed" label={tr('Orders')} value={String(t.orders)} hint={tr('{{lines}} lines', { lines: t.lines })} />
        <KpiCard icon={Wallet} color="#0891b2" label={tr('Order value')} value={f.money(t.value)} hint={t.orders ? tr('ausat {{value}}', { value: f.money(t.value / t.orders) }) : '—'} />
        <KpiCard icon={Wallet} color="#059669" label={tr('Recovery')} value={f.money(t.collected)} hint={dayKeyLabel(data.date)} />
      </KpiRow>
      <Panel flush title={tr('DSR — {{date}}', { date: dayKeyLabel(data.date) })} sub={tr('Har booker ka din')}>
        {!data.bookers.length ? <Empty text={tr('Is din kisi booker ka visit ya order nahi.')} /> : (
          <div className="overflow-x-auto pb-2">
            <Table minWidth="64rem" className="[&_table]:text-[0.8125rem]">
              <THead className="text-start text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">
                <Tr>
                  <Th className="px-4 py-2 sm:px-5">{tr('Booker')}</Th><Th className="px-3 py-2 text-end">{tr('Visits')}</Th><Th className="px-3 py-2 text-end">{tr('Strike')}</Th>
                  <Th className="px-3 py-2 text-end">{tr('Orders')}</Th><Th className="px-3 py-2 text-end">{tr('Value')}</Th><Th className="px-3 py-2 text-end">{tr('Lines/call')}</Th>
                  <Th className="px-3 py-2 text-end">{tr('Drop size')}</Th><Th className="px-3 py-2">{tr('Order kyun nahi')}</Th><Th className="px-3 py-2 text-end">{tr('Recovery')}</Th><Th className="px-4 py-2 sm:px-5">{tr('Waqt')}</Th>
                </Tr>
              </THead>
              <TBody className="divide-y divide-slate-100">
                {data.bookers.map((b) => (
                  <Tr key={b.bookerId}>
                    <Td className="px-4 py-2.5 sm:px-5"><div className="font-semibold text-slate-900">{b.bookerName}</div><div className="max-w-[14rem] truncate text-[0.75rem] text-slate-500">{b.routes.join(' · ')}</div></Td>
                    <Td className="whitespace-nowrap px-3 py-2.5 text-end tabular-nums">{b.visited}/{b.planned}{b.outOfRangeCheckIns > 0 && <div className="text-[0.6875rem] text-amber-700">{tr('{{outOfRangeCheckIns}} door se', { outOfRangeCheckIns: b.outOfRangeCheckIns })}</div>}</Td>
                    <Td className="whitespace-nowrap px-3 py-2.5 text-end"><Pill tone={b.strikeRate >= 70 ? 'green' : b.strikeRate >= 40 ? 'amber' : 'rose'}>{Math.round(b.strikeRate)}%</Pill></Td>
                    <Td className="whitespace-nowrap px-3 py-2.5 text-end tabular-nums">{b.orders}</Td>
                    <Td className="whitespace-nowrap px-3 py-2.5 text-end font-semibold tabular-nums text-slate-900">{f.money(b.value)}{b.schemeDiscount > 0 && <div className="text-[0.6875rem] font-normal text-success-700">{tr('scheme {{schemeDiscount}}', { schemeDiscount: f.money(b.schemeDiscount) })}</div>}</Td>
                    <Td className="whitespace-nowrap px-3 py-2.5 text-end tabular-nums">{b.linesPerCall}</Td>
                    <Td className="whitespace-nowrap px-3 py-2.5 text-end tabular-nums">{f.money(b.dropSize)}</Td>
                    <Td className="px-3 py-2.5 text-[0.75rem] text-slate-600">{b.noOrder.length ? b.noOrder.map((n) => `${n.label} (${n.count})`).join(', ') : '—'}</Td>
                    <Td className="whitespace-nowrap px-3 py-2.5 text-end tabular-nums">{f.money(b.collected)}{b.collectedPending > 0 && <div className="text-[0.6875rem] text-amber-700">{tr('{{collectedPending}} baqi', { collectedPending: f.money(b.collectedPending) })}</div>}</Td>
                    <Td className="px-4 py-2.5 text-[0.75rem] text-slate-600 sm:px-5">{hour(b.firstActivityHour)} – {hour(b.lastActivityHour)}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </div>
        )}
      </Panel>
    </>
  );
}

function SummaryView({ data, f }: { data?: DistSummary; f: Formatter }) {
  if (!data) return <Skeleton className="h-72 rounded-3xl" />;
  const inv = data.invoiced;
  const settled = inv.delivered + inv.partial + inv.returned;
  return (
    <>
      <KpiRow cols={5}>
        <KpiCard icon={ShoppingBag} color="#d97706" label={tr('Booked')} value={f.money(data.booked.value)} hint={tr('{{orders}} orders · {{cancelled}} cancel', { orders: data.booked.orders, cancelled: data.booked.cancelled })} />
        <KpiCard icon={Truck} color="#7c3aed" label={tr('Invoiced')} value={f.money(inv.value)} hint={tr('{{invoices}} invoices', { invoices: inv.invoices })} />
        <KpiCard icon={Truck} color="#16a34a" label={tr('Delivery')} value={`${inv.delivered}/${settled || 0}`} hint={tr('{{partial}} kuch · {{returned}} sab wapas · {{notSettled}} baqi', { partial: inv.partial, returned: inv.returned, notSettled: inv.notSettled })} />
        <KpiCard icon={Truck} color="#e11d48" label={tr('Wapas aaya')} value={f.money(inv.returnsValue)} hint={inv.value ? tr('{{value}}% Invoice ka', { value: ((inv.returnsValue / inv.value) * 100).toFixed(1) }) : '—'} />
        <KpiCard icon={Wallet} color="#059669" label={tr('Cash + recovery')} value={f.money(inv.cashAtDelivery + data.recoveries.verified)} hint={tr('Recovery {{verified}}', { verified: f.money(data.recoveries.verified) })} />
      </KpiRow>
      <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        <SplitTable title={tr('Route war')} icon={RouteIcon} rows={data.byRoute.map((r) => ({ key: r.routeId ?? 'none', name: r.routeName ?? 'Route nahi', invoices: r.invoices, value: r.value, returns: r.returns, cash: r.cash }))} f={f} />
        <SplitTable title={tr('Booker war')} icon={UserRound} rows={data.byBooker.map((r) => ({ key: r.bookerId, name: r.bookerName ?? '—', invoices: r.invoices, value: r.value, returns: r.returns, cash: r.cash }))} f={f} />
        <Panel flush title={tr('Top products')}>
          {!data.topProducts.length ? <Empty text={tr('Is period me koi Invoice nahi.')} /> : (
            <ul className="divide-y divide-slate-100 pb-2">
              {data.topProducts.slice(0, 10).map((p, i) => {
                const max = data.topProducts[0].value || 1;
                return (
                  <li key={p.productId} className="px-4 py-2 sm:px-5">
                    <div className="flex items-center justify-between gap-2 text-[0.8125rem]">
                      <span className="min-w-0 truncate"><span className="me-1.5 text-slate-400">{i + 1}</span><span className="font-semibold text-slate-900">{p.name}</span> <span className="text-slate-500">· {trim(p.baseQty)} {p.baseUnit}</span></span>
                      <span className="shrink-0 font-semibold tabular-nums text-slate-900">{f.money(p.value)}</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-slate-100"><div className="h-1.5 rounded-full bg-violet-500" style={{ width: `${(p.value / max) * 100}%` }} /></div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
        <Panel flush title={tr('Schemes')} sub={tr('Kitna discount aur free maal diya')}>
          {!data.bySchemes.length ? <Empty text={tr('Is period me koi scheme nahi lagi.')} /> : (
            <div className="overflow-x-auto pb-2">
              <Table minWidth="30rem" className="[&_table]:text-[0.8125rem]">
                <THead className="text-start text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">
                  <Tr><Th className="px-4 py-2 sm:px-5">{tr('Scheme')}</Th><Th className="px-3 py-2 text-end">{tr('Lines')}</Th><Th className="px-3 py-2 text-end">{tr('Discount')}</Th><Th className="px-4 py-2 text-end sm:px-5">{tr('Free')}</Th></Tr>
                </THead>
                <TBody className="divide-y divide-slate-100">
                  {data.bySchemes.map((s) => (
                    <Tr key={s.schemeId}>
                      <Td className="px-4 py-2.5 sm:px-5"><div className="font-semibold text-slate-900">{s.name}</div>{s.isClaimable && <div className="text-[0.6875rem] text-violet-700">{tr('Company se claim')}</div>}</Td>
                      <Td className="whitespace-nowrap px-3 py-2.5 text-end tabular-nums">{s.lines}</Td>
                      <Td className="whitespace-nowrap px-3 py-2.5 text-end tabular-nums">{s.discount ? f.money(s.discount) : '—'}</Td>
                      <Td className="whitespace-nowrap px-4 py-2.5 text-end tabular-nums sm:px-5">{s.freeBaseQty ? tr('{{freeBaseQty}} pcs', { freeBaseQty: trim(s.freeBaseQty) }) : '—'}{s.freeCost != null && s.freeCost > 0 && <div className="text-[0.6875rem] text-slate-500">{tr('cost {{freeCost}}', { freeCost: f.cost(s.freeCost) })}</div>}</Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}

interface Split { key: string; name: string; invoices: number; value: number; returns: number; cash: number }
function SplitTable({ title, icon: Icon, rows, f }: { title: string; icon: typeof MapPin; rows: Split[]; f: Formatter }) {
  return (
    <Panel flush title={<span className="inline-flex items-center gap-1.5"><Icon className="h-4 w-4 text-slate-400" />{title}</span>}>
      {!rows.length ? <Empty text={tr('Is period me koi Invoice nahi.')} /> : (
        <div className="overflow-x-auto pb-2">
          <Table minWidth="30rem" className="[&_table]:text-[0.8125rem]">
            <THead className="text-start text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">
              <Tr><Th className="px-4 py-2 sm:px-5">{tr('Naam')}</Th><Th className="px-3 py-2 text-end">{tr('Invoices')}</Th><Th className="px-3 py-2 text-end">{tr('Value')}</Th><Th className="px-3 py-2 text-end">{tr('Wapas')}</Th><Th className="px-4 py-2 text-end sm:px-5">{tr('Cash')}</Th></Tr>
            </THead>
            <TBody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <Tr key={r.key}>
                  <Td className="px-4 py-2.5 font-semibold text-slate-900 sm:px-5">{r.name}</Td>
                  <Td className="whitespace-nowrap px-3 py-2.5 text-end tabular-nums">{r.invoices}</Td>
                  <Td className="whitespace-nowrap px-3 py-2.5 text-end font-semibold tabular-nums text-slate-900">{f.money(r.value)}</Td>
                  <Td className={cn('px-3 py-2.5 text-end tabular-nums', r.returns ? 'text-rose-600' : 'text-slate-300')}>{r.returns ? f.money(r.returns) : '—'}</Td>
                  <Td className="whitespace-nowrap px-4 py-2.5 text-end tabular-nums sm:px-5">{f.money(r.cash)}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </div>
      )}
    </Panel>
  );
}

/* ───────────────────────── print / CSV ───────────────────────── */

function filterMeta(route?: string, booker?: string): Array<[string, string]> {
  return [...(route ? [[tr('Route'), route] as [string, string]] : []), ...(booker ? [[tr('Booker'), booker] as [string, string]] : [])];
}

function VisitsView({ data, f }: { data?: VisitAnalytics; f: Formatter }) {
  if (!data) return <Skeleton className="h-72 rounded-3xl" />;
  const t = data.totals;
  return (
    <>
      <KpiRow cols={5}>
        <KpiCard icon={MapPin} color="#2563eb" label={tr('Visits')} value={`${t.visited}/${t.planned}`} hint={tr('kiye / plan')} />
        <KpiCard icon={ShoppingBag} color="#16a34a" label={tr('Strike rate')} value={`${Math.round(t.strikeRate)}%`} hint={tr('{{productive}} order wali · {{unproductive}} bina order', { productive: t.productive, unproductive: t.unproductive })} />
        <KpiCard icon={Wallet} color="#7c3aed" label={tr('Orders')} value={String(t.orders)} hint={f.money(t.value)} />
        <KpiCard icon={Navigation} color="#0891b2" label={tr('Safar')} value={`${trim(t.travelledKm)} km`} hint={tr('check-ins ke beech seedhi doori')} />
        <KpiCard icon={MapPin} color={t.farFromShop || t.noGps ? '#e11d48' : '#059669'} label={tr('GPS flags')} value={String(t.farFromShop + t.noGps)} hint={tr('{{farFromShop}} door se · {{noGps}} bina GPS', { farFromShop: t.farFromShop, noGps: t.noGps })} />
      </KpiRow>
      <Panel flush title={tr('Visits — {{from}}{{value}}', { from: dayKeyLabel(data.from), value: data.to !== data.from ? tr(' se {{dayKeyLabel}}', { dayKeyLabel: dayKeyLabel(data.to) }) : '' })} sub={tr('Har booker ka har din')}>
        {!data.rows.length ? <Empty text={tr('Is period me koi visit ya plan nahi.')} /> : (
          <div className="overflow-x-auto pb-2">
            <Table minWidth="72rem" className="[&_table]:text-[0.8125rem]">
              <THead className="text-start text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">
                <Tr>
                  <Th className="px-4 py-2 sm:px-5">{tr('Booker / din')}</Th><Th className="px-3 py-2 text-end">{tr('Plan')}</Th><Th className="px-3 py-2 text-end">{tr('Visit')}</Th>
                  <Th className="px-3 py-2 text-end">{tr('Order wali')}</Th><Th className="px-3 py-2 text-end">{tr('Bina order')}</Th><Th className="px-3 py-2 text-end">{tr('Strike')}</Th>
                  <Th className="px-3 py-2 text-end">{tr('Coverage')}</Th><Th className="px-3 py-2 text-end">{tr('Market me')}</Th><Th className="px-3 py-2 text-end">{tr('Ausat visit')}</Th>
                  <Th className="px-3 py-2 text-end">{tr('Km')}</Th><Th className="px-4 py-2 sm:px-5">{tr('GPS')}</Th>
                </Tr>
              </THead>
              <TBody className="divide-y divide-slate-100">
                {data.rows.map((r) => (
                  <Tr key={`${r.bookerId}|${r.date}`}>
                    <Td className="px-4 py-2.5 sm:px-5"><div className="font-semibold text-slate-900">{r.bookerName ?? tr('Booker')}</div><div className="max-w-[14rem] truncate text-[0.75rem] text-slate-500">{dayKeyLabel(r.date)}{r.routes.length ? ` · ${r.routes.join(', ')}` : ''}</div></Td>
                    <Td className="whitespace-nowrap px-3 py-2.5 text-end tabular-nums">{r.planned}</Td>
                    <Td className="whitespace-nowrap px-3 py-2.5 text-end tabular-nums">{r.visited}{r.notVisited > 0 && <div className="text-[0.6875rem] text-slate-500">{tr('{{notVisited}} reh gaye', { notVisited: r.notVisited })}</div>}</Td>
                    <Td className="whitespace-nowrap px-3 py-2.5 text-end tabular-nums text-success-700">{r.productive}</Td>
                    <Td className="whitespace-nowrap px-3 py-2.5 text-end tabular-nums text-rose-600">{r.unproductive}</Td>
                    <Td className="whitespace-nowrap px-3 py-2.5 text-end"><Pill tone={r.strikeRate >= 70 ? 'green' : r.strikeRate >= 40 ? 'amber' : 'rose'}>{Math.round(r.strikeRate)}%</Pill></Td>
                    <Td className="whitespace-nowrap px-3 py-2.5 text-end tabular-nums">{r.planned ? `${Math.round(r.coverage)}%` : '—'}</Td>
                    <Td className="whitespace-nowrap px-3 py-2.5 text-end tabular-nums"><span className="inline-flex items-center gap-1"><Clock className="h-3 w-3 text-slate-400" />{hm(r.timeInMarketMin)}</span><div className="text-[0.6875rem] text-slate-500">{r.longestGapMin ? tr('lamba waqfa {{longestGapMin}} min', { longestGapMin: r.longestGapMin }) : ''}</div></Td>
                    <Td className="whitespace-nowrap px-3 py-2.5 text-end tabular-nums">{r.avgVisitMin != null ? tr('{{avgVisitMin}} min', { avgVisitMin: r.avgVisitMin }) : '—'}</Td>
                    <Td className="whitespace-nowrap px-3 py-2.5 text-end tabular-nums">{trim(r.travelledKm)}</Td>
                    <Td className="px-4 py-2.5 text-[0.75rem] sm:px-5">
                      {r.flags.farFromShop + r.flags.noGps + r.flags.poorAccuracy === 0 ? <span className="text-success-700">{tr('Theek')}</span> : (
                        <span className="flex flex-wrap gap-1">
                          {r.flags.farFromShop > 0 && <Pill tone="rose">{tr('{{farFromShop}} door se', { farFromShop: r.flags.farFromShop })}</Pill>}
                          {r.flags.noGps > 0 && <Pill tone="amber">{tr('{{noGps}} bina GPS', { noGps: r.flags.noGps })}</Pill>}
                          {r.flags.poorAccuracy > 0 && <Pill tone="slate">{tr('{{poorAccuracy}} kamzor GPS', { poorAccuracy: r.flags.poorAccuracy })}</Pill>}
                        </span>
                      )}
                      {r.flags.shopWithoutGps > 0 && <div className="mt-0.5 text-[0.6875rem] text-slate-500">{tr('{{shopWithoutGps}} dukan ki location save nahi', { shopWithoutGps: r.flags.shopWithoutGps })}</div>}
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </div>
        )}
      </Panel>
      {!!data.flagged?.length && (
        <Panel flush title={tr('Flag wali visits')} sub={tr('Dukan se door check-in ya bina GPS — booker se poochein')}>
          <ul className="divide-y divide-slate-100">
            {data.flagged.map((v) => (
              <li key={v.id} className="flex items-center gap-3 px-4 py-2.5 text-[0.8125rem] sm:px-5">
                <Pill tone={v.reason === 'FAR' ? 'rose' : 'amber'}>{v.reason === 'FAR' ? tr('{{value}} m door', { value: v.distanceM ?? '?' }) : tr('Bina GPS')}</Pill>
                <span className="min-w-0 flex-1 truncate"><b className="text-slate-900">{v.customerName ?? tr('Customer')}</b> · {v.bookerName ?? tr('Booker')}</span>
                <span className="shrink-0 text-[0.75rem] text-slate-500">{dayTime(v.checkInAt)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </>
  );
}

function visitsDoc(d: VisitAnalytics, f: Formatter, route?: string, booker?: string): PrintDoc {
  return {
    title: tr('Visit report'),
    subtitle: d.from === d.to ? dayKeyLabel(d.from) : tr('{{from}} se {{dayKeyLabel}}', { from: dayKeyLabel(d.from), dayKeyLabel: dayKeyLabel(d.to) }),
    meta: filterMeta(route, booker),
    sections: [
      { kind: 'rows', title: tr('Kul'), rows: [
        { label: tr('Visits (kiye / plan)'), value: `${d.totals.visited}/${d.totals.planned}` },
        { label: tr('Order wali / bina order'), value: `${d.totals.productive} / ${d.totals.unproductive}` },
        { label: tr('Strike rate'), value: `${Math.round(d.totals.strikeRate)}%` },
        { label: tr('Order value'), value: f.money(d.totals.value), strong: true },
        { label: tr('GPS flags'), value: `${d.totals.farFromShop} door se · ${d.totals.noGps} bina GPS` },
      ] },
      { kind: 'table', title: tr('Booker / din'), columns: [
        { label: tr('Booker') }, { label: tr('Din') }, { label: tr('Plan'), align: 'right' }, { label: tr('Visit'), align: 'right' }, { label: tr('Order wali'), align: 'right' },
        { label: tr('Strike'), align: 'right' }, { label: tr('Market me'), align: 'right', wideOnly: true }, { label: tr('Km'), align: 'right', wideOnly: true }, { label: tr('GPS flags'), wideOnly: true },
      ], rows: d.rows.map((r) => [
        r.bookerName ?? '', r.date, String(r.planned), String(r.visited), String(r.productive), `${Math.round(r.strikeRate)}%`, hm(r.timeInMarketMin),
        trim(r.travelledKm), tr('{{farFromShop}} door · {{noGps}} bina GPS', { farFromShop: r.flags.farFromShop, noGps: r.flags.noGps }),
      ]) },
    ],
  };
}

function dsrDoc(d: Dsr, f: Formatter, route?: string, booker?: string): PrintDoc {
  return {
    title: tr('DSR — Daily sales report'),
    subtitle: dayKeyLabel(d.date),
    meta: filterMeta(route, booker),
    sections: [
      { kind: 'rows', title: tr('Kul'), rows: [
        { label: tr('Visits (kiye / plan)'), value: `${d.totals.visited}/${d.totals.planned}` },
        { label: tr('Strike rate'), value: `${Math.round(d.totals.strikeRate)}%` },
        { label: tr('Orders'), value: String(d.totals.orders) },
        { label: tr('Lines'), value: String(d.totals.lines) },
        { label: tr('Order value'), value: f.money(d.totals.value), strong: true },
        { label: tr('Recovery'), value: f.money(d.totals.collected) },
      ] },
      { kind: 'table', title: tr('Booker war'), columns: [
        { label: tr('Booker') }, { label: tr('Visits'), align: 'right' }, { label: tr('Strike'), align: 'right' }, { label: tr('Orders'), align: 'right' },
        { label: tr('Value'), align: 'right' }, { label: tr('Lines/call'), align: 'right', wideOnly: true }, { label: tr('Drop size'), align: 'right', wideOnly: true },
        { label: tr('Recovery'), align: 'right' }, { label: tr('Order kyun nahi'), wideOnly: true },
      ], rows: d.bookers.map((b) => [
        b.bookerName, `${b.visited}/${b.planned}`, `${Math.round(b.strikeRate)}%`, String(b.orders), f.money(b.value), String(b.linesPerCall), f.money(b.dropSize),
        f.money(b.collected), b.noOrder.map((n) => `${n.label} (${n.count})`).join(', '),
      ]) },
    ],
  };
}

function summaryDoc(s: DistSummary, f: Formatter, route?: string, booker?: string): PrintDoc {
  const split = (title: string, rows: Split[]) => ({
    kind: 'table' as const, title,
    columns: [{ label: tr('Naam') }, { label: tr('Invoices'), align: 'right' as const }, { label: tr('Value'), align: 'right' as const }, { label: tr('Wapas'), align: 'right' as const }, { label: tr('Cash'), align: 'right' as const }],
    rows: rows.map((r) => [r.name, String(r.invoices), f.money(r.value), f.money(r.returns), f.money(r.cash)]),
  });
  return {
    title: tr('Distribution summary'),
    subtitle: `${dayKeyLabel(s.from)} – ${dayKeyLabel(s.to)}`,
    meta: filterMeta(route, booker),
    sections: [
      { kind: 'rows', title: tr('Kul'), rows: [
        { label: tr('Booked orders'), value: `${s.booked.orders} · ${f.money(s.booked.value)}` },
        { label: tr('Cancel'), value: String(s.booked.cancelled) },
        { label: tr('Invoices'), value: `${s.invoiced.invoices} · ${f.money(s.invoiced.value)}`, strong: true },
        { label: tr('Scheme discount'), value: f.money(s.invoiced.schemeDiscount) },
        { label: tr('Delivered / kuch wapas / sab wapas / baqi'), value: `${s.invoiced.delivered} / ${s.invoiced.partial} / ${s.invoiced.returned} / ${s.invoiced.notSettled}` },
        { label: tr('Wapas aaya'), value: f.money(s.invoiced.returnsValue) },
        { label: tr('Delivery par cash'), value: f.money(s.invoiced.cashAtDelivery) },
        { label: tr('Recovery verified'), value: f.money(s.recoveries.verified) },
        { label: tr('Recovery verify baqi'), value: f.money(s.recoveries.pending) },
      ] },
      split('Route war', s.byRoute.map((r) => ({ key: r.routeId ?? '', name: r.routeName ?? 'Route nahi', invoices: r.invoices, value: r.value, returns: r.returns, cash: r.cash }))),
      split('Booker war', s.byBooker.map((r) => ({ key: r.bookerId, name: r.bookerName ?? '—', invoices: r.invoices, value: r.value, returns: r.returns, cash: r.cash }))),
      { kind: 'table', title: tr('Top products'), columns: [{ label: tr('Product') }, { label: tr('Quantity'), align: 'right' }, { label: tr('Value'), align: 'right' }],
        rows: s.topProducts.map((p) => [p.name, `${trim(p.baseQty)} ${p.baseUnit}`, f.money(p.value)]) },
      { kind: 'table', title: tr('Schemes'), columns: [{ label: tr('Scheme') }, { label: tr('Lines'), align: 'right' }, { label: tr('Discount'), align: 'right' }, { label: tr('Free pcs'), align: 'right' }],
        rows: s.bySchemes.map((x) => [x.name, String(x.lines), f.money(x.discount), trim(x.freeBaseQty)]) },
    ],
  };
}
