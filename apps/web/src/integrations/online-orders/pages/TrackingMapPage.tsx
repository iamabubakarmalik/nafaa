/**
 * Live parcel map (/online-orders/tracking): every parcel with a courier on
 * a Pakistan map, by the city it is going to or the last city a courier
 * event named. Bubbles are sized by count and coloured by state; a city
 * opens its parcels. The side lists hold the parcels that need a hand
 * (stuck 5+ days, failed delivery, coming back) with one-click WhatsApp,
 * a re-attempt request and "move to Issues". Refreshes every minute.
 *
 * Couriers send city names, not a rider's GPS, so nothing on this map moves
 * between cities by itself.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, BarChart3, CheckCircle2, GraduationCap, Hourglass, MapPin, MessageCircle, Navigation, PackageSearch, RefreshCw, Repeat, RotateCcw, Store, Truck, X,
} from 'lucide-react';
import {
  Badge, Button, Card, DateRangeMenu, FilterBar, FilterMenu, PageHero, PageShell, Segmented, Skeleton, heroButton, heroIconButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { BrandLogo } from '@/assets/brands/BrandLogo';
import { cn } from '@core/lib/cn';
import { useBusinessDayStart } from '@core/lib/business-day';
import { t } from '@core/i18n';
import { apiErrorMessage } from '../api/online-orders.api';
import { orderBoardApi } from '../api/order-board.api';
import { PARCEL_STATES, insightsApi, type MapParcel, type ParcelState } from '../api/insights.api';
import { useSalesChannels } from '../hooks/useSalesChannels';
import { brandIcon, courierBrand, rs, waNumber } from '../lib/labels';
import { STATE_LABEL, STATE_STYLE, whenShort } from '../lib/tracking';
import { PakistanMap } from '../components/tracking/PakistanMap';
import { OrderDrawer } from '../components/orders/OrderDrawer';

type Side = 'stuck' | 'failed' | 'returning';
const SIDE: { key: Side; label: string; state: ParcelState }[] = [
  { key: 'stuck', label: t('Stuck 5+ din'), state: 'STUCK' },
  { key: 'failed', label: t('Delivery nahi hui'), state: 'FAILED' },
  { key: 'returning', label: t('Wapas aa rahe'), state: 'RETURNING' },
];

function waText(p: MapParcel) {
  return t('Assalam o Alaikum {{name}}! Aap ka order #{{no}} {{courier}} ke paas hai (CN {{cn}}). Courier ne bataya: "{{status}}". Kya aap ghar par hain? Address aur behtar waqt bata dein taake parcel jald mil jaye.', {
    name: p.customerName, no: p.number, courier: p.courierName ?? 'courier', cn: p.trackingNumber ?? '—', status: p.lastEvent ?? STATE_LABEL[p.state],
  });
}

export default function TrackingMapPage() {
  const startHour = useBusinessDayStart();
  const guide = usePageGuide();
  const qc = useQueryClient();
  const [range, setRange] = useState<DateRangeValue>({ preset: 'all', custom: { from: '', to: '' } });
  const [courier, setCourier] = useState('');
  const [status, setStatus] = useState<ParcelState | ''>('');
  const [channel, setChannel] = useState('');
  const [by, setBy] = useState<'destination' | 'seen'>('destination');
  const [city, setCity] = useState<string | null>(null);
  const [side, setSide] = useState<Side>('stuck');
  const [openId, setOpenId] = useState<string | null>(null);
  const period = resolveRange(range, startHour);
  const { data: channels } = useSalesChannels();

  const q = useQuery({
    queryKey: ['parcel-map', period?.from, period?.to, courier, status, channel, by],
    queryFn: () => insightsApi.map({ ...(period ?? {}), courier: courier || undefined, status: status || undefined, integrationId: channel || undefined, by }),
    refetchInterval: 60_000,
    placeholderData: (p) => p,
  });
  const d = q.data;
  const refresh = () => qc.invalidateQueries({ queryKey: ['parcel-map'] });

  const reattempt = useMutation({
    mutationFn: (p: MapParcel) => insightsApi.reattempt(p.id),
    onSuccess: (r) => {
      navigator.clipboard?.writeText(r.text).catch(() => null);
      toast.success(t('Darkhwast order par likh di — courier ke liye text copy ho gaya'));
      refresh();
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const toIssue = useMutation({
    mutationFn: (p: MapParcel) => orderBoardApi.move(p.id, { to: 'ISSUE', reason: t('Parcel map se') }),
    onSuccess: () => { toast.success(t('Issues me daal diya')); refresh(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const cityParcels = useMemo(() => {
    if (!d || !city) return [];
    return d.parcels.filter((p) => (by === 'seen' ? p.seen : p.destination) === city);
  }, [d, city, by]);
  const selectedCity = d?.cities.find((c) => c.key === city) ?? null;
  const sideList = d ? d.attention[side] : [];
  const open = d ? d.counts.IN_TRANSIT + d.counts.OUT_FOR_DELIVERY + d.counts.FAILED + d.counts.STUCK + d.counts.RETURNING : 0;

  const row = (p: MapParcel) => {
    const wa = waNumber(p.customerPhone);
    return (
      <li key={p.id} className="py-2.5">
        <div className="flex items-start gap-2">
          <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', STATE_STYLE[p.state].dot)} aria-hidden />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2">
              <button type="button" onClick={() => setOpenId(p.id)} className="text-[0.8125rem] font-semibold text-slate-900 hover:underline">#{p.number}</button>
              <span className="truncate text-[0.75rem] text-slate-500">{p.customerName}{p.city ? ` · ${p.city}` : ''}</span>
              {p.daysOut != null && <span className="ms-auto text-[0.6875rem] tabular-nums text-slate-500">{t('{{count}} din', { count: p.daysOut })}</span>}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[0.75rem] text-slate-500">
              {p.courierCode && <BrandLogo name={courierBrand(p.courierCode)} size={14} />}
              <span className="font-mono">{p.trackingNumber ?? '—'}</span>
              {p.seen && <span className="inline-flex items-center gap-0.5"><MapPin className="h-3 w-3" />{p.seen}</span>}
              {p.cod > 0 && <span className="ms-auto tabular-nums">COD {rs(p.cod)}</span>}
            </div>
            {p.lastEvent && <div className="mt-0.5 truncate text-[0.75rem] text-slate-600" title={p.lastEvent}>“{p.lastEvent}”{p.lastAt ? <span className="text-slate-400"> · {whenShort(p.lastAt)}</span> : null}</div>}
            {p.rider?.name && <div className="text-[0.6875rem] text-slate-500">{t('Rider')}: {[p.rider.name, p.rider.phone].filter(Boolean).join(' · ')}</div>}
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {wa && (
                <Button size="xs" variant="outline" leftIcon={<MessageCircle className="h-3.5 w-3.5" />}
                  onClick={() => window.open(`https://wa.me/${wa}?text=${encodeURIComponent(waText(p))}`, '_blank', 'noopener')}>WhatsApp</Button>
              )}
              {(p.state === 'FAILED' || p.state === 'STUCK') && p.trackingNumber && (
                <Button size="xs" variant="outline" loading={reattempt.isPending && reattempt.variables?.id === p.id} leftIcon={<Repeat className="h-3.5 w-3.5" />} onClick={() => reattempt.mutate(p)}>
                  {p.reattemptAsked ? t('Dobara darkhwast') : t('Re-attempt')}
                </Button>
              )}
              {p.stage !== 'ISSUE' && p.state !== 'DELIVERED' && (
                <Button size="xs" variant="ghost" loading={toIssue.isPending && toIssue.variables?.id === p.id} leftIcon={<AlertTriangle className="h-3.5 w-3.5" />} onClick={() => toIssue.mutate(p)}>{t('Issues me')}</Button>
              )}
              {p.stage === 'ISSUE' && <Badge size="xs" variant="danger">Issue</Badge>}
            </div>
          </div>
        </div>
      </li>
    );
  };

  return (
    <PageShell>
      <PageHero title={t('Parcel map')} chip={<><Navigation />{t('Live · har minute')}</>}
        meta={t('Courier ke paas har parcel shehar ke hisaab se — kahan ja raha hai aur courier ne aakhri baar kahan dekha')}
        busy={q.isFetching && !q.isLoading} loading={q.isLoading}
        actions={<>
          <button type="button" className={heroButton} onClick={refresh}><RefreshCw className="h-4 w-4" /> <span className="hidden sm:inline">{t('Taaza')}</span></button>
          <Link to="/online-orders/couriers-score" className={heroButton}><BarChart3 className="h-4 w-4" /> <span className="hidden sm:inline">{t('Courier scorecard')}</span></Link>
          <button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={[
          { label: t('Raste me'), value: d ? String(open) : '' },
          { label: 'Out for delivery', value: d ? String(d.counts.OUT_FOR_DELIVERY) : '' },
          { label: t('Masle wale'), value: d ? String(d.counts.STUCK + d.counts.FAILED + d.counts.RETURNING) : '', hint: t('stuck, fail, wapas') },
          { label: t('Aaj deliver hue'), value: d ? String(d.counts.DELIVERED) : '' },
        ]} />

      <FilterBar>
        <DateRangeMenu value={range} onChange={setRange} startHour={startHour} label={t('Bheja')} />
        <FilterMenu icon={Truck} label={t('Courier')} value={courier} active={!!courier} onChange={setCourier}
          options={[{ value: '', label: t('Sab couriers') }, ...(d?.couriers ?? []).map((c) => ({ value: c.code, label: c.name ?? c.code, icon: brandIcon(courierBrand(c.code)) }))]} />
        <FilterMenu icon={PackageSearch} label="Status" value={status} active={!!status} onChange={(v) => setStatus(v as ParcelState | '')}
          options={[{ value: '', label: t('Sab') }, ...PARCEL_STATES.map((s) => ({ value: s, label: STATE_LABEL[s] }))]} />
        <FilterMenu icon={Store} label={t('Channel')} value={channel} active={!!channel} onChange={setChannel}
          options={[{ value: '', label: t('Sab channels') }, ...(channels ?? []).map((c) => ({ value: c.id, label: c.displayName }))]} />
        <Segmented label={t('Bubble kahan')} value={by} onChange={(v) => { setBy(v); setCity(null); }}
          items={[{ value: 'destination', label: t('Kahan ja raha') }, { value: 'seen', label: t('Aakhri baar kahan') }]} />
      </FilterBar>

      {q.error ? <p className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{apiErrorMessage(q.error)}</p> : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <Card className="rounded-2xl">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {PARCEL_STATES.map((s) => (
                <button key={s} type="button" onClick={() => setStatus(status === s ? '' : s)} aria-pressed={status === s}
                  className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.75rem] font-semibold ring-1 ring-slate-200 transition', status === s ? STATE_STYLE[s].soft : 'bg-white text-slate-700 hover:bg-slate-50')}>
                  <span className={cn('h-2 w-2 rounded-full', STATE_STYLE[s].dot)} />{STATE_LABEL[s]}<span className="tabular-nums text-slate-500">{d?.counts[s] ?? 0}</span>
                </button>
              ))}
            </div>
            {q.isLoading ? <Skeleton className="aspect-square w-full rounded-2xl" /> : d && (
              <>
                <div className="mx-auto max-w-xl">
                  <PakistanMap cities={d.cities} origin={d.origin} selected={city} onSelect={setCity} />
                </div>
                {!d.total && <p className="pb-2 text-center text-[0.8125rem] text-slate-500">{t('Abhi koi parcel courier ke paas nahi')}</p>}
                {(d.unplaced.length > 0 || d.noCity > 0) && (
                  <p className="mt-1 text-[0.75rem] text-slate-500">
                    {t('Naqshe par nahi')}: {d.unplaced.slice(0, 8).map((u) => `${u.name} (${u.count})`).join(', ')}{d.noCity ? `${d.unplaced.length ? ', ' : ''}${t('shehar nahi likha')} (${d.noCity})` : ''}
                    {by === 'seen' && ` · ${t('courier ne shehar nahi bataya to parcel yahan nahi aata')}`}
                  </p>
                )}
                {d.capped && <p className="mt-1 flex items-center gap-1 text-[0.75rem] text-amber-700"><AlertTriangle className="h-3.5 w-3.5" />{t('3000 se zyada parcels — filter lagayein')}</p>}
              </>
            )}
          </Card>

          <Card className="rounded-2xl">
            {selectedCity ? (
              <>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <h2 className="text-[0.9375rem] font-semibold text-slate-900">{selectedCity.name}</h2>
                  <span className="text-[0.75rem] text-slate-500">{t('{{count}} parcels', { count: selectedCity.total })}</span>
                  <button type="button" onClick={() => setCity(null)} className="ms-auto rounded-lg p-1 text-slate-500 hover:bg-slate-100" aria-label={t('Band')}><X className="h-4 w-4" /></button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {PARCEL_STATES.filter((s) => selectedCity.counts[s]).map((s) => <span key={s} className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold', STATE_STYLE[s].soft)}>{STATE_LABEL[s]} {selectedCity.counts[s]}</span>)}
                </div>
                <ul className="mt-1 max-h-[34rem] divide-y divide-slate-100 overflow-y-auto">{cityParcels.slice(0, 200).map(row)}</ul>
              </>
            ) : (
              <>
                <Segmented label={t('Kaam wale parcels')} value={side} onChange={setSide}
                  items={SIDE.map((s) => ({ value: s.key, label: s.label, count: d?.counts[s.state] ?? 0, tone: s.state === 'STUCK' ? 'danger' as const : 'warning' as const }))} />
                {q.isLoading ? <Skeleton className="mt-3 h-64 rounded-xl" /> : !sideList.length ? (
                  <p className="flex flex-col items-center gap-2 py-12 text-center text-[0.8125rem] text-slate-500"><CheckCircle2 className="h-6 w-6 text-success-500" />{t('Is list me koi parcel nahi')}</p>
                ) : <ul className="mt-1 max-h-[36rem] divide-y divide-slate-100 overflow-y-auto">{sideList.map(row)}</ul>}
                <p className="mt-2 text-[0.6875rem] text-slate-400">{t('Naqshe par shehar dabayein — us shehar ke parcels yahan khulenge.')}</p>
              </>
            )}
          </Card>
        </div>
      )}

      {openId && <OrderDrawer orderId={openId} onClose={() => setOpenId(null)} />}

      {guide.isOpen && (
        <PageGuide title={t('Parcel map')} onClose={guide.close}
          flow={[
            { label: t('Book'), icon: Truck, color: '#0284c7' },
            { label: t('Raste me'), hint: t('shehar se shehar'), icon: Navigation, color: '#0ea5e9' },
            { label: 'Out for delivery', icon: MapPin, color: '#6366f1' },
            { label: 'Delivered', icon: CheckCircle2, color: '#16a34a' },
          ]}
          steps={[
            { icon: MapPin, color: '#0ea5e9', title: t('Bubble'), text: t('Har shehar ka gola utna bara jitne parcels. Rang batata hai zyada parcels kis haal me hain. Gola dabayein, parcels khul jayenge.') },
            { icon: Hourglass, color: '#e11d48', title: t('Stuck aur fail'), text: t('5 din se raste me ya delivery fail — WhatsApp karein, courier se dobara koshish ki darkhwast karein ya Issues me daalein.') },
            { icon: RotateCcw, color: '#c026d3', title: t('Wapas aa rahe'), text: t('Courier ne wapsi likhi hai — parcel aaye to Return scan se receive karein.') },
            { icon: Navigation, color: '#64748b', title: t('Rider ki location?'), text: t('Courier sirf shehar aur status bhejte hain, rider ki live GPS nahi. Is liye naqsha shehar ke hisaab se hai.') },
          ]}
          shortcuts={[['G', t('guide')]]}
        />
      )}
    </PageShell>
  );
}
