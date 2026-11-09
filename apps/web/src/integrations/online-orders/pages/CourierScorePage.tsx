/**
 * Multi-courier scorecard (/online-orders/couriers-score): for every courier
 * the shop uses, overall and per city: delivery %, RTO %, days to deliver,
 * first-attempt success, stuck parcels, COD paid on time and the average
 * payment delay, cost per parcel and claims. The best courier per city can
 * be written into auto booking. Pick 2–5 couriers to compare side by side.
 * CSV and print.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Award, BarChart3, CheckCircle2, Download, GitCompare, GraduationCap, MapPin, Navigation, Trophy, Truck, Zap } from 'lucide-react';
import {
  Badge, Button, Card, Checkbox, DateRangeMenu, FilterBar, PageHero, PageShell, Skeleton, confirmDialog, heroButton, heroIconButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton, type PrintDoc } from '@core/print';
import { BrandLogo } from '@/assets/brands/BrandLogo';
import { cn } from '@core/lib/cn';
import { useBusinessDayStart } from '@core/lib/business-day';
import { rangeLabel } from '@core/lib/dateRange';
import { t } from '@core/i18n';
import { apiErrorMessage } from '../api/online-orders.api';
import { insightsApi, type CourierScore, type Scorecard } from '../api/insights.api';
import { courierBrand, rs } from '../lib/labels';
import { downloadCsv } from '../lib/orders';

type Metric = { key: keyof CourierScore; label: string; fmt: (c: CourierScore) => string; better: 'high' | 'low' };
const pct = (v: number | null) => (v == null ? '—' : `${v}%`);
const days = (v: number | null) => (v == null ? '—' : t('{{n}} din', { n: v }));

function metrics(onTime: number): Metric[] {
  return [
    { key: 'sent', label: t('Parcels'), fmt: (c) => String(c.sent), better: 'high' },
    { key: 'deliveryRate', label: t('Delivery %'), fmt: (c) => pct(c.deliveryRate), better: 'high' },
    { key: 'rtoRate', label: 'RTO %', fmt: (c) => pct(c.rtoRate), better: 'low' },
    { key: 'avgDays', label: t('Deliver me din (average)'), fmt: (c) => days(c.avgDays), better: 'low' },
    { key: 'firstAttemptRate', label: t('Pehli koshish me deliver'), fmt: (c) => (c.firstAttemptRate == null ? '—' : `${c.firstAttemptRate}% (${c.firstAttemptSample})`), better: 'high' },
    { key: 'stuck', label: t('Stuck abhi'), fmt: (c) => String(c.stuck), better: 'low' },
    { key: 'codOnTimeRate', label: t('COD waqt par ({{n}} din)', { n: onTime }), fmt: (c) => pct(c.codOnTimeRate), better: 'high' },
    { key: 'avgPayDelay', label: t('COD me der (average)'), fmt: (c) => days(c.avgPayDelay), better: 'low' },
    { key: 'costPerParcel', label: t('Kharcha per parcel'), fmt: (c) => (c.costPerParcel == null ? '—' : rs(c.costPerParcel)), better: 'low' },
    { key: 'claims', label: t('Claims'), fmt: (c) => String(c.claims), better: 'low' },
  ];
}

/** The courier with the best value of a metric among `list` (null values never win). */
function leader(list: CourierScore[], m: Metric): string | null {
  const vals = list.map((c) => ({ code: c.code, v: c[m.key] as number | null })).filter((x) => typeof x.v === 'number');
  if (vals.length < 2) return null;
  const best = m.better === 'high' ? Math.max(...vals.map((x) => x.v!)) : Math.min(...vals.map((x) => x.v!));
  const winners = vals.filter((x) => x.v === best);
  return winners.length === 1 ? winners[0].code : null;
}

function scoreDoc(s: Scorecard, period: string, ms: Metric[]): PrintDoc {
  return {
    title: t('Courier scorecard'),
    subtitle: period,
    meta: [[t('Parcels'), String(s.sample)], [t('Couriers'), String(s.couriers.length)], [t('Sab se behtar'), s.couriers.find((c) => c.code === s.bestOverall)?.name ?? '—']],
    sections: [
      { kind: 'table', title: t('Couriers'), columns: [{ label: t('Courier') }, ...ms.map((m) => ({ label: m.label, align: 'right' as const }))], rows: s.couriers.map((c) => [c.name ?? c.code, ...ms.map((m) => m.fmt(c))]) },
      {
        kind: 'table', title: t('Har shehar ka best courier'),
        columns: [{ label: t('Shehar') }, { label: t('Parcels'), align: 'right' }, { label: t('Best') }, { label: t('Delivery %'), align: 'right' }, { label: t('Doosra') }],
        rows: s.cities.slice(0, 200).map((c) => [c.city, String(c.parcels), c.bestName ?? '—', pct(c.bestRate), c.runnerUpName ?? '—']),
      },
    ],
  };
}

export default function CourierScorePage() {
  const startHour = useBusinessDayStart();
  const guide = usePageGuide();
  const qc = useQueryClient();
  const [range, setRange] = useState<DateRangeValue>({ preset: 'all', custom: { from: '', to: '' } });
  const [compare, setCompare] = useState<string[]>([]);
  const [cityLimit, setCityLimit] = useState(25);
  const period = resolveRange(range, startHour);
  const q = useQuery({ queryKey: ['courier-score', period?.from, period?.to], queryFn: () => insightsApi.score(period ?? {}), placeholderData: (p) => p });
  const s = q.data;
  const ms = useMemo(() => metrics(s?.onTimeDays ?? 7), [s?.onTimeDays]);
  const periodText = s ? (period ? rangeLabel(s.from, s.to) : t('Pichhle 90 din')) : '';
  const picked = (s?.couriers ?? []).filter((c) => compare.includes(c.code));
  const best = s?.couriers.find((c) => c.code === s.bestOverall) ?? null;
  const done = (s?.couriers ?? []).reduce((a, c) => a + c.delivered + c.returned, 0);
  const delivered = (s?.couriers ?? []).reduce((a, c) => a + c.delivered, 0);

  const apply = useMutation({
    mutationFn: () => insightsApi.applyBest(),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['courier-score'] });
      toast.success(r.applied ? t('{{count}} shehar ke rules auto booking me lag gaye', { count: r.applied }) : t('Koi shehar nahi jis ka best courier jura ho'));
      if (r.applied && r.trigger === 'OFF') toast.info(t('Auto booking abhi band hai — Auto booking page par on karein'));
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const toggle = (code: string) => setCompare((c) => (c.includes(code) ? c.filter((x) => x !== code) : c.length >= 5 ? c : [...c, code]));

  const csv = () => s && downloadCsv(`courier-scorecard-${s.from}-${s.to}.csv`, [
    ['Courier', ...ms.map((m) => m.label)],
    ...s.couriers.map((c) => [c.name ?? c.code, ...ms.map((m) => m.fmt(c))]),
    [],
    ['City', 'Parcels', 'Best', 'Delivery %', 'Runner-up'],
    ...s.cities.map((c) => [c.city, c.parcels, c.bestName ?? '', c.bestRate ?? '', c.runnerUpName ?? '']),
  ]);

  return (
    <PageShell>
      <PageHero title={t('Courier scorecard')} chip={<><Trophy />{periodText || t('Couriers')}</>}
        meta={t('Har courier ka asli kaam aap ke apne parcels se — shehar ke hisaab se kaun behtar hai')}
        busy={q.isFetching && !q.isLoading} loading={q.isLoading}
        actions={<>
          <button type="button" className={heroButton} disabled={!s} onClick={csv}><Download className="h-4 w-4" /> CSV</button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={() => scoreDoc(s!, periodText, ms)} disabled={!s} /></span>
          <Link to="/online-orders/tracking" className={heroButton}><Navigation className="h-4 w-4" /> <span className="hidden sm:inline">{t('Parcel map')}</span></Link>
          <button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={[
          { label: t('Parcels'), value: s ? String(s.sample) : '' },
          { label: t('Couriers'), value: s ? String(s.couriers.length) : '' },
          { label: t('Kul delivery %'), value: s ? (done ? `${Math.round((delivered / done) * 1000) / 10}%` : '—') : '' },
          { label: t('Sab se behtar'), value: s ? (best?.name ?? '—') : '', hint: best?.deliveryRate != null ? `${best.deliveryRate}%` : undefined },
        ]} />

      <FilterBar>
        <DateRangeMenu value={range} onChange={setRange} startHour={startHour} label={t('Bheje gaye')} />
      </FilterBar>

      {q.isLoading ? <Skeleton className="h-72 rounded-3xl" /> : q.error ? <p className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{apiErrorMessage(q.error)}</p> : s && (
        !s.couriers.length ? (
          <Card className="rounded-2xl"><p className="py-10 text-center text-[0.8125rem] text-slate-500">{t('Is period me courier se koi parcel nahi gaya')}</p></Card>
        ) : (
          <>
            <Card className="rounded-2xl" title={t('Couriers')} actions={<span className="text-[0.75rem] text-slate-500">{t('2 se 5 chunein aur saath dekhein')}</span>}>
              <div className="overflow-x-auto">
                <table className="w-full text-[0.8125rem]">
                  <thead><tr className="text-[0.6875rem] uppercase tracking-wide text-slate-500">
                    <th className="w-8 py-2" /><th className="py-2 text-start">{t('Courier')}</th>
                    {ms.map((m) => <th key={m.key} className="px-2 py-2 text-end">{m.label}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {s.couriers.map((c) => (
                      <tr key={c.code} className={cn(compare.includes(c.code) && 'bg-brand-50/50')}>
                        <td className="py-2"><Checkbox checked={compare.includes(c.code)} onChange={() => toggle(c.code)} aria-label={t('Compare')} /></td>
                        <td className="py-2">
                          <span className="inline-flex items-center gap-2 font-semibold text-slate-900"><BrandLogo name={courierBrand(c.code)} size={20} />{c.name ?? c.code}</span>
                          {c.code === s.bestOverall && <Badge size="xs" variant="success" className="ms-2">{t('Best')}</Badge>}
                          {!c.connected && <span className="ms-2 text-[0.6875rem] text-slate-400">{t('Jura nahi')}</span>}
                        </td>
                        {ms.map((m) => {
                          const lead = leader(s.couriers.filter((x) => x.delivered + x.returned >= 3), m) === c.code;
                          return <td key={m.key} className={cn('px-2 py-2 text-end tabular-nums', lead && 'font-bold text-success-700')}>{m.fmt(c)}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {picked.length >= 2 && (
              <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><GitCompare className="h-4 w-4" />{t('Saath saath')}</span>}>
                <div className="overflow-x-auto">
                  <table className="w-full text-[0.8125rem]">
                    <thead><tr>
                      <th className="py-2 text-start text-[0.6875rem] uppercase tracking-wide text-slate-500">{t('Cheez')}</th>
                      {picked.map((c) => <th key={c.code} className="px-3 py-2 text-center"><span className="inline-flex flex-col items-center gap-1"><BrandLogo name={courierBrand(c.code)} size={28} /><span className="text-[0.75rem] font-semibold text-slate-900">{c.name ?? c.code}</span></span></th>)}
                    </tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {ms.map((m) => {
                        const lead = leader(picked, m);
                        return (
                          <tr key={m.key}>
                            <td className="py-2 text-slate-600">{m.label}</td>
                            {picked.map((c) => (
                              <td key={c.code} className={cn('px-3 py-2 text-center tabular-nums', lead === c.code && 'font-bold text-success-700')}>
                                {lead === c.code && <Award className="me-1 inline h-3.5 w-3.5" />}{m.fmt(c)}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4" />{t('Har shehar ka best courier')}</span>}
              actions={
                <Button size="sm" variant="primary" loading={apply.isPending} leftIcon={<Zap className="h-4 w-4" />}
                  disabled={!s.cities.some((c) => c.bookable)}
                  onClick={async () => {
                    if (await confirmDialog({ title: t('Auto booking me lagayein?'), text: t('Har shehar ka best courier (jo API se jura hai) auto booking ke rules me sab se upar lag jayega. Aap ke apne rules waise hi rahenge.') })) apply.mutate();
                  }}>
                  {t('Auto booking me lagayein')}
                </Button>
              }>
              {s.autoBooking.applied.length > 0 && (
                <p className="mb-2 flex flex-wrap items-center gap-1.5 text-[0.75rem] text-slate-600">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success-600" />
                  {t('{{count}} shehar auto booking me lage hain', { count: s.autoBooking.applied.length })}
                  {s.autoBooking.trigger === 'OFF' && <Badge size="xs" variant="warning">{t('Auto booking band')}</Badge>}
                  <Link to="/online-store/couriers/rules" className="font-semibold text-brand-700 hover:underline">{t('Rules dekhein')}</Link>
                </p>
              )}
              {!s.cities.length ? <p className="py-6 text-center text-[0.8125rem] text-slate-500">—</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[0.8125rem]">
                    <thead><tr className="text-[0.6875rem] uppercase tracking-wide text-slate-500">
                      <th className="py-2 text-start">{t('Shehar')}</th><th className="px-2 py-2 text-end">{t('Parcels')}</th><th className="px-2 py-2 text-start">{t('Best')}</th>
                      <th className="px-2 py-2 text-start">{t('Doosra')}</th><th className="py-2 text-start">{t('Sab couriers (delivery %)')}</th>
                    </tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {s.cities.slice(0, cityLimit).map((c) => (
                        <tr key={c.city}>
                          <td className="py-2 font-semibold text-slate-900">{c.city}</td>
                          <td className="px-2 py-2 text-end tabular-nums">{c.parcels}</td>
                          <td className="px-2 py-2">
                            {c.best ? (
                              <span className="inline-flex items-center gap-1.5"><BrandLogo name={courierBrand(c.best)} size={16} /><b>{c.bestName}</b><span className="tabular-nums text-success-700">{pct(c.bestRate)}</span>
                                {!c.bookable && <span className="text-[0.6875rem] text-slate-400">{t('Jura nahi')}</span>}</span>
                            ) : <span className="text-[0.75rem] text-slate-400">{t('Abhi kam parcels')}</span>}
                          </td>
                          <td className="px-2 py-2 text-slate-600">{c.runnerUpName ?? '—'}</td>
                          <td className="py-2">
                            <span className="flex flex-wrap gap-1">
                              {c.couriers.map((x) => (
                                <span key={x.code} className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem]', x.best ? 'bg-success-50 text-success-700' : 'bg-slate-100 text-slate-600')}>
                                  {x.code} {pct(x.deliveryRate)} <span className="text-slate-400">({x.sent})</span>
                                </span>
                              ))}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {s.cities.length > cityLimit && <Button size="xs" variant="ghost" className="mt-2" onClick={() => setCityLimit((n) => n + 50)}>{t('Aur shehar ({{count}})', { count: s.cities.length - cityLimit })}</Button>}
                </div>
              )}
            </Card>
            {s.capped && <p className="text-[0.75rem] text-amber-700">{t('20,000 se zyada parcels — chhota period chunein')}</p>}
          </>
        )
      )}

      {guide.isOpen && (
        <PageGuide title={t('Courier scorecard')} onClose={guide.close}
          flow={[
            { label: t('Parcels'), hint: t('aap ke apne'), icon: Truck, color: '#ea580c' },
            { label: t('Har courier ka score'), icon: BarChart3, color: '#4f46e5' },
            { label: t('Shehar ka best'), icon: Trophy, color: '#16a34a' },
            { label: t('Auto booking'), icon: Zap, color: '#0d9488' },
          ]}
          steps={[
            { icon: BarChart3, color: '#4f46e5', title: t('Numbers kahan se'), text: t('Is period me bheje gaye aap ke parcels: deliver, wapas, din, COD kab aaya aur courier ka kharcha (save kiya hua ya rate card).') },
            { icon: CheckCircle2, color: '#16a34a', title: t('Pehli koshish'), text: t('Sirf woh parcels gine jate hain jin ke courier ne qadam bheje — jahan "delivery nahi hui" ka pata chal sake.') },
            { icon: Trophy, color: '#ca8a04', title: t('Best courier'), text: t('Delivery % ko parcels ki ginti ke saath tola jata hai, phir kharcha thora asar karta hai. Kam parcels par koi best nahi banta.') },
            { icon: Zap, color: '#0d9488', title: t('Auto booking'), text: t('"Auto booking me lagayein" har shehar ka rule bana deta hai. Dobara dabane par purane best rules badal jate hain, aap ke apne rules nahi.') },
          ]}
          shortcuts={[['G', t('guide')]]}
        />
      )}
    </PageShell>
  );
}
