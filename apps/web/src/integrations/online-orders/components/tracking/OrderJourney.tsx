/**
 * An order's journey with the courier: the step timeline (booked → picked →
 * origin hub → in transit → destination hub → out for delivery → delivered
 * or returned) with time, city, the courier's own words and the rider when
 * the courier sends one, and a small map from the shop's city to the
 * customer's. Used in the order drawer and on the public tracking page.
 */

import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Circle, MapPin, Phone, RotateCcw, Route, User } from 'lucide-react';
import { Badge, Card, Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import { insightsApi, type Journey, type JourneyStep } from '../../api/insights.api';
import { STEP_LABEL, whenShort } from '../../lib/tracking';
import { PakistanMap } from './PakistanMap';

function stepLabel(s: JourneyStep) {
  if (s.key !== 'END') return STEP_LABEL[s.key];
  return s.outcome === 'RETURNED' ? t('Wapas shop par (RTO)') : STEP_LABEL.END;
}

export function JourneyView({ journey: j, showMap = true }: { journey: Journey; showMap?: boolean }) {
  const mapOk = showMap && (j.path.length > 0 || !!j.destination);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {j.outcome === 'DELIVERED' && <Badge size="xs" variant="success">Delivered</Badge>}
        {j.outcome === 'RETURNED' && <Badge size="xs" variant="danger">{t('Wapas (RTO)')}</Badge>}
        {j.returning && <Badge size="xs" variant="warning">{t('Wapas aa raha')}</Badge>}
        {j.attempts > 0 && <Badge size="xs" variant="warning">{t('{{count}} dafa delivery nahi hui', { count: j.attempts })}</Badge>}
        {j.origin && j.destination && (
          <span className="inline-flex items-center gap-1 text-[0.75rem] text-slate-500"><Route className="h-3.5 w-3.5" />{j.origin.name} → {j.destination.name}</span>
        )}
      </div>

      {mapOk && (
        <div className="overflow-hidden rounded-xl bg-slate-50 p-2 ring-1 ring-slate-200/80">
          <PakistanMap className="mx-auto max-h-56" route={{ path: j.path, destination: j.destination, here: j.here, done: !!j.outcome }} labels={0} />
        </div>
      )}

      {j.rider && (j.rider.name || j.rider.phone) && (
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] ring-1 ring-slate-200/80">
          <User className="h-4 w-4 text-slate-400" />
          <span className="font-semibold text-slate-900">{j.rider.name ?? t('Rider')}</span>
          {j.rider.phone && <a href={`tel:${j.rider.phone}`} className="ms-auto inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline"><Phone className="h-3.5 w-3.5" />{j.rider.phone}</a>}
        </div>
      )}

      <ol className="relative space-y-0">
        {j.steps.map((s, i) => {
          const last = i === j.steps.length - 1;
          const bad = s.key === 'END' && s.outcome === 'RETURNED';
          return (
            <li key={s.key} className="relative flex gap-3 pb-3">
              {!last && <span aria-hidden className={cn('absolute start-[0.6875rem] top-6 h-[calc(100%-1.25rem)] w-0.5', s.reached && j.steps[i + 1]?.reached ? 'bg-brand-500' : 'bg-slate-200')} />}
              <span className="relative z-[1] mt-0.5 shrink-0">
                {bad ? <RotateCcw className="h-[1.375rem] w-[1.375rem] rounded-full bg-white text-rose-500" />
                  : s.reached ? <CheckCircle2 className={cn('h-[1.375rem] w-[1.375rem] rounded-full bg-white', s.inferred ? 'text-brand-300' : 'text-brand-600')} />
                  : <Circle className={cn('h-[1.375rem] w-[1.375rem] rounded-full bg-white', s.current ? 'text-brand-500' : 'text-slate-300')} />}
                {s.current && <span aria-hidden className="absolute inset-0 rounded-full ring-4 ring-brand-500/20 motion-safe:animate-pulse" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                  <span className={cn('text-[0.8125rem] font-semibold', s.reached ? 'text-slate-900' : 'text-slate-400')}>
                    {stepLabel(s)}{s.current && <span className="ms-1.5 text-[0.6875rem] font-semibold text-brand-700">· {t('abhi yahan')}</span>}
                  </span>
                  {s.at && <span className="text-[0.6875rem] tabular-nums text-slate-500">{whenShort(s.at)}</span>}
                </div>
                {(s.city || s.text) && (
                  <div className="mt-0.5 text-[0.75rem] text-slate-500">
                    {s.city && <span className="me-1.5 inline-flex items-center gap-0.5 font-medium text-slate-600"><MapPin className="h-3 w-3" />{s.city}</span>}
                    {s.text && <span>“{s.text}”</span>}
                  </div>
                )}
                {s.inferred && !s.at && <div className="text-[0.6875rem] text-slate-400">{t('Courier ne ye qadam alag se nahi bataya')}</div>}
                {s.rider && (s.rider.name || s.rider.phone) && (
                  <div className="mt-0.5 text-[0.6875rem] text-slate-500">{t('Rider')}: {[s.rider.name, s.rider.phone].filter(Boolean).join(' · ')}</div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Journey card for the order drawer; loads only for orders with a CN. */
export function OrderJourneyCard({ orderId, trackingNumber }: { orderId: string; trackingNumber: string | null | undefined }) {
  const q = useQuery({ queryKey: ['order-journey', orderId, trackingNumber], queryFn: () => insightsApi.journey(orderId), enabled: !!trackingNumber, staleTime: 60_000 });
  if (!trackingNumber) return null;
  return (
    <Card title={t('Parcel ka safar')}>
      {q.isLoading ? <Skeleton className="h-40 rounded-xl" /> : q.data ? (
        <>
          <JourneyView journey={q.data} />
          <p className="mt-1 text-[0.6875rem] text-slate-400">
            {t('Courier shehar ke naam bhejta hai, rider ki live location nahi — is liye safar shehar se shehar dikhta hai.')}
            {q.data.syncedAt ? ` ${t('Aakhri update')}: ${whenShort(q.data.syncedAt)}` : ''}
          </p>
        </>
      ) : <p className="text-[0.8125rem] text-slate-500">{t('Safar abhi nahi mila')}</p>}
    </Card>
  );
}
