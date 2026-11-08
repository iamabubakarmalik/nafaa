/**
 * COD (CPR) audit: delivered COD parcels against what the courier paid.
 * Short paid = the statement paid less than COD minus the allowed charges;
 * extra deduction = the courier took more than the shop's rate card. The
 * statement amounts come from COD reconcile (upload a courier statement).
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Banknote, Clock, FileSpreadsheet, Scale, Wallet } from 'lucide-react';
import { DateRangeMenu, KpiCard, KpiRow, Skeleton, resolveRange } from '@/design-system/components';
import { BrandLogo } from '@/assets/brands/BrandLogo';
import { cn } from '@core/lib/cn';
import { businessDayKey, useBusinessDayStart } from '@core/lib/business-day';
import { useReportRange } from '@modules/reports/prefs';
import { apiErrorMessage } from '../../api/online-orders.api';
import { dispatchApi, type CodAuditRow } from '../../api/dispatch.api';
import { courierBrand, rs } from '../../lib/labels';
import { t } from '@core/i18n';

type View = 'short' | 'over' | 'unpaid' | 'all';

export function CodAuditPanel() {
  const startHour = useBusinessDayStart();
  const [range, setRange] = useReportRange('month');
  const today = businessDayKey(new Date(), startHour);
  const period = resolveRange(range, startHour) ?? { from: today, to: today };
  const [view, setView] = useState<View>('short');
  const { data, isLoading, error } = useQuery({ queryKey: ['dispatch-cod-audit', period.from, period.to], queryFn: () => dispatchApi.codAudit(period), placeholderData: (p) => p });
  const filter: Record<View, (r: CodAuditRow) => boolean> = {
    short: (r) => r.short > 0, over: (r) => r.overCharge > 0, unpaid: (r) => !r.paid, all: () => true,
  };
  const rows = (data?.rows ?? []).filter(filter[view]);
  const tt = data?.totals;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
        <DateRangeMenu value={range} onChange={setRange} startHour={startHour} defaultPreset="month" />
        <p className="min-w-[12rem] flex-1 text-[0.8125rem] text-slate-500">{t('Is period me deliver hue COD parcels. Courier ki payment statement COD reconcile me upload karein — phir yahan farq dikhega.')}</p>
        <Link to="/online-orders/cod/reconcile" className="inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-brand-700 hover:underline"><FileSpreadsheet className="h-4 w-4" />{t('Statement upload')}</Link>
      </div>
      {isLoading ? <Skeleton className="h-48 rounded-3xl" /> : error ? (
        <p className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{apiErrorMessage(error)}</p>
      ) : tt && (
        <>
          <KpiRow cols={5}>
            <KpiCard icon={Banknote} color="#0891b2" label={t('Delivered COD')} value={rs(tt.cod)} hint={t('{{count}} parcels', { count: tt.parcels })} />
            <KpiCard icon={Wallet} color="#16a34a" label={t('Mila (statement)')} value={rs(tt.received)} hint={t('Hona chahiye {{value}}', { value: rs(tt.expectedNet) })} />
            <KpiCard icon={AlertTriangle} color="#dc2626" label={t('Kam mila')} value={rs(tt.short)} hint={t('{{count}} parcels', { count: tt.shortCount })} onClick={() => setView('short')} active={view === 'short'} />
            <KpiCard icon={Scale} color="#ea580c" label={t('Zyada kaata')} value={rs(tt.overCharge)} hint={t('{{count}} parcels · rate card se upar', { count: tt.overChargeCount })} onClick={() => setView('over')} active={view === 'over'} />
            <KpiCard icon={Clock} color="#7c3aed" label={t('Abhi courier ke paas')} value={rs(tt.unpaidValue)} hint={t('{{count}} parcels · {{late}} 10+ din', { count: tt.unpaid, late: tt.late })} onClick={() => setView('unpaid')} active={view === 'unpaid'} />
          </KpiRow>
          {tt.rateCardMissing.length > 0 && (
            <p className="rounded-2xl bg-amber-50 px-4 py-2.5 text-[0.8125rem] text-amber-800">
              {t('In couriers ka rate card nahi — zyada katoti nahi pakdi ja sakti: {{list}}', { list: tt.rateCardMissing.join(', ') })} <Link to="/online-store/costs" className="font-semibold underline">{t('Rate card bharein')}</Link>
            </p>
          )}
          {data!.couriers.length > 0 && (
            <div className="overflow-x-auto rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
              <table className="w-full text-[0.8125rem]">
                <thead><tr className="text-[0.6875rem] uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2 text-start">{t('Courier')}</th><th className="px-2 py-2 text-end">{t('Parcels')}</th><th className="px-2 py-2 text-end">COD</th>
                  <th className="px-2 py-2 text-end">{t('Hona chahiye')}</th><th className="px-2 py-2 text-end">{t('Mila')}</th><th className="px-2 py-2 text-end">{t('Kam mila')}</th>
                  <th className="px-2 py-2 text-end">{t('Zyada kaata')}</th><th className="px-4 py-2 text-end">{t('Baqi')}</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {data!.couriers.map((c) => (
                    <tr key={c.code}>
                      <td className="px-4 py-2"><span className="inline-flex items-center gap-2"><BrandLogo name={courierBrand(c.code)} size={18} />{c.name ?? c.code}</span></td>
                      <td className="px-2 py-2 text-end tabular-nums">{c.parcels}</td><td className="px-2 py-2 text-end tabular-nums">{rs(c.cod)}</td>
                      <td className="px-2 py-2 text-end tabular-nums">{rs(c.expectedNet)}</td><td className="px-2 py-2 text-end tabular-nums">{rs(c.received)}</td>
                      <td className={cn('px-2 py-2 text-end tabular-nums', c.short > 0 && 'font-semibold text-rose-600')}>{rs(c.short)}</td>
                      <td className={cn('px-2 py-2 text-end tabular-nums', c.overCharge > 0 && 'font-semibold text-orange-600')}>{rs(c.overCharge)}</td>
                      <td className="px-4 py-2 text-end tabular-nums">{rs(c.unpaidValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            <div className="flex flex-wrap gap-1.5 border-b border-slate-100 px-4 py-2.5">
              {([['short', t('Kam mila')], ['over', t('Zyada kaata')], ['unpaid', t('Abhi courier ke paas')], ['all', t('Sab')]] as Array<[View, string]>).map(([k, label]) => (
                <button key={k} type="button" onClick={() => setView(k)}
                  className={cn('rounded-lg px-2.5 py-1 text-xs font-semibold', view === k ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700')}>
                  {label} ({(data!.rows).filter(filter[k]).length})
                </button>
              ))}
            </div>
            {!rows.length ? <p className="px-4 py-8 text-center text-[0.8125rem] text-slate-500">{t('Is list me koi parcel nahi')}</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-[0.8125rem]">
                  <thead><tr className="text-[0.6875rem] uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-2 text-start">{t('Order')}</th><th className="px-2 py-2 text-start">CN</th><th className="px-2 py-2 text-end">COD</th>
                    <th className="px-2 py-2 text-end">{t('Katoti')}</th><th className="px-2 py-2 text-end">{t('Hona chahiye')}</th><th className="px-2 py-2 text-end">{t('Mila')}</th>
                    <th className="px-4 py-2 text-end">{t('Farq')}</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.slice(0, 300).map((r) => (
                      <tr key={r.id}>
                        <td className="px-4 py-1.5"><Link to={`/online-orders?order=${r.id}`} className="font-semibold text-slate-900 hover:underline">#{r.number}</Link><div className="text-[0.6875rem] text-slate-500">{r.customerName}</div></td>
                        <td className="px-2 py-1.5"><span className="inline-flex items-center gap-1.5">{r.courierCode && <BrandLogo name={courierBrand(r.courierCode)} size={14} />}<span className="font-mono">{r.trackingNumber}</span></span></td>
                        <td className="px-2 py-1.5 text-end tabular-nums">{rs(r.cod)}</td>
                        <td className="px-2 py-1.5 text-end tabular-nums">{r.deducted == null ? '—' : rs(r.deducted)}</td>
                        <td className="px-2 py-1.5 text-end tabular-nums">{rs(r.expectedNet)}</td>
                        <td className="px-2 py-1.5 text-end tabular-nums">{r.received == null ? (r.paid ? t('statement nahi') : t('baqi · {{d}} din', { d: r.waitingDays ?? 0 })) : rs(r.received)}</td>
                        <td className="px-4 py-1.5 text-end font-semibold tabular-nums">
                          {r.short > 0 && <span className="text-rose-600">−{rs(r.short)}</span>}
                          {r.overCharge > 0 && <span className="ms-1 text-orange-600">+{rs(r.overCharge)}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
