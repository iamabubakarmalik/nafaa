/**
 * Product Radar: products that are rising or falling (recent days against
 * the same number of days before), where Margin can improve, and bundles to
 * offer from what customers buy together. Built from the shop's own bills
 * and its channel orders. Margin and bundle prices show only with cost access.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownRight, ArrowUpRight, Layers, Package, Radar, Sparkles, TrendingDown, TrendingUp, GraduationCap } from 'lucide-react';
import { heroIconButton } from '@/design-system/components';
import {
  Badge, Button, Card, EmptyState, FilterBar, KpiCard, KpiRow, PageHero, PageShell, Segmented, Skeleton, Table, TBody, Td, Th, THead, Tr,
} from '@/design-system/components';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { t } from '@core/i18n';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { apiErrorMessage } from '../api/online-orders.api';
import { radarApi, type MarginOpportunity, type RadarRow } from '../api/radar.api';

const DAYS = [7, 14, 30];
type Tab = 'rising' | 'falling' | 'margin' | 'bundles';

const KIND: Record<MarginOpportunity['kind'], { label: string; tone: 'danger' | 'warning' | 'success'; text: string }> = {
  loss: { label: t('Nuqsan'), tone: 'danger', text: t('Cost se kam par bik raha hai') },
  raise_price: { label: t('Price barhayein'), tone: 'warning', text: t('Bahut bikta hai, Margin patla hai') },
  push: { label: t('Zyada becho'), tone: 'success', text: t('Margin acha hai, bikri kam') },
};

export default function ProductRadarPage() {
  const guide = usePageGuide();
  const { sales: money } = useMasked();
  const [days, setDays] = useState(14);
  const [tab, setTab] = useState<Tab>('rising');
  const q = useQuery({ queryKey: ['product-radar', days], queryFn: () => radarApi.radar({ days }), placeholderData: (p) => p });
  const d = q.data;

  const tabs = [
    { value: 'rising' as const, label: t('Barh rahe ({{count}})', { count: d?.summary.rising ?? 0 }) },
    { value: 'falling' as const, label: t('Gir rahe ({{count}})', { count: d?.summary.falling ?? 0 }) },
    ...(d?.seesCost ? [{ value: 'margin' as const, label: t('Margin ({{count}})', { count: d.summary.opportunities }) }] : []),
    { value: 'bundles' as const, label: t('Bundles ({{count}})', { count: d?.summary.bundles ?? 0 }) },
  ];

  return (
    <PageShell>
      <PageHero
        back="/online-store" backLabel={t('Online store')}
        title={t('Product Radar')}
        chip={<><Radar />{t('Kya bik raha hai')}</>}
        meta={t('Apni bikri aur channel orders se: kaun si cheez barh rahi hai, kaun si gir rahi hai')}
        busy={q.isFetching && !q.isLoading}
        loading={q.isLoading}
        actions={<button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>}
        stats={d ? [
          { label: t('Barh rahe'), value: String(d.summary.rising + d.summary.newItems) },
          { label: t('Gir rahe'), value: String(d.summary.falling + d.summary.stopped) },
          { label: t('Bundle ideas'), value: String(d.summary.bundles) },
        ] : [{ label: t('Barh rahe'), value: '' }, { label: t('Gir rahe'), value: '' }, { label: t('Bundle ideas'), value: '' }]}
      />

      <FilterBar>
        <Segmented<string> label={t('Muddat')} value={String(days)} onChange={(v) => setDays(Number(v))} items={DAYS.map((n) => ({ value: String(n), label: t('{{days}} din', { days: n }) }))} />
        <span className="self-center text-[0.75rem] text-slate-500">{t('Pichle {{days}} din, us se pehle ke {{days}} din ke muqabil', { days })}</span>
      </FilterBar>

      {q.isError ? (
        <EmptyState title={t('Radar nahi khula')} description={apiErrorMessage(q.error)} action={<Button variant="secondary" onClick={() => q.refetch()}>{t('Dobara koshish')}</Button>} />
      ) : (
        <>
          <KpiRow cols={4}>
            {!d ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
              <KpiCard icon={TrendingUp} color="#16a34a" label={t('Barh rahe')} value={String(d.summary.rising)} hint={t('Naye: {{count}}', { count: d.summary.newItems })} />
              <KpiCard icon={TrendingDown} color="#e11d48" label={t('Gir rahe')} value={String(d.summary.falling)} hint={t('Bikna band: {{count}}', { count: d.summary.stopped })} />
              <KpiCard icon={Sparkles} color="#d97706" label={t('Margin ke mauqe')} value={d.seesCost ? String(d.summary.opportunities) : '—'} hint={d.margin ? t('Aam Margin {{value}}%', { value: d.margin.medianMargin }) : t('Cost dekhne ki ijazat chahiye')} />
              <KpiCard icon={Layers} color="#7c3aed" label={t('Bundle ideas')} value={String(d.summary.bundles)} hint={t('{{count}} bill dekhe', { count: d.bills })} />
            </>}
          </KpiRow>

          <Segmented<Tab> label={t('Hissa')} value={tab} onChange={setTab} items={tabs} />

          {!d ? <Skeleton className="h-64 rounded-2xl" /> : tab === 'rising' ? (
            <Movers rows={d.rising} up money={money} empty={t('Abhi koi cheez khaas nahi barh rahi. Kam bikri me chhoti tabdeeli ko nahi ginte.')} />
          ) : tab === 'falling' ? (
            <Movers rows={d.falling} money={money} empty={t('Koi cheez khaas nahi gir rahi.')} />
          ) : tab === 'margin' && d.margin ? (
            <Card flush title={t('Margin ke mauqe')} description={t('Aap ki apni Margin ke hisaab se. Jin cheezon ki Cost nahi likhi unhein nahi ginte.')}>
              {!d.margin.list.length ? <EmptyState icon={<Sparkles className="h-5 w-5" />} title={t('Abhi koi mauqa nahi')} description={t('Kam az kam 5 cheezein bikni chahiye, aur un ki Cost likhi ho.')} /> : (
                <div className="mt-3 overflow-x-auto">
                  <Table>
                    <THead><Tr><Th>{t('Product')}</Th><Th>{t('Mashwara')}</Th><Th className="text-end">{t('Price')}</Th><Th className="text-end">{t('Margin')}</Th><Th className="text-end">{t('Bika')}</Th><Th className="text-end">{t('Stock')}</Th><Th className="text-end">{t('Faida')}</Th></Tr></THead>
                    <TBody>
                      {d.margin.list.map((m) => (
                        <Tr key={`${m.kind}-${m.productId}`}>
                          <Td className="font-medium text-slate-900">{m.name}</Td>
                          <Td><Badge variant={KIND[m.kind].tone}>{KIND[m.kind].label}</Badge><span className="mt-0.5 block text-[0.75rem] text-slate-500">{KIND[m.kind].text}</span></Td>
                          <Td className="text-end tabular-nums">{money(m.price)}{m.suggestedPrice ? <span className="block text-[0.75rem] font-semibold text-emerald-700">{t('Try: {{value}}', { value: money(m.suggestedPrice) })}</span> : null}</Td>
                          <Td className={`text-end tabular-nums ${m.marginPct < 0 ? 'font-semibold text-rose-600' : ''}`}>{m.marginPct}%</Td>
                          <Td className="text-end tabular-nums">{m.units}</Td>
                          <Td className="text-end tabular-nums">{m.stock}</Td>
                          <Td className="text-end font-semibold tabular-nums">{money(m.gain)}</Td>
                        </Tr>
                      ))}
                    </TBody>
                  </Table>
                </div>
              )}
            </Card>
          ) : (
            <Card flush title={t('Bundle ideas')} description={t('Jo cheezein aksar ek saath bikti hain. Discount chhota rakha hai taake Profit na khaye.')}>
              {!d.bundles.length ? <EmptyState icon={<Layers className="h-5 w-5" />} title={t('Abhi bundle idea nahi')} description={t('Jab kuch cheezein kam az kam 2 bill me ek saath bikengi, yahan nazar aayengi.')} /> : (
                <ul className="mt-3 divide-y divide-slate-100 border-t border-slate-100">
                  {d.bundles.map((b) => (
                    <li key={`${b.a}-${b.b}`} className="flex flex-wrap items-center gap-3 px-5 py-3 text-[0.8125rem]">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900">{b.aName} + {b.bName}</p>
                        <p className="text-slate-500">{t('{{together}} bill me saath · {{confidence}}% khareedar dono lete hain', { together: b.together, confidence: Math.round(b.confidence) })}</p>
                      </div>
                      <div className="text-end">
                        <p className="text-slate-400 line-through tabular-nums">{money(b.regularPrice)}</p>
                        <p className="font-bold tabular-nums text-slate-900">{money(b.bundlePrice)}{b.discountPct > 0 && <span className="ms-1 text-[0.75rem] font-semibold text-emerald-700">−{b.discountPct}%</span>}</p>
                        {b.marginPct !== null && <p className="text-[0.75rem] text-slate-500">{t('Margin {{value}}%', { value: b.marginPct })}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
          <p className="text-[0.75rem] text-slate-400">{t('Bill ho chuke channel orders bikri me pehle se hain. Jo abhi bill nahi hue wo "intezar" me alag dikhte hain.')}</p>
        </>
      )}
      {guide.isOpen && (
        <PageGuide title={t('Product Radar — aasaan tareeqa')} onClose={guide.close}
          flow={[
            { label: t('Bikri aur orders'), icon: Package, color: '#2563eb' },
            { label: t('Barh rahe / gir rahe'), icon: TrendingUp, color: '#16a34a' },
            { label: t('Margin ke mauqe'), icon: Sparkles, color: '#d97706' },
            { label: t('Bundle banayein'), icon: Layers, color: '#7c3aed' },
          ]}
          steps={[
            { icon: TrendingUp, color: '#16a34a', title: t('Barh rahe'), text: t('Pichhle hafton se zyada bik rahe — stock pehle se mangwa lein.') },
            { icon: TrendingDown, color: '#e11d48', title: t('Gir rahe'), text: t('Kam bik rahe — offer, ad ya qeemat dekhein.') },
            { icon: Sparkles, color: '#d97706', title: t('Margin'), text: t('Jahan nuqsan ya bahut kam munafa hai, ya qeemat barhane ki gunjaish hai.') },
            { icon: Layers, color: '#7c3aed', title: t('Bundles'), text: t('Jo cheezein aksar ek saath bikti hain — thore Discount ke saath bundle bana kar bechein.') },
          ]} />
      )}
    </PageShell>
  );
}

function Movers({ rows, up, money, empty }: { rows: RadarRow[]; up?: boolean; money: (n: number) => string; empty: string }) {
  if (!rows.length) return <Card><EmptyState icon={<Package className="h-5 w-5" />} title={empty} /></Card>;
  return (
    <Card flush>
      <div className="overflow-x-auto">
        <Table>
          <THead><Tr><Th>{t('Product')}</Th><Th className="text-end">{t('Pehle')}</Th><Th className="text-end">{t('Ab')}</Th><Th className="text-end">{t('Farq')}</Th><Th>{t('Channel')}</Th><Th className="text-end">{t('Stock')}</Th><Th className="text-end">{t('Margin')}</Th></Tr></THead>
          <TBody>
            {rows.map((r) => (
              <Tr key={r.productId}>
                <Td>
                  <span className="flex items-center gap-2.5">
                    <span className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-slate-100">{r.image ? <img src={r.image} alt="" className="h-full w-full object-cover" loading="lazy" /> : null}</span>
                    <span className="min-w-0"><span className="block truncate font-medium text-slate-900">{r.name}</span>{r.trend === 'new' && <Badge variant="info">{t('Naya')}</Badge>}{r.trend === 'stopped' && <Badge variant="danger">{t('Bikna band')}</Badge>}</span>
                  </span>
                </Td>
                <Td className="text-end tabular-nums text-slate-500">{r.prior}</Td>
                <Td className="text-end font-semibold tabular-nums">{r.recent}{r.waiting > 0 && <span className="block text-[0.6875rem] font-normal text-amber-700">{t('{{count}} intezar me', { count: r.waiting })}</span>}</Td>
                <Td className={`text-end font-semibold tabular-nums ${up ? 'text-emerald-700' : 'text-rose-600'}`}>
                  <span className="inline-flex items-center gap-0.5">{up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}{r.changePct === null ? `+${r.delta}` : `${r.changePct > 0 ? '+' : ''}${Math.round(r.changePct)}%`}</span>
                </Td>
                <Td className="text-[0.8125rem] text-slate-600">{r.channels.length ? r.channels.slice(0, 2).map((c) => `${c.name} ${c.units}`).join(' · ') : '—'}</Td>
                <Td className="text-end tabular-nums">{r.stock}{up && r.stock <= r.recent ? <span className="block text-[0.6875rem] font-semibold text-rose-600">{t('Jaldi khatam')}</span> : null}</Td>
                <Td className="text-end tabular-nums text-slate-600">{r.margin === null ? '—' : `${r.margin}%`}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </div>
      <p className="px-5 pb-3 pt-2 text-[0.75rem] text-slate-400">{t('Revenue is muddat ki: {{value}}', { value: money(rows.reduce((s, r) => s + r.revenue, 0)) })} · <Link to="/inventory/forecast" className="font-medium text-brand-700 hover:underline">{t('Stock forecast')}</Link></p>
    </Card>
  );
}
