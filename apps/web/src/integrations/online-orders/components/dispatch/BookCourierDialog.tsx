/**
 * Bulk courier booking from the board or the dispatch page. Shows each
 * connected courier's rate-card price for the picked orders and its RTO rate
 * in their cities, preselects the cheapest courier with a good delivery
 * record, and also offers "Auto" (the shop's courier rules) and "Best"
 * (the best courier per order). Every order reports its own result.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, Sparkles, Wand2, XCircle } from 'lucide-react';
import { Button, Input, Modal, Select, Skeleton } from '@/design-system/components';
import { BrandLogo } from '@/assets/brands/BrandLogo';
import { cn } from '@core/lib/cn';
import { apiErrorMessage, type OnlineOrder } from '../../api/online-orders.api';
import { dispatchApi, type AfterBook, type BookResultRow } from '../../api/dispatch.api';
import { courierBrand, rs } from '../../lib/labels';
import { orderNo } from '../../lib/orders';
import { t } from '@core/i18n';

export function BookCourierDialog({ orders, onClose, onDone }: {
  orders: OnlineOrder[];
  onClose: () => void;
  /** Called after booking with the ids that failed. */
  onDone: (failed: string[]) => void;
}) {
  const ids = orders.map((o) => o.id);
  const [weight, setWeight] = useState('');
  const [pieces, setPieces] = useState('');
  const [choice, setChoice] = useState<string>('');
  const [after, setAfter] = useState<AfterBook | ''>('');
  const [results, setResults] = useState<BookResultRow[] | null>(null);
  const w = Number(weight) > 0 ? Number(weight) : undefined;

  const settings = useQuery({ queryKey: ['dispatch-settings'], queryFn: dispatchApi.settings, staleTime: 5 * 60_000 });
  const rates = useQuery({ queryKey: ['dispatch-rates', ids.join(','), w], queryFn: () => dispatchApi.rates(ids, w), placeholderData: (p) => p });
  const data = rates.data;
  useEffect(() => { if (!choice && data?.pick) setChoice(data.pick); }, [data?.pick]); // eslint-disable-line react-hooks/exhaustive-deps
  const afterValue: AfterBook = after || settings.data?.afterBook || 'PACKED';

  const book = useMutation({
    mutationFn: () => dispatchApi.book({ orderIds: ids, courier: choice, weightKg: w, pieces: Number(pieces) > 0 ? Number(pieces) : undefined, after: afterValue }),
    onSuccess: (r) => {
      setResults(r.results);
      if (r.booked) toast.success(t('{{count}} orders book ho gaye', { count: r.booked }));
      if (r.failed) toast.error(t('{{count}} orders book nahi hue', { count: r.failed }));
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const byId = new Map(orders.map((o) => [o.id, o]));
  const finish = () => { onDone((results ?? []).filter((r) => !r.ok).map((r) => r.id)); onClose(); };

  return (
    <Modal open onClose={results ? finish : onClose} size="lg"
      title={t('{{count}} orders courier par book', { count: orders.length })}
      description={t('Rate card se qeemat aur aap ki history se RTO — sab se sasta achha courier pehle se chuna hai')}
      footer={results ? (
        <div className="flex w-full justify-end"><Button onClick={finish}>{t('Theek hai')}</Button></div>
      ) : (
        <div className="flex w-full items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>{t('Rehne dein')}</Button>
          <Button disabled={!choice || !data?.couriers.length} loading={book.isPending} onClick={() => book.mutate()}>{t('Book karein')}</Button>
        </div>
      )}>
      {results ? (
        <ul className="max-h-[50vh] divide-y divide-slate-100 overflow-y-auto rounded-xl ring-1 ring-slate-200">
          {results.map((r) => (
            <li key={r.id} className="flex items-start gap-2.5 px-3 py-2 text-[0.8125rem]">
              {r.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-600" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />}
              <span className="font-semibold text-slate-900">#{byId.has(r.id) ? orderNo(byId.get(r.id)!) : r.id.slice(-6)}</span>
              <span className="min-w-0 flex-1 text-slate-600">
                {r.ok ? <>{r.courier && <BrandLogo name={courierBrand(r.courier)} size={14} />} <span className="font-mono">{r.trackingNumber}</span>{r.moved ? ` · → ${r.moved}` : ''}{r.moveError ? <span className="text-amber-700"> · {r.moveError}</span> : null}</>
                  : <span className="text-rose-700">{r.error}</span>}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="space-y-4">
          {rates.isLoading ? <Skeleton className="h-40 rounded-2xl" /> : rates.isError ? (
            <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{apiErrorMessage(rates.error)}</p>
          ) : !data?.couriers.length ? (
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
              {t('Koi courier API se jura nahi.')} <Link className="font-semibold underline" to="/online-store/couriers">{t('Courier jorein')}</Link>
            </p>
          ) : (
            <>
              {data.ready < data.orders && (
                <p className="rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-800">
                  {t('{{count}} orders abhi book nahi ho sakte (accept nahi hue, pehle se book ya bhej diye) — un ka natija alag dikhega', { count: data.orders - data.ready })}
                </p>
              )}
              <div className="grid gap-2" role="radiogroup" aria-label={t('Courier')}>
                {data.auto && (
                  <Choice active={choice === 'AUTO'} onClick={() => setChoice('AUTO')} icon={<Wand2 className="h-5 w-5 text-violet-600" />}
                    title={t('Auto — courier rules se')}
                    text={Object.entries(data.auto.byCourier).map(([c, n]) => `${c} ${n}`).join(' · ') + (data.auto.ask ? t(' · {{count}} ruke rahenge', { count: data.auto.ask }) : '')} />
                )}
                {data.couriers.length > 1 && (
                  <Choice active={choice === 'BEST'} onClick={() => setChoice('BEST')} icon={<Sparkles className="h-5 w-5 text-amber-500" />}
                    title={t('Har order ka best courier')} text={t('Har order ke shehar ke hisaab se sasta aur kam RTO wala')} />
                )}
                {data.couriers.map((c) => (
                  <Choice key={c.code} active={choice === c.code} onClick={() => setChoice(c.code)}
                    icon={<BrandLogo name={courierBrand(c.code)} size={28} />}
                    title={<>{c.name}{c.code === data.pick && <span className="ms-2 rounded-md bg-success-50 px-1.5 py-0.5 text-[0.6875rem] font-bold text-success-700">{t('Best')}</span>}</>}
                    text={c.rtoRate == null ? t('RTO history nahi') : t('RTO {{rate}}% ({{basis}})', { rate: c.rtoRate, basis: c.basis === 'CITY' ? t('in shehron me') : t('sab shehar') })}
                    right={c.charge == null
                      ? <Link to="/online-store/costs" className="text-[0.75rem] font-semibold text-amber-700 underline">{t('Rate card nahi')}</Link>
                      : <div className="text-end"><div className="font-bold tabular-nums text-slate-900">{rs(c.charge + c.codFee)}</div><div className="text-[0.6875rem] text-slate-500">{t('andaza {{value}}', { value: rs(c.expected ?? 0) })}</div></div>} />
                ))}
              </div>
            </>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            <Input label={t('Wazan (kg)')} inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder={t('Har order ka apna')} />
            <Input label={t('Pieces')} inputMode="numeric" value={pieces} onChange={(e) => setPieces(e.target.value)} placeholder={t('Cheezon ki ginti')} />
            <Select label={t('Book hone ke baad')} value={afterValue} onChange={(e) => setAfter(e.target.value as AfterBook)}
              options={[{ value: 'NONE', label: t('Status wahi rahe') }, { value: 'PACKED', label: 'PACKED' }, { value: 'DISPATCHED', label: 'DISPATCHED' }]} />
          </div>
        </div>
      )}
    </Modal>
  );
}

function Choice({ active, onClick, icon, title, text, right }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: React.ReactNode; text: string; right?: React.ReactNode }) {
  return (
    <button type="button" role="radio" aria-checked={active} onClick={onClick}
      className={cn('flex w-full items-center gap-3 rounded-2xl border-2 px-3 py-2.5 text-start transition', active ? 'border-brand-500 bg-brand-50/50' : 'border-slate-200 hover:border-slate-300')}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.875rem] font-semibold text-slate-900">{title}</span>
        <span className="block truncate text-[0.75rem] text-slate-500">{text}</span>
      </span>
      {right}
    </button>
  );
}
