/**
 * Dispatch report (/online-orders/dispatch-report): parcels sent in a period
 * and what happened to them. Totals, a daily dispatch chart, the outcome
 * donut, courier-wise success, and the audit list in tabs (still open,
 * delivered, returns, RTO in warehouse, pending RTO, out for delivery,
 * issue, stuck 5+ days, claims, re-dispatched, replacement). CSV and print.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  AlertTriangle, Banknote, BarChart3, CheckCircle2, Download, GraduationCap, Hourglass, PackageX, Repeat, RotateCcw, Send, ShieldAlert, Truck, Warehouse, XCircle,
} from 'lucide-react';
import { Card, DateRangeMenu, FilterBar, FilterMenu, KpiCard, KpiRow, PageHero, PageShell, Skeleton, heroButton, heroIconButton, resolveRange } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print';
import { BrandLogo } from '@/assets/brands/BrandLogo';
import { cn } from '@core/lib/cn';
import { businessDayKey, useBusinessDayStart } from '@core/lib/business-day';
import { rangeLabel } from '@core/lib/dateRange';
import { useReportRange } from '@modules/reports/prefs';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import { apiErrorMessage } from '../api/online-orders.api';
import { dispatchApi, type ReportTab } from '../api/dispatch.api';
import { brandIcon, courierBrand, rs } from '../lib/labels';
import { downloadCsv } from '../lib/orders';
import { REPORT_TAB_LABEL, dispatchReportDoc, reportCsv } from '../lib/dispatchPrint';
import { t } from '@core/i18n';

const TABS: ReportTab[] = ['all', 'open', 'delivered', 'returns', 'rto_wh', 'pending_rto', 'ofd', 'issue', 'stuck', 'claims', 'redispatched', 'replacement', 'cancelled'];
const COLORS = { delivered: '#16a34a', returned: '#c026d3', open: '#f59e0b', cancelled: '#94a3b8' };

export default function DispatchReportPage() {
  const startHour = useBusinessDayStart();
  const guide = usePageGuide();
  const theme = useChartTheme();
  const [range, setRange] = useReportRange('month');
  const [courier, setCourier] = useState('');
  const [tab, setTab] = useState<ReportTab>('all');
  const today = businessDayKey(new Date(), startHour);
  const period = resolveRange(range, startHour) ?? { from: today, to: today };
  const periodText = rangeLabel(period.from, period.to);
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['dispatch-report', period.from, period.to, courier || undefined],
    queryFn: () => dispatchApi.report({ ...period, courier: courier || undefined }),
    placeholderData: (p) => p,
  });
  const tt = data?.totals;
  const rows = (data?.rows ?? []).filter((r) => r.tabs.includes(tab));
  const donut = tt ? [
    { name: 'Delivered', value: tt.delivered, color: COLORS.delivered },
    { name: t('Returns'), value: tt.returned, color: COLORS.returned },
    { name: t('Raste me'), value: tt.inProcess, color: COLORS.open },
    { name: t('Cancelled'), value: tt.cancelled, color: COLORS.cancelled },
  ].filter((d) => d.value > 0) : [];
  const courierOptions = (data?.couriers ?? []).map((c) => ({ value: c.code, label: c.name ?? c.code, icon: brandIcon(courierBrand(c.code)) }));

  return (
    <PageShell>
      <PageHero title={t('Dispatch report')} chip={<><BarChart3 />{periodText}</>}
        meta={t('Is period me bheje gaye parcels aur un ka anjaam')}
        busy={isFetching && !isLoading} loading={isLoading}
        actions={<>
          <button type="button" className={heroButton} disabled={!data} onClick={() => downloadCsv(`dispatch-${period.from}-${period.to}-${tab}.csv`, reportCsv(rows))}><Download className="h-4 w-4" /> CSV</button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={() => dispatchReportDoc(data!, periodText, tab, rows)} disabled={!data} /></span>
          <Link to="/online-orders/dispatch" className={heroButton}><Truck className="h-4 w-4" /> <span className="hidden sm:inline">{t('Dispatch')}</span></Link>
          <button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={tt ? [
          { label: t('Bheje'), value: String(tt.dispatched) },
          { label: 'Delivered', value: String(tt.delivered), hint: tt.successRate == null ? undefined : t('{{rate}}% kamyab', { rate: tt.successRate }) },
          { label: t('Delivered COD'), value: rs(tt.deliveredCod) },
        ] : undefined} />

      <FilterBar>
        <DateRangeMenu value={range} onChange={setRange} startHour={startHour} defaultPreset="month" />
        <FilterMenu icon={Truck} label={t('Courier')} value={courier} active={!!courier} onChange={setCourier} options={[{ value: '', label: t('Sab couriers') }, ...courierOptions]} />
      </FilterBar>

      {isLoading ? <Skeleton className="h-64 rounded-3xl" /> : error ? <p className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{apiErrorMessage(error)}</p> : tt && (
        <>
          <KpiRow cols={5}>
            <KpiCard icon={Send} color="#0891b2" label={t('Bheje')} value={tt.dispatched} onClick={() => setTab('all')} active={tab === 'all'} />
            <KpiCard icon={CheckCircle2} color="#16a34a" label="Delivered" value={tt.delivered} hint={rs(tt.deliveredCod)} onClick={() => setTab('delivered')} active={tab === 'delivered'} />
            <KpiCard icon={RotateCcw} color="#c026d3" label={t('Returns')} value={tt.returned} onClick={() => setTab('returns')} active={tab === 'returns'} />
            <KpiCard icon={Hourglass} color="#f59e0b" label={t('Raste me')} value={tt.inProcess} onClick={() => setTab('open')} active={tab === 'open'} />
            <KpiCard icon={Warehouse} color="#7c3aed" label={t('RTO warehouse me')} value={tt.rtoInWarehouse} onClick={() => setTab('rto_wh')} active={tab === 'rto_wh'} />
            <KpiCard icon={XCircle} color="#64748b" label={t('Cancelled')} value={tt.cancelled} onClick={() => setTab('cancelled')} active={tab === 'cancelled'} />
            <KpiCard icon={ShieldAlert} color="#dc2626" label={t('Claims')} value={tt.claims} onClick={() => setTab('claims')} active={tab === 'claims'} />
            <KpiCard icon={Repeat} color="#0d9488" label={t('Re-dispatched')} value={tt.redispatched} onClick={() => setTab('redispatched')} active={tab === 'redispatched'} />
            <KpiCard icon={PackageX} color="#ea580c" label={t('Replacement')} value={tt.replacement} onClick={() => setTab('replacement')} active={tab === 'replacement'} />
            <KpiCard icon={Banknote} color="#16a34a" label={t('Delivered COD')} value={rs(tt.deliveredCod)} />
          </KpiRow>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="rounded-2xl lg:col-span-2" title={t('Roz kitne bheje')}>
              {!data!.daily.length ? <p className="py-10 text-center text-sm text-slate-500">{t('Is period me kuch nahi bheja')}</p> : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data!.daily.map((d) => ({ ...d, name: d.day.slice(5) }))} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                      <CartesianGrid stroke={theme.grid} vertical={false} />
                      <XAxis dataKey="name" tick={theme.axis} axisLine={false} tickLine={false} minTickGap={12} />
                      <YAxis tick={theme.axis} axisLine={false} tickLine={false} allowDecimals={false} width={36} />
                      <Tooltip {...theme.tooltip} />
                      <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => (v === 'dispatched' ? t('Bheje') : v === 'delivered' ? 'Delivered' : t('Returns'))} />
                      <Bar dataKey="dispatched" fill={theme.primarySoft} radius={[4, 4, 0, 0]} maxBarSize={16} />
                      <Bar dataKey="delivered" fill={COLORS.delivered} radius={[4, 4, 0, 0]} maxBarSize={10} />
                      <Bar dataKey="returned" fill={COLORS.returned} radius={[4, 4, 0, 0]} maxBarSize={10} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
            <Card className="rounded-2xl" title={t('Anjaam')}>
              {!donut.length ? <p className="py-10 text-center text-sm text-slate-500">—</p> : (
                <>
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={donut} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={3} stroke="none">
                          {donut.map((d) => <Cell key={d.name} fill={d.color} />)}
                        </Pie>
                        <Tooltip {...theme.tooltip} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="mt-2 space-y-1 text-[0.8125rem]">
                    {donut.map((d) => (
                      <li key={d.name} className="flex items-center justify-between">
                        <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />{d.name}</span>
                        <span className="tabular-nums">{d.value} · {Math.round((d.value / tt.dispatched) * 100)}%</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Card>
          </div>

          {data!.couriers.length > 0 && (
            <Card className="rounded-2xl" title={t('Courier-wise')}>
              <div className="overflow-x-auto">
                <table className="w-full text-[0.8125rem]">
                  <thead><tr className="text-[0.6875rem] uppercase tracking-wide text-slate-500">
                    <th className="py-2 text-start">{t('Courier')}</th><th className="px-2 py-2 text-end">{t('Bheje')}</th><th className="px-2 py-2 text-end">Delivered</th>
                    <th className="px-2 py-2 text-end">{t('Returns')}</th><th className="px-2 py-2 text-end">{t('Raste me')}</th><th className="px-2 py-2 text-end">COD</th><th className="py-2 text-end">{t('Kamyabi')}</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {data!.couriers.map((c) => (
                      <tr key={c.code}>
                        <td className="py-2"><span className="inline-flex items-center gap-2"><BrandLogo name={courierBrand(c.code)} size={18} />{c.name ?? c.code}</span></td>
                        <td className="px-2 py-2 text-end tabular-nums">{c.dispatched}</td><td className="px-2 py-2 text-end tabular-nums">{c.delivered}</td>
                        <td className="px-2 py-2 text-end tabular-nums">{c.returned}</td><td className="px-2 py-2 text-end tabular-nums">{c.inProcess}</td>
                        <td className="px-2 py-2 text-end tabular-nums">{rs(c.deliveredCod)}</td>
                        <td className="py-2 text-end">
                          {c.successRate == null ? '—' : (
                            <span className="inline-flex items-center gap-2">
                              <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 sm:inline-block"><span className="block h-full rounded-full bg-success-500" style={{ width: `${c.successRate}%` }} /></span>
                              <b className="tabular-nums">{c.successRate}%</b>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            <div className="flex gap-1.5 overflow-x-auto border-b border-slate-100 px-4 py-2.5 [scrollbar-width:none]">
              {TABS.map((k) => (
                <button key={k} type="button" onClick={() => setTab(k)}
                  className={cn('shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold', tab === k ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700', k === 'stuck' && data!.tabCounts.stuck > 0 && tab !== k && 'bg-rose-50 text-rose-700')}>
                  {REPORT_TAB_LABEL[k]} ({data!.tabCounts[k] ?? 0})
                </button>
              ))}
            </div>
            {!rows.length ? <p className="px-4 py-10 text-center text-[0.8125rem] text-slate-500">{t('Is list me koi parcel nahi')}</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-[0.8125rem]">
                  <thead><tr className="text-[0.6875rem] uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-2 text-start">{t('Order')}</th><th className="px-2 py-2 text-start">CN</th><th className="px-2 py-2 text-start">{t('Shehar')}</th>
                    <th className="px-2 py-2 text-start">{t('Bheja')}</th><th className="px-2 py-2 text-start">Status</th><th className="px-4 py-2 text-end">COD</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.slice(0, 300).map((r) => (
                      <tr key={r.id}>
                        <td className="px-4 py-1.5"><Link to={`/online-orders?order=${r.id}`} className="font-semibold text-slate-900 hover:underline">#{r.number}</Link><div className="text-[0.6875rem] text-slate-500">{r.customerName}</div></td>
                        <td className="px-2 py-1.5"><span className="inline-flex items-center gap-1.5">{r.courierCode && <BrandLogo name={courierBrand(r.courierCode)} size={14} />}<span className="font-mono">{r.trackingNumber ?? '—'}</span></span></td>
                        <td className="px-2 py-1.5">{r.city ?? ''}</td>
                        <td className="px-2 py-1.5 tabular-nums">{r.day}</td>
                        <td className="px-2 py-1.5">
                          <div className="font-semibold">{r.orderStatus}</div>
                          {r.lastEvent && <div className="max-w-[16rem] truncate text-[0.6875rem] text-slate-500">{r.lastEvent}</div>}
                        </td>
                        <td className="px-4 py-1.5 text-end tabular-nums">{rs(r.cod)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 300 && <p className="px-4 py-2 text-[0.75rem] text-slate-500">{t('Pehle 300 dikhaye — poori list CSV me')}</p>}
              </div>
            )}
          </section>
          {data!.capped && <p className="flex items-center gap-1.5 text-[0.75rem] text-amber-700"><AlertTriangle className="h-3.5 w-3.5" />{t('5000 se zyada parcels — chhota period chunein')}</p>}
        </>
      )}
      {guide.isOpen && (
        <PageGuide title={t('Dispatch report')} onClose={guide.close}
          flow={[
            { label: t('Bheje'), icon: Send, color: '#0891b2' },
            { label: 'Delivered', hint: t('COD courier ke paas'), icon: CheckCircle2, color: '#16a34a' },
            { label: t('Returns'), hint: t('RTO warehouse'), icon: RotateCcw, color: '#c026d3' },
          ]}
          steps={[
            { icon: Hourglass, color: '#f59e0b', title: t('Raste me / Stuck'), text: t('5 din se zyada raste me parcel "Stuck" me aate hain — courier se poochein.') },
            { icon: Warehouse, color: '#7c3aed', title: t('RTO warehouse / aana baqi'), text: t('Wapas aaye parcel returns scan se receive karein. Jo courier ne wapas likhe par dukaan nahi pahunche woh "RTO aana baqi" me.') },
            { icon: ShieldAlert, color: '#dc2626', title: t('Claims'), text: t('Gum ya kharab parcel ka claim order ke ⋯ menu se kholein.') },
          ]}
          shortcuts={[['G', t('guide')]]}
        />
      )}
    </PageShell>
  );
}
