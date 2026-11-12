'use client';

/**
 * Thank-you page. For COD orders the big green button sends the prefilled
 * confirmation to the shop on WhatsApp (confirmed orders go out first);
 * prepaid orders that still need payment get a "Complete payment" button.
 */
import Image from 'next/image';
import Link from 'next/link';
import { CheckCircle2, CreditCard, MapPin, Package } from 'lucide-react';
import { useEffect } from 'react';
import type { OrderView } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { track } from '@/lib/client/track';
import { useStore } from '../providers/StoreProvider';
import { WhatsAppIcon } from '../ui/brand-icons';

export function OrderConfirmation({ order, token }: { order: OrderView; token: string }) {
  const { t, money, href, shop } = useStore();
  useEffect(() => {
    try {
      if (!sessionStorage.getItem(`nf_purchase_${token}`)) {
        sessionStorage.setItem(`nf_purchase_${token}`, '1');
        track('purchase', { value: order.total, orderNumber: order.orderNumber });
      }
    } catch {
      /* ignore */
    }
  }, [order.orderNumber, order.total, token]);
  const pay = order.payment.required && !order.paid && order.payment.url;
  const firstName = order.contact.name.split(' ')[0] || order.contact.name;
  return (
    <section className="pb-20 pt-10 md:pt-16">
      <div className="page max-w-2xl">
        <div className="flex flex-col items-center text-center">
          <span className="grid h-16 w-16 animate-rise place-items-center rounded-full bg-ok/10 text-ok">
            <CheckCircle2 size={36} />
          </span>
          <h1 className="h-display mt-5 text-3xl font-semibold">{t('order.thanks', { name: firstName })}</h1>
          <p className="mt-2 text-[16px] text-muted">{t('order.placed', { number: order.orderNumber })}</p>
        </div>

        {pay ? (
          <div className="mt-8 rounded-card border-2 border-primary/30 bg-primary/5 p-5 text-center">
            <p className="text-[15px] font-medium">
              {t('order.paymentPending')} · {money(order.payment.amount)}
            </p>
            <a href={order.payment.url!} className="btn btn-primary btn-lg mt-4 w-full sm:w-auto">
              <CreditCard size={18} /> {t('order.payNow')}
            </a>
          </div>
        ) : order.whatsappConfirmUrl && shop.checkout.codConfirmWhatsApp ? (
          <div className="mt-8 rounded-card border border-wa/40 bg-wa/10 p-5">
            <p className="text-center text-[14.5px] text-fg/85">{t('order.confirmWaText')}</p>
            <a href={order.whatsappConfirmUrl} target="_blank" rel="noopener noreferrer" className="btn btn-lg btn-wa btn-block mt-4">
              <WhatsAppIcon size={22} /> {t('order.confirmWa')}
            </a>
          </div>
        ) : null}

        <div className="mt-8 overflow-hidden rounded-card border border-line">
          <div className="grid grid-cols-2 gap-4 border-b border-line bg-surface px-5 py-4 text-[13.5px] sm:grid-cols-3">
            <div>
              <p className="text-muted">{t('order.number')}</p>
              <p className="font-semibold">{order.orderNumber}</p>
            </div>
            <div>
              <p className="text-muted">{t('order.date')}</p>
              <p className="font-semibold">{formatDate(order.createdAt, shop.lang)}</p>
            </div>
            <div>
              <p className="text-muted">{t('order.status')}</p>
              <p className="font-semibold">{order.statusLabel}</p>
            </div>
          </div>
          <ul className="divide-y divide-line px-5">
            {order.lines.map((l, i) => (
              <li key={i} className="flex items-center gap-3 py-3.5">
                <span className="relative h-14 w-12 shrink-0 overflow-hidden rounded-[8px] bg-surface">{l.image && <Image src={l.image} alt="" fill sizes="48px" className="object-cover" />}</span>
                <span className="min-w-0 flex-1 text-[14px]">
                  <span className="line-clamp-1 font-medium">{l.title}</span>
                  <span className="text-[12.5px] text-muted">
                    {l.variantTitle ? `${l.variantTitle} · ` : ''}× {l.quantity}
                  </span>
                </span>
                <span className="text-[14px] font-medium tabular-nums">{money(l.price * l.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="space-y-1.5 border-t border-line px-5 py-4 text-[14px]">
            <div className="flex justify-between">
              <dt>{t('cart.subtotal')}</dt>
              <dd>{money(order.subtotal)}</dd>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-ok">
                <dt>{t('cart.discount')}</dt>
                <dd>-{money(order.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt>{t('checkout.shippingLine')}</dt>
              <dd>{order.shipping ? money(order.shipping) : t('checkout.free')}</dd>
            </div>
            {order.codFee > 0 && (
              <div className="flex justify-between">
                <dt>{t('checkout.codLine')}</dt>
                <dd>{money(order.codFee)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-line pt-2.5 text-[16px] font-semibold">
              <dt>{t('checkout.total')}</dt>
              <dd>{money(order.total)}</dd>
            </div>
          </dl>
          <div className="grid gap-4 border-t border-line bg-surface px-5 py-4 text-[13.5px] sm:grid-cols-2">
            <p className="flex items-start gap-2">
              <MapPin size={16} className="mt-0.5 text-muted" />
              <span>
                <b>{order.contact.name}</b>
                <br />
                {order.address.city} · <span dir="ltr">{order.contact.phone}</span>
              </span>
            </p>
            <p className="flex items-start gap-2">
              <Package size={16} className="mt-0.5 text-muted" />
              <span>{order.paid ? t('order.paid') : order.paymentMethod === 'COD' ? t('order.cod') : t('order.paymentPending')}</span>
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href={href(order.trackUrl || `/account/track?no=${encodeURIComponent(order.orderNumber)}`)} className="btn btn-outline">
            {t('order.track')}
          </Link>
          <Link href={href('/')} className="btn btn-primary">
            {t('order.continue')}
          </Link>
        </div>
      </div>
    </section>
  );
}
