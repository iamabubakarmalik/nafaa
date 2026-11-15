'use client';
/**
 * Order detail and tracking: success banner after checkout, live status
 * timeline (refreshed every 20 s while active), rider and courier, shop
 * contact, items and totals, cancel (pending/confirmed) and rating after
 * delivery.
 */
import { Bike, CheckCircle2, ExternalLink, FileText, MapPin, MessageCircle, Package, Phone, RotateCcw, Star, Store, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { Badge, Button, ButtonLink, EmptyState, RatingInput, Sheet, Skeleton, Textarea, cn } from '@/components/ui';
import { ClientError, m } from '@/lib/client';
import { dateTime, money, timeOnly, whatsappLink } from '@/lib/format';
import type { OrderDetail } from '@/lib/types';
import { statusTone, timelineSteps } from './status';

export function OrderView({ id }: { id: string }) {
  const app = useApp();
  const { t } = app;
  const placed = useSearchParams().get('placed') === '1';
  const [o, setO] = useState<OrderDetail | null>(null);
  const [missing, setMissing] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setO(await m<OrderDetail>(`orders/${id}`));
    } catch (e) {
      if (e instanceof ClientError && e.status === 404) setMissing(true);
      else if (e instanceof ClientError && e.status === 401) app.requireSignIn();
    }
  }, [id, app]);

  useEffect(() => {
    if (!app.signedIn) return;
    void load();
  }, [app.signedIn, load]);

  useEffect(() => {
    if (!o?.isActive) return;
    const timer = setInterval(() => document.visibilityState === 'visible' && load(), 20000);
    return () => clearInterval(timer);
  }, [o?.isActive, load]);

  if (!app.signedIn) {
    return <EmptyState icon={<Package />} title={t('orders.title')} body={t('orders.signInSub')} action={<ButtonLink href={`${app.href('/login')}?next=${encodeURIComponent(app.href(`/orders/${id}`))}`}>{t('common.signIn')}</ButtonLink>} />;
  }
  if (missing) return <EmptyState icon={<Package />} title={t('errors.notFound')} action={<ButtonLink href={app.href('/orders')}>{t('orders.title')}</ButtonLink>} />;
  if (!o) return <div className="space-y-4"><Skeleton className="h-40 rounded-2xl" /><Skeleton className="h-56 rounded-2xl" /></div>;

  const steps = timelineSteps(o.deliveryType);
  const reachedAt = (s: string) => o.history.find((h) => h.status === s)?.changedAt ?? null;
  const currentIdx = steps.indexOf(o.status);
  const stopped = o.status === 'CANCELLED' || o.status === 'REFUNDED' || o.status === 'RETURNED' || o.status === 'DISPUTED';
  const riderPhone = o.live?.rider?.phone ?? o.riderPhone;
  const riderName = o.live?.rider?.name ?? o.riderName;
  const courier = o.live?.courier;

  return (
    <div className="space-y-4">
      {placed && (
        <div className="flex animate-bounce-in items-start gap-3 rounded-2xl bg-green-50 p-4 ring-1 ring-green-200">
          <CheckCircle2 className="h-7 w-7 shrink-0 text-green-600" />
          <div>
            <p className="font-bold text-green-900">{t('success.title')}</p>
            <p className="text-sm text-green-800">{t('success.sub', { shop: o.shop?.name ?? '' })}</p>
          </div>
        </div>
      )}

      <section className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="num text-xs text-gray-500">{t('orders.orderNo', { no: o.orderNumber })} · {dateTime(o.createdAt, app.lang)}</p>
            <h2 className="mt-1 text-xl font-extrabold text-gray-900">{t(`status.${o.status}`)}</h2>
          </div>
          <Badge tone={statusTone(o.status)}>{o.statusLabel && app.lang === 'roman' ? o.statusLabel : t(`status.${o.status}`)}</Badge>
        </div>

        {stopped ? (
          <p className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-800"><XCircle className="h-5 w-5" />{t(`status.${o.status}`)}{o.cancelReason ? ` · ${o.cancelReason}` : ''}</p>
        ) : (
          <ol className="mt-5 space-y-0">
            {steps.map((s, i) => {
              const done = i <= currentIdx;
              const at = reachedAt(s);
              return (
                <li key={s} className="relative flex gap-3 pb-5 last:pb-0">
                  {i < steps.length - 1 && <span className={cn('absolute start-[11px] top-6 h-full w-0.5', i < currentIdx ? 'bg-brand-500' : 'bg-gray-200')} aria-hidden />}
                  <span className={cn('relative z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full ring-4 ring-white', done ? 'bg-brand-600 text-white' : 'bg-gray-200')}>
                    {done && <CheckCircle2 className="h-4 w-4" />}
                  </span>
                  <span className="flex-1">
                    <span className={cn('block text-sm', i === currentIdx ? 'font-bold text-gray-900' : done ? 'font-medium text-gray-800' : 'text-gray-400')}>{t(`status.${s}`)}</span>
                    {at && <span className="num block text-xs text-gray-500">{timeOnly(at, app.lang)}</span>}
                  </span>
                </li>
              );
            })}
          </ol>
        )}

        {(riderName || riderPhone) && !stopped && (
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-gray-50 p-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-100 text-brand-700"><Bike className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs text-gray-500">{t('orders.rider')}</span>
              <span className="block font-semibold text-gray-900">{riderName}</span>
            </span>
            {riderPhone && (
              <>
                <a href={`tel:${riderPhone}`} aria-label={t('common.call')} className="grid h-10 w-10 place-items-center rounded-full bg-white shadow-card ring-1 ring-gray-200"><Phone className="h-4 w-4" /></a>
                <a href={whatsappLink(riderPhone)} target="_blank" rel="noopener noreferrer" aria-label={t('common.whatsapp')} className="grid h-10 w-10 place-items-center rounded-full bg-white shadow-card ring-1 ring-gray-200"><MessageCircle className="h-4 w-4 text-green-600" /></a>
              </>
            )}
          </div>
        )}

        {courier && (courier.trackingNumber || courier.trackUrl) && (
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-gray-50 p-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-blue-100 text-blue-700"><Package className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs text-gray-500">{t('orders.courier')}{courier.name ? ` · ${courier.name}` : ''}</span>
              {courier.trackingNumber && <span className="num block font-semibold text-gray-900">{t('orders.trackingNo', { no: courier.trackingNumber })}</span>}
            </span>
            {courier.trackUrl && (
              <a href={courier.trackUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-2 text-xs font-bold shadow-card ring-1 ring-gray-200">
                {t('orders.trackParcel')}<ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {o.canCancel && <Button variant="outline" size="sm" onClick={() => setCancelOpen(true)}>{t('orders.cancel')}</Button>}
          {o.canRate && !o.isRated && <Button size="sm" icon={<Star className="h-4 w-4" />} onClick={() => setRateOpen(true)}>{t('orders.rate')}</Button>}
          {o.canReorder && !o.isActive && <ReorderButton id={o.id} />}
        </div>
      </section>

      {o.shop && (
        <section className="card flex items-center gap-3 p-4">
          <Store className="h-5 w-5 text-gray-400" />
          <Link href={app.href(`/shop/${o.shop.slug}`)} className="min-w-0 flex-1 font-semibold text-gray-900 hover:text-brand-700">{o.shop.name}</Link>
          {o.shop.phone && <a href={`tel:${o.shop.phone}`} aria-label={t('orders.callShop')} className="grid h-10 w-10 place-items-center rounded-full bg-gray-50 ring-1 ring-gray-200"><Phone className="h-4 w-4" /></a>}
          {(o.shop.whatsapp || o.shop.phone) && (
            <a href={whatsappLink((o.shop.whatsapp || o.shop.phone)!, `${t('orders.orderNo', { no: o.orderNumber })}`)} target="_blank" rel="noopener noreferrer" aria-label={t('common.whatsapp')} className="grid h-10 w-10 place-items-center rounded-full bg-gray-50 ring-1 ring-gray-200"><MessageCircle className="h-4 w-4 text-green-600" /></a>
          )}
        </section>
      )}

      <section className="card p-5">
        <h2 className="mb-2 font-bold text-gray-900">{t('orders.items')}</h2>
        <ul className="divide-y divide-gray-100 text-sm">
          {o.items.map((i) => (
            <li key={i.id} className="num flex justify-between gap-3 py-2">
              <span className="text-gray-800">{i.quantity}× {i.name}{i.variantName ? ` · ${i.variantName}` : ''}{i.notes ? <span className="block text-xs text-gray-500">{i.notes}</span> : null}</span>
              <span className="shrink-0 text-gray-900">{money(i.total)}</span>
            </li>
          ))}
        </ul>
        <dl className="num mt-2 space-y-1.5 border-t border-gray-100 pt-3 text-sm">
          <div className="flex justify-between text-gray-600"><dt>{t('common.subtotal')}</dt><dd>{money(o.subtotal)}</dd></div>
          <div className="flex justify-between text-gray-600"><dt>{t('cart.fee')}</dt><dd>{o.deliveryFee ? money(o.deliveryFee) : t('common.free')}</dd></div>
          {o.discount > 0 && <div className="flex justify-between text-green-700"><dt>{t('common.discount')}</dt><dd>− {money(o.discount)}</dd></div>}
          <div className="flex justify-between text-base font-bold text-gray-900"><dt>{t('common.total')}</dt><dd>{money(o.total)}</dd></div>
        </dl>
      </section>

      <section className="card grid gap-4 p-5 text-sm sm:grid-cols-2">
        {o.address && (
          <div className="flex gap-3">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
            <div><p className="font-semibold text-gray-900">{t('orders.deliverTo')}</p><p className="text-gray-600">{[o.address.addressLine1, o.address.area, o.address.city].filter(Boolean).join(', ')}</p></div>
          </div>
        )}
        <div>
          <p className="font-semibold text-gray-900">{t('orders.payment')}</p>
          <p className="text-gray-600">{o.paymentMethod === 'COD' ? t('checkout.cod') : o.paymentMethod}</p>
        </div>
        {o.deliverySlotStart && (
          <div>
            <p className="font-semibold text-gray-900">{t('orders.timeSlot')}</p>
            <p className="num text-gray-600">{dateTime(o.deliverySlotStart, app.lang)}{o.deliverySlotEnd ? ` – ${timeOnly(o.deliverySlotEnd, app.lang)}` : ''}</p>
          </div>
        )}
        {o.attachments.filter((a) => a.kind === 'prescription').map((a) => (
          <a key={a.url} href={a.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-semibold text-brand-700 hover:underline"><FileText className="h-4 w-4" />{t('orders.prescription')}</a>
        ))}
      </section>
      <p className="text-center text-xs text-gray-500">{t('orders.help')}</p>

      <CancelSheet open={cancelOpen} onClose={() => setCancelOpen(false)} id={o.id} onDone={load} />
      <RateSheet open={rateOpen} onClose={() => setRateOpen(false)} id={o.id} delivery={o.deliveryType !== 'PICKUP'} onDone={load} />
    </div>
  );
}

function ReorderButton({ id }: { id: string }) {
  const app = useApp();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="sm"
      variant="secondary"
      loading={busy}
      icon={<RotateCcw className="h-4 w-4" />}
      onClick={async () => {
        setBusy(true);
        try {
          await m(`orders/${id}/reorder`, { body: {} });
          await app.refreshCart();
          app.toast(app.t('orders.reordered'), 'ok', { label: app.t('common.viewCart'), href: app.href('/cart') });
        } catch (e) {
          app.toast(app.errorText(e), 'error');
        } finally {
          setBusy(false);
        }
      }}
    >
      {app.t('orders.reorder')}
    </Button>
  );
}

function CancelSheet({ open, onClose, id, onDone }: { open: boolean; onClose: () => void; id: string; onDone: () => Promise<void> }) {
  const app = useApp();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      await m(`orders/${id}/cancel`, { body: { reason: reason.trim() || undefined } });
      app.toast(app.t('orders.cancelled'));
      onClose();
      await onDone();
    } catch (e) {
      app.toast(app.errorText(e), 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet open={open} onClose={onClose} title={app.t('orders.cancelConfirm')} closeLabel={app.t('common.close')}
      footer={<div className="flex gap-2"><Button variant="secondary" block onClick={onClose}>{app.t('orders.keep')}</Button><Button variant="danger" block loading={busy} onClick={go}>{app.t('orders.cancel')}</Button></div>}>
      <Textarea label={app.t('orders.cancelReason')} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} rows={3} />
    </Sheet>
  );
}

function RateSheet({ open, onClose, id, delivery, onDone }: { open: boolean; onClose: () => void; id: string; delivery: boolean; onDone: () => Promise<void> }) {
  const app = useApp();
  const [shop, setShop] = useState(5);
  const [rider, setRider] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      await m(`orders/${id}/rate`, { body: { shopRating: shop, riderRating: delivery ? rider : undefined, comment: comment.trim() || undefined } });
      app.toast(app.t('orders.rated'));
      onClose();
      await onDone();
    } catch (e) {
      app.toast(app.errorText(e), 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet open={open} onClose={onClose} title={app.t('orders.rate')} closeLabel={app.t('common.close')} footer={<Button block size="lg" loading={busy} onClick={go}>{app.t('orders.rateSubmit')}</Button>}>
      <div className="space-y-5">
        <div><p className="mb-1 text-sm font-semibold text-gray-900">{app.t('orders.rateShop')}</p><RatingInput value={shop} onChange={setShop} label={app.t('orders.rateShop')} /></div>
        {delivery && <div><p className="mb-1 text-sm font-semibold text-gray-900">{app.t('orders.rateRider')}</p><RatingInput value={rider} onChange={setRider} label={app.t('orders.rateRider')} /></div>}
        <Textarea label={app.t('orders.rateComment')} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} rows={3} />
      </div>
    </Sheet>
  );
}
