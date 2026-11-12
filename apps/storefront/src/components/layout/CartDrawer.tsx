'use client';

/**
 * Slide-in cart. Opens after every add; shows the free-delivery progress,
 * line quantities, problems the server found (sold out, reduced), and goes
 * straight to the one-page checkout.
 */
import Link from 'next/link';
import Image from 'next/image';
import { Minus, Plus, ShoppingBag, Trash2, Truck, X } from 'lucide-react';
import { useEffect } from 'react';
import type { Cart, CartLine } from '@/lib/api';
import { useStore } from '../providers/StoreProvider';

export function FreeShippingBar({ cart }: { cart: Cart }) {
  const { t, money, shop } = useStore();
  const fs = cart.freeShipping ?? (shop.shipping.freeShippingThreshold ? { threshold: shop.shipping.freeShippingThreshold, remaining: Math.max(0, shop.shipping.freeShippingThreshold - cart.subtotal) } : null);
  if (!fs || !fs.threshold) return null;
  const pct = Math.min(100, Math.round(((fs.threshold - fs.remaining) / fs.threshold) * 100));
  return (
    <div className="rounded-card bg-surface px-4 py-3">
      <p className="flex items-center gap-2 text-[13.5px] font-medium">
        <Truck size={16} className="text-primary" />
        {fs.remaining > 0 ? t('cart.freeShippingLeft', { amount: money(fs.remaining) }) : t('cart.freeShippingDone')}
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-fg/10">
        <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function LineItem({ line, compact }: { line: CartLine; compact?: boolean }) {
  const { setQty, money, t, href, busy } = useStore();
  const max = line.maxQty > 0 ? line.maxQty : 99;
  return (
    <div className="flex gap-3 py-4">
      <Link href={href(line.url)} className="relative h-24 w-20 shrink-0 overflow-hidden rounded-[calc(var(--r-card)*0.6)] bg-surface">
        {line.image && <Image src={line.image} alt={line.title} fill sizes="80px" className="object-cover" />}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link href={href(line.url)} className="line-clamp-2 text-[14px] font-medium leading-snug hover:underline">
              {line.title}
            </Link>
            {line.variantTitle && <p className="mt-0.5 text-[12.5px] text-muted">{line.variantTitle}</p>}
          </div>
          <span className="shrink-0 text-[14px] font-semibold tabular-nums">{money(line.lineTotal)}</span>
        </div>
        {line.problem && <p className="mt-1 text-[12.5px] font-medium text-sale">{t('cart.unavailable')}</p>}
        {line.availability === 'backorder' && line.leadTime && <p className="mt-1 text-[12px] text-warn">{line.leadTime}</p>}
        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="inline-flex h-9 items-center rounded-btn border border-line">
            <button type="button" className="grid h-9 w-9 place-items-center disabled:opacity-40" aria-label="-" disabled={busy} onClick={() => setQty(line.lineId, line.quantity - 1)}>
              <Minus size={14} />
            </button>
            <span className="w-7 text-center text-[14px] font-semibold tabular-nums">{line.quantity}</span>
            <button type="button" className="grid h-9 w-9 place-items-center disabled:opacity-40" aria-label="+" disabled={busy || line.quantity >= max} onClick={() => setQty(line.lineId, line.quantity + 1)}>
              <Plus size={14} />
            </button>
          </div>
          {!compact && (
            <button type="button" className="flex items-center gap-1 text-[12.5px] text-muted hover:text-sale" onClick={() => setQty(line.lineId, 0)}>
              <Trash2 size={14} /> {t('cart.remove')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function CartDrawer() {
  const { cart, drawer, setDrawer, t, money, href, error } = useStore();
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setDrawer(false);
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [setDrawer]);
  if (!drawer) return null;
  const lines = cart?.lines ?? [];
  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={t('cart.title')}>
      <button type="button" aria-label={t('nav.close')} className="absolute inset-0 animate-fade-in bg-black/45" onClick={() => setDrawer(false)} />
      <aside className="absolute inset-y-0 end-0 flex w-full max-w-[440px] animate-slide-in flex-col bg-bg text-fg shadow-pop rtl:animate-slide-in-left">
        <div className="flex h-16 items-center justify-between border-b border-line px-5">
          <h2 className="h-display text-lg font-semibold">
            {t('cart.title')} {cart?.itemCount ? <span className="text-muted">({cart.itemCount})</span> : null}
          </h2>
          <button type="button" className="icon-btn -me-2" aria-label={t('nav.close')} onClick={() => setDrawer(false)}>
            <X size={22} />
          </button>
        </div>
        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-surface">
              <ShoppingBag size={26} className="text-muted" />
            </span>
            <p className="text-lg font-semibold">{t('cart.empty')}</p>
            <p className="text-[14px] text-muted">{t('cart.emptyText')}</p>
            <button type="button" className="btn btn-primary mt-3" onClick={() => setDrawer(false)}>
              {t('cart.continue')}
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5">
              <div className="pt-4">{cart && <FreeShippingBar cart={cart} />}</div>
              <div className="divide-y divide-line">
                {lines.map((l) => (
                  <LineItem key={l.lineId} line={l} />
                ))}
              </div>
            </div>
            <div className="border-t border-line px-5 pb-5 pt-4">
              {error && <p className="mb-2 text-[13px] text-sale">{error}</p>}
              {cart && cart.discount > 0 && (
                <div className="mb-1 flex justify-between text-[14px] text-ok">
                  <span>{t('cart.discount')}</span>
                  <span>-{money(cart.discount)}</span>
                </div>
              )}
              <div className="flex items-baseline justify-between">
                <span className="text-[15px] font-medium">{t('cart.subtotal')}</span>
                <span className="text-xl font-semibold tabular-nums">{money((cart?.subtotal ?? 0) - (cart?.discount ?? 0))}</span>
              </div>
              <p className="mb-4 mt-0.5 text-[12.5px] text-muted">{t('cart.taxNote')}</p>
              <Link href={href('/checkout')} className="btn btn-primary btn-lg btn-block" onClick={() => setDrawer(false)}>
                {t('cart.checkout')} · {money((cart?.subtotal ?? 0) - (cart?.discount ?? 0))}
              </Link>
              <Link href={href('/cart')} className="mt-2 block py-2 text-center text-[14px] font-medium underline-offset-2 hover:underline" onClick={() => setDrawer(false)}>
                {t('cart.viewCart')}
              </Link>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
