/**
 * Payment health: COD the couriers still hold (by courier and age), when it
 * should arrive (each courier's usual delivery-to-payment days), COD vs
 * prepaid, advances, payment-link failures, and RTO and refund losses for
 * the period.
 *
 * Keys: G guide.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle, CalendarClock, CreditCard, GraduationCap, Hourglass, Link2, PackageX, Percent, Truck, Wallet,
} from 'lucide-react';
import {
  Button, Card, DateRangeMenu, EmptyState, FilterBar, KpiCard, KpiRow, PageHero, PageShell, Skeleton, Table, TBody, Td, Th, THead, Tr, heroButton, heroIconButton,
  resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { useBusinessDayStart } from '@core/lib/business-day';
import { rangeLabel } from '@core/lib/dateRange';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { BrandLogo } from '@/assets/brands/BrandLogo';
import { t } from '@core/i18n';
import { apiErrorMessage } from '../api/online-orders.api';
import { growthApi, type AgeKey } from '../api/growth.api';
import { courierBrand, timeAgo } from '../lib/labels';

const AGES: Array<{ key: AgeKey; label: string; color: string }> = [
  { key: 'd0_7', label: t('0-7 din'), color: '#16a34a' },
  { key: 'd8_14', label: t('8-14 din'), color: '#d97706' },
  { key: 'd15_30', label: t('15-30 din'), color: '#ea580c' },
  { key: 'd30p', label: t('30+ din'), color: '#e11d48' },
];

export default function PaymentHealthPage() {
  const guide = usePageGuide();
  const startHour = useBusinessDayStart();
  const { sales: money } = useMasked();
  const [range, setRange] = useState<DateRangeValue>({ preset: 'thisMonth', custom: { from: '', to: '' } });
  const period = resolveRange(range, startHour);
  const q = useQuery({
    queryKey: ['payment-health', period?.from, period?.to],
    queryFn: () => growthApi.paymentHealth({ from: period?.from, to: period?.to }),
    placeholderData: (p) => p,
  });
  const d = q.data;
  const ageTotal = d ? AGES.reduce((s, a) => s + d.cod.ages[a.key], 0) : 0;

  return (
    <PageShell>
      <PageHero
        title={t('Payment health')}
        chip={<><Wallet />{t('Paisa kahan hai')}</>}
        meta={t('Courier ke paas kitna COD hai, kab aayega, aur kahan nuqsan hua')}
        busy={q.isFetching && !q.isLoading}
        loading={q.isLoading}
        actions={<>
          <Link to="/online-orders/cod" className={heroButton}><Wallet className="h-4 w-4" /> <span className="hidden sm:inline">{t('COD & payments')}</span></Link>
          <button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={d ? [
          { label: t('COD baqi'), value: money(d.cod.outstanding) },
          { label: t('Is hafte aana hai'), value: money(d.forecast.thisWeek) },
          { label: t('Der ho gayi'), value: money(d.forecast.overdue) },
        ] : [{ label: t('COD baqi'), value: '' }, { label: t('Is hafte aana hai'), value: '' }, { label: t('Der ho gayi'), value: '' }]}
      />

      <FilterBar>
        <DateRangeMenu value={range} onChange={setRange} startHour={startHour} defaultPreset="thisMonth" allowAll={false} />
        {period && <span className="self-center text-[0.8125rem] text-slate-500">{rangeLabel(period.from, period.to)}</span>}
        <span className="self-center text-[0.75rem] text-slate-400">{t('COD baqi aur hafte ka andaza aaj tak ka hai; baqi is period ka.')}</span>
      </FilterBar>

      {q.isError ? (
        <EmptyState title={t('Report nahi khuli')} description={apiErrorMessage(q.error)} action={<Button variant="secondary" onClick={() => q.refetch()}>{t('Dobara koshish')}</Button>} />
      ) : (
        <>
          <KpiRow cols={5}>
            {!d ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
              <KpiCard icon={Truck} color="#ea580c" label={t('Raste me (COD)')} value={money(d.cod.inTransit)} hint={t('Abhi deliver nahi hue')} />
              <KpiCard icon={Wallet} color="#0d9488" label={t('Courier ke paas')} value={money(d.cod.withCourier)} hint={t('Deliver ho gaye, paisa nahi aaya')} />
              <KpiCard icon={CalendarClock} color="#2563eb" label={t('Is hafte aana hai')} value={money(d.forecast.thisWeek)} hint={t('Der: {{value}}', { value: money(d.forecast.overdue) })} />
              <KpiCard icon={Percent} color="#7c3aed" label={t('Prepaid hissa')} value={`${d.mix.prepaid.share}%`} hint={t('COD {{cod}}% · {{count}} order', { cod: d.mix.cod.share, count: d.mix.cod.count + d.mix.prepaid.count })} />
              <KpiCard icon={CreditCard} color="#16a34a" label={t('Advance mila')} value={money(d.advance.value)} hint={t('{{count}} COD order par', { count: d.advance.orders })} />
            </>}
          </KpiRow>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Card flush title={t('COD — courier ke hisaab se')} description={t('Kitna paisa kis courier ke paas, kitne din se')}>
              {!d ? <div className="p-4"><Skeleton className="h-40 rounded-xl" /></div> : !d.cod.byCourier.length ? (
                <EmptyState icon={<Wallet className="h-5 w-5" />} title={t('Koi COD baqi nahi')} description={t('Sab courier ne paisa de diya.')} />
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <Table>
                    <THead><Tr><Th>{t('Courier')}</Th><Th className="text-end">{t('Raste me')}</Th><Th className="text-end">{t('Courier ke paas')}</Th><Th>{t('Kitne din se')}</Th><Th className="text-end">{t('Aam tor par')}</Th><Th className="text-end">{t('Is hafte')}</Th></Tr></THead>
                    <TBody>
                      {d.cod.byCourier.map((c) => {
                        const sum = AGES.reduce((s, a) => s + c.ages[a.key], 0);
                        return (
                          <Tr key={c.code}>
                            <Td><span className="flex items-center gap-2"><BrandLogo name={courierBrand(c.code)} size={22} /><span className="font-medium text-slate-900">{c.name}</span><span className="text-[0.75rem] text-slate-400">{c.count}</span></span></Td>
                            <Td className="text-end tabular-nums">{money(c.inTransit)}</Td>
                            <Td className="text-end font-semibold tabular-nums">{money(c.withCourier)}</Td>
                            <Td><AgeBar ages={c.ages} total={sum} /></Td>
                            <Td className="text-end text-[0.8125rem] text-slate-600">{t('{{days}} din', { days: c.settleDays })}</Td>
                            <Td className="whitespace-nowrap text-end tabular-nums">{money(c.forecast.thisWeek)}{c.forecast.overdue > 0 && <span className="block text-[0.6875rem] font-semibold text-rose-600">{t('Der {{value}}', { value: money(c.forecast.overdue) })}</span>}</Td>
                          </Tr>
                        );
                      })}
                    </TBody>
                  </Table>
                </div>
              )}
            </Card>

            <div className="space-y-4">
              <Card title={t('COD kitna purana')}>
                {!d ? <Skeleton className="h-24 rounded-xl" /> : <>
                  <AgeBar ages={d.cod.ages} total={ageTotal} tall />
                  <ul className="mt-3 grid grid-cols-2 gap-2">
                    {AGES.map((a) => (
                      <li key={a.key} className="flex items-center gap-2 text-[0.8125rem]">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: a.color }} />
                        <span className="text-slate-600">{a.label}</span>
                        <span className="ms-auto font-semibold tabular-nums text-slate-900">{money(d.cod.ages[a.key])}</span>
                      </li>
                    ))}
                  </ul>
                </>}
              </Card>
              <Card title={t('Nuqsan (is period)')}>
                {!d ? <Skeleton className="h-24 rounded-xl" /> : (
                  <dl className="space-y-2 text-[0.8125rem]">
                    <div className="flex justify-between"><dt className="flex items-center gap-1.5 text-slate-600"><PackageX className="h-4 w-4 text-fuchsia-600" />{t('{{count}} parcel wapas (RTO)', { count: d.losses.rtoCount })}</dt><dd className="font-semibold tabular-nums">{money(d.losses.rtoGoods)}</dd></div>
                    <div className="flex justify-between"><dt className="text-slate-600">{t('RTO par courier Cost')}</dt><dd className="font-semibold tabular-nums text-rose-700">{money(d.losses.rtoCost)}</dd></div>
                    <div className="flex justify-between"><dt className="text-slate-600">{t('Refunds ({{count}} bill)', { count: d.losses.refundCount })}</dt><dd className="font-semibold tabular-nums text-rose-700">{money(d.losses.refunds)}</dd></div>
                  </dl>
                )}
              </Card>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title={t('COD vs prepaid')}>
              {!d ? <Skeleton className="h-20 rounded-xl" /> : <>
                <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
                  <span className="bg-orange-400" style={{ width: `${d.mix.cod.share}%` }} />
                  <span className="bg-emerald-500" style={{ width: `${d.mix.prepaid.share}%` }} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-[0.8125rem]">
                  <div><p className="text-slate-500">{t('COD')}</p><p className="font-semibold text-slate-900">{money(d.mix.cod.value)} <span className="font-normal text-slate-500">· {d.mix.cod.count}</span></p></div>
                  <div><p className="text-slate-500">{t('Prepaid')}</p><p className="font-semibold text-slate-900">{money(d.mix.prepaid.value)} <span className="font-normal text-slate-500">· {d.mix.prepaid.count}</span></p></div>
                </div>
              </>}
            </Card>
            <Card flush title={t('Payment links')} description={d ? t('{{created}} bane · {{paid}} paid · {{failed}} fail · {{expired}} expire', { created: d.links.created, paid: d.links.paid, failed: d.links.failed, expired: d.links.expired }) : undefined}
              actions={<Link to="/online-store/payments" className="text-[0.8125rem] font-medium text-brand-700 hover:underline">{t('Gateways')}</Link>}>
              {!d ? <div className="p-4"><Skeleton className="h-20 rounded-xl" /></div> : !d.links.failures.length ? (
                <p className="px-5 pb-5 pt-3 text-[0.8125rem] text-slate-500">{d.links.created ? t('Koi link fail nahi hua.') : t('Is period me koi payment link nahi bana.')}</p>
              ) : (
                <ul className="mt-3 divide-y divide-slate-100 border-t border-slate-100">
                  {d.links.failures.map((f) => (
                    <li key={`${f.orderId}-${f.at}`} className="flex items-center gap-3 px-5 py-2.5 text-[0.8125rem]">
                      <Link2 className="h-4 w-4 text-rose-500" />
                      <Link to={`/online-orders?search=${encodeURIComponent(f.number)}`} className="font-mono font-semibold text-slate-900 hover:underline">#{f.number}</Link>
                      <span className="min-w-0 flex-1 truncate text-slate-600">{f.customerName} · {f.provider}</span>
                      <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[0.6875rem] font-semibold text-rose-700">{f.status}</span>
                      <span className="tabular-nums">{money(f.amount)}</span>
                      <span className="hidden text-[0.75rem] text-slate-400 sm:inline">{timeAgo(f.at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}

      {guide.isOpen && (
        <PageGuide
          title={t('Payment health — aasaan tareeqa')}
          description={t('COD ka paisa pehle courier ke paas jata hai, phir aap ke paas. Ye page batata hai kitna phansa hai.')}
          onClose={guide.close}
          flow={[
            { label: t('Dispatched'), hint: t('Raste me'), icon: Truck, color: '#ea580c' },
            { label: t('Delivered'), hint: t('Courier ke paas'), icon: Wallet, color: '#0d9488' },
            { label: t('Settlement'), hint: t('Aap ke account me'), icon: CalendarClock, color: '#2563eb' },
          ]}
          steps={[
            { icon: Hourglass, color: '#e11d48', title: t('Kitne din se'), text: t('Laal hissa 30 din se purana COD hai — courier se poochein.') },
            { icon: CalendarClock, color: '#2563eb', title: t('Is hafte'), text: t('Har courier pichhle 90 din me jitne din me paisa deta raha, usi se andaza lagta hai.') },
            { icon: AlertTriangle, color: '#d97706', title: t('Der'), text: t('Andaze ki date guzar gayi aur paisa nahi aaya. COD statement match se check karein.') },
          ]}
        />
      )}
    </PageShell>
  );
}

function AgeBar({ ages, total, tall }: { ages: Record<AgeKey, number>; total: number; tall?: boolean }) {
  if (!(total > 0)) return <span className="text-[0.75rem] text-slate-400">—</span>;
  return (
    <div className={`flex ${tall ? 'h-3' : 'h-2 w-20'} overflow-hidden rounded-full bg-slate-100`}>
      {AGES.map((a) => ages[a.key] > 0 && <span key={a.key} title={a.label} style={{ width: `${(ages[a.key] / total) * 100}%`, backgroundColor: a.color }} />)}
    </div>
  );
}
