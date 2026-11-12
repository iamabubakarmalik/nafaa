'use client';

/** Full cart page (`main_cart`): lines, free-delivery progress, summary and checkout. */
import Link from 'next/link';
import { ShieldCheck, ShoppingBag, Tag, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Cart } from '@/lib/api';
import { sf, SfError } from '@/lib/client/sf';
import { useStore } from '../providers/StoreProvider';
import { FreeShippingBar, LineItem } from '../layout/CartDrawer';

function CouponBox() {
  const { cart, setCart, t } = useStore();
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const apply = async (c: string | null) => {
    setMsg(null);
    try {
      const r = await sf<{ ok: boolean; message: string; cart: Cart | null }>('cart.coupon', { code: c ?? '' });
      if (r.cart) setCart(r.cart);
      if (c) setMsg({ ok: r.ok, text: r.message });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof SfError ? e.message : t('common.error') });
    }
  };
  if (cart?.coupon) {
    return (
      <div className="mt-4 flex items-center justify-between rounded-input bg-ok/10 px-3 py-2.5 text-[14px] text-ok">
        <span className="flex items-center gap-2 font-semibold">
          <Tag size={15} /> {cart.coupon.code}
        </span>
        <button type="button" onClick={() => apply(null)} aria-label={t('checkout.removeCoupon')}>
          <X size={16} />
        </button>
      </div>
    );
  }
  return (
    <div className="mt-4">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (code.trim()) void apply(code.trim());
        }}
      >
        <input className="field !min-h-[44px] flex-1 uppercase" placeholder={t('checkout.coupon')} value={code} onChange={(e) => setCode(e.target.value)} />
        <button type="submit" className="btn btn-outline !min-h-[44px]" disabled={!code.trim()}>
          {t('checkout.apply')}
        </button>
      </form>
      {msg && <p className={`mt-2 text-[13px] ${msg.ok ? 'text-ok' : 'text-sale'}`}>{msg.text}</p>}
    </div>
  );
}

/** Order note on the cart page; saved to the cart and sent with the order at checkout. */
function CartNote() {
  const { cart, setCart, t } = useStore();
  const [text, setText] = useState(cart?.notes ?? '');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    setText(cart?.notes ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart?.token]);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  const save = (v: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      sf<{ cart: Cart | null }>('cart.patch', { notes: v.trim() || null })
        .then((r) => r.cart && setCart(r.cart))
        .catch(() => undefined);
    }, 600);
  };
  return (
    <div className="mt-6">
      <label htmlFor="cart-note" className="label">
        {t('checkout.notes')}
      </label>
      <textarea
        id="cart-note"
        rows={2}
        maxLength={500}
        className="field resize-none"
        placeholder={t('checkout.notesPlaceholder')}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          save(e.target.value);
        }}
      />
    </div>
  );
}

export function CartPageClient({ freeShippingBar = true, coupon = true, notes = true }: { freeShippingBar?: boolean; coupon?: boolean; notes?: boolean }) {
  const { cart, cartReady, t, money, href } = useStore();
  const lines = cart?.lines ?? [];
  return (
    <section className="pb-20 pt-8 md:pt-12">
      <div className="page">
        <h1 className="h-display mb-8 text-3xl font-semibold md:text-4xl">{t('cart.title')}</h1>
        {!cartReady ? (
          <div className="space-y-4">
            {[0, 1].map((i) => (
              <div key={i} className="skeleton h-28 rounded-card" />
            ))}
          </div>
        ) : lines.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-card bg-surface px-6 py-20 text-center">
            <ShoppingBag size={34} className="text-muted" />
            <p className="text-xl font-semibold">{t('cart.empty')}</p>
            <p className="text-muted">{t('cart.emptyText')}</p>
            <Link href={href('/collections/all')} className="btn btn-primary mt-4">
              {t('cart.continue')}
            </Link>
          </div>
        ) : (
          <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
            <div>
              {freeShippingBar && <FreeShippingBar cart={cart!} />}
              <div className="mt-2 divide-y divide-line border-b border-line">
                {lines.map((l) => (
                  <LineItem key={l.lineId} line={l} />
                ))}
              </div>
              {notes && <CartNote />}
              <Link href={href('/collections/all')} className="mt-6 inline-block text-[14px] font-medium underline underline-offset-4">
                {t('cart.continue')}
              </Link>
            </div>
            <aside className="h-fit rounded-card bg-surface p-6 lg:sticky lg:top-28">
              <div className="space-y-2 text-[15px]">
                <div className="flex justify-between">
                  <span>{t('cart.subtotal')}</span>
                  <span className="tabular-nums">{money(cart!.subtotal)}</span>
                </div>
                {cart!.discount > 0 && (
                  <div className="flex justify-between text-ok">
                    <span>
                      {t('cart.discount')} {cart!.coupon ? `(${cart!.coupon.code})` : ''}
                    </span>
                    <span>-{money(cart!.discount)}</span>
                  </div>
                )}
              </div>
              {coupon && <CouponBox />}
              <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
                <span className="font-semibold">{t('checkout.total')}</span>
                <span className="text-2xl font-semibold tabular-nums">{money(cart!.subtotal - cart!.discount)}</span>
              </div>
              <p className="mt-1 text-[12.5px] text-muted">{t('cart.taxNote')}</p>
              <Link href={href('/checkout')} className="btn btn-primary btn-lg btn-block mt-5">
                {t('cart.checkout')}
              </Link>
              <p className="mt-4 flex items-center justify-center gap-1.5 text-[12.5px] text-muted">
                <ShieldCheck size={14} /> {t('checkout.secureNote')}
              </p>
            </aside>
          </div>
        )}
      </div>
    </section>
  );
}
