'use client';
/**
 * Booking flow for services (salon, clinic, gym): pick a day and a time from
 * the shop's free slots (checkout/delivery-slots), then the service goes in
 * the cart with the chosen time in its options.
 */
import { CalendarCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { Button, Price, Sheet, Skeleton, cn } from '@/components/ui';
import { m } from '@/lib/client';
import { dateOnly } from '@/lib/format';
import type { ProductSummary, Slot } from '@/lib/types';
import { useCart } from './useCart';

export function BookingSheet({ service, shopId, onClose }: { service: ProductSummary | null; shopId: string; onClose: () => void }) {
  const app = useApp();
  const cart = useCart();
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);

  useEffect(() => {
    if (!service) return;
    setSlots(null);
    setSlot(null);
    m<Slot[]>('checkout/slots', { query: { shopId } })
      .then((s) => {
        setSlots(s);
        setDay(s[0]?.date ?? null);
      })
      .catch(() => setSlots([]));
  }, [service, shopId]);

  const days = useMemo(() => [...new Set((slots ?? []).map((s) => s.date))], [slots]);

  const book = async () => {
    if (!service || !slot) return;
    const ok = await cart.add({ productId: service.productId, quantity: 1, options: { bookingStart: slot.start, bookingEnd: slot.end, bookingLabel: `${slot.date} ${slot.label}` } });
    if (ok) onClose();
  };

  return (
    <Sheet
      open={!!service}
      onClose={onClose}
      closeLabel={app.t('common.close')}
      title={service?.name}
      footer={
        <Button block size="lg" disabled={!slot} loading={cart.busy === service?.productId} onClick={book} icon={<CalendarCheck className="h-5 w-5" />}>
          {app.t('shop.bookConfirm')}
        </Button>
      }
    >
      {service && <Price value={service.price} size="lg" />}
      <h3 className="mb-2 mt-4 text-sm font-bold text-gray-900">{app.t('shop.pickSlot')}</h3>
      {slots === null ? (
        <div className="grid grid-cols-3 gap-2">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-11" />)}</div>
      ) : !slots.length ? (
        <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600">{app.t('shop.noSlots')}</p>
      ) : (
        <>
          <div className="scroll-x mb-3">
            {days.map((d) => (
              <button key={d} type="button" onClick={() => setDay(d)} className={cn('shrink-0 rounded-xl px-4 py-2 text-sm font-semibold ring-1', day === d ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-gray-800 ring-gray-200')}>
                {dateOnly(`${d}T12:00:00+05:00`, app.lang)}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {slots.filter((s) => s.date === day).map((s) => (
              <button key={s.start} type="button" onClick={() => setSlot(s)} aria-pressed={slot?.start === s.start} className={cn('num rounded-xl px-3 py-3 text-sm font-semibold ring-1', slot?.start === s.start ? 'bg-brand-50 text-brand-800 ring-brand-500' : 'bg-white text-gray-800 ring-gray-200 hover:ring-gray-300')}>
                {s.label}
              </button>
            ))}
          </div>
        </>
      )}
    </Sheet>
  );
}
