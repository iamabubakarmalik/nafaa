'use client';
/**
 * Cart: one card per shop with its minimum-order progress, delivery fee,
 * line problems (stock, price changes) and the prescription photo when the
 * shop needs one. Checkout opens only when every shop's order can go.
 */
import { AlertTriangle, Camera, CheckCircle2, ChevronRight, FileText, ShoppingCart, Store, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { ButtonLink, EmptyState, Img, Skeleton, Stepper, cn } from '@/components/ui';
import { initials, money } from '@/lib/format';
import { GATE_LOOK } from '@/lib/site';
import type { CartGroup, CartLine } from '@/lib/types';
import { GateIcon } from './GateIcon';
import { readRx, saveRx, uploadPrescription } from './rx';
import { useCart } from './useCart';

export function optionText(l: Pick<CartLine, 'options' | 'notes' | 'modifiers'>): string {
  const o = l.options ?? {};
  const parts: string[] = [];
  for (const s of l.modifiers?.summary ?? []) if (s.options.length) parts.push(s.options.join(', '));
  if (typeof o.bookingLabel === 'string') parts.push(o.bookingLabel);
  for (const k of ['cakeWeight', 'cakeFlavour', 'cakeMessage', 'cakeDate', 'giftMessage', 'deliveryDate'] as const) if (typeof o[k] === 'string') parts.push(String(o[k]));
  if (l.notes) parts.push(l.notes);
  return parts.join(' · ');
}

export function CartView() {
  const app = useApp();
  const { t } = app;
  const [loaded, setLoaded] = useState(false);
  const [rx, setRx] = useState<Record<string, string>>({});

  useEffect(() => {
    setRx(readRx());
    if (!app.signedIn) {
      setLoaded(true);
      return;
    }
    app.refreshCart().finally(() => setLoaded(true));
    // Load once per visit; later changes come through the cart actions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.signedIn]);

  if (!app.signedIn && loaded) {
    return (
      <EmptyState
        icon={<ShoppingCart />}
        title={t('cart.signInTitle')}
        body={t('cart.signInSub')}
        action={<ButtonLink href={`${app.href('/login')}?next=${encodeURIComponent(app.href('/cart'))}`}>{t('common.signIn')}</ButtonLink>}
      />
    );
  }
  const cart = app.cart;
  if (!loaded || (!cart && app.signedIn)) {
    return (
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4"><Skeleton className="h-56 rounded-2xl" /><Skeleton className="h-40 rounded-2xl" /></div>
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }
  if (!cart || !cart.shopGroups.length) {
    return <EmptyState icon={<ShoppingCart />} title={t('cart.empty')} body={t('cart.emptySub')} action={<ButtonLink href={app.href('/')}>{t('cart.browse')}</ButtonLink>} />;
  }

  const rxMissing = cart.shopGroups.some((g) => g.needsPrescription && !rx[g.shopId]);
  const blocked = cart.hasProblems || cart.shopGroups.some((g) => !g.meetsMinOrder) || rxMissing;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px] lg:items-start">
      <div className="space-y-4">
        {cart.shopGroups.length > 1 && <p className="text-sm text-gray-600">{t('cart.separate', { n: cart.shopGroups.length })}</p>}
        {cart.shopGroups.map((g) => (
          <GroupCard key={g.shopId} group={g} rxUrl={rx[g.shopId]} onRx={(url) => { saveRx(g.shopId, url); setRx(readRx()); }} />
        ))}
      </div>
      <aside className="card sticky top-20 p-5">
        <dl className="num space-y-2 text-sm">
          <div className="flex justify-between text-gray-700"><dt>{t('common.subtotal')}</dt><dd>{money(cart.subtotal)}</dd></div>
          <div className="flex justify-between text-gray-700"><dt>{t('checkout.deliveryFees')}</dt><dd>{cart.totalDeliveryFee ? money(cart.totalDeliveryFee) : t('common.free')}</dd></div>
          <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-bold text-gray-900"><dt>{t('common.total')}</dt><dd>{money(cart.grandTotal)}</dd></div>
        </dl>
        {blocked && (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-2.5 text-xs text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {rxMissing && !cart.hasProblems ? t('checkout.rxMissing') : t('cart.fixProblems')}
          </p>
        )}
        <div className="fixed inset-x-0 bottom-[var(--bottom-nav)] z-30 border-t border-gray-200 bg-white p-3 lg:static lg:mt-4 lg:border-0 lg:p-0">
          <ButtonLink href={app.href('/checkout')} block size="lg" aria-disabled={blocked} className={cn(blocked && 'pointer-events-none opacity-50')}>
            <span className="flex w-full items-center justify-between">
              <span>{t('cart.checkout')}</span>
              <span className="num">{money(cart.grandTotal)}</span>
            </span>
          </ButtonLink>
        </div>
      </aside>
    </div>
  );
}

function GroupCard({ group: g, rxUrl, onRx }: { group: CartGroup; rxUrl?: string; onRx: (url: string | null) => void }) {
  const app = useApp();
  const { t } = app;
  const cart = useCart();
  const color = g.gate ? GATE_LOOK[g.gate].color : '#9333ea';
  const pct = g.minOrderAmount > 0 ? Math.min(100, Math.round((g.subtotal / g.minOrderAmount) * 100)) : 100;

  return (
    <section className="card overflow-hidden">
      <Link href={app.href(`/shop/${g.shop?.slug ?? ''}`)} className="flex items-center gap-3 border-b border-gray-100 p-4 hover:bg-gray-50">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-bold" style={{ background: `${color}1a`, color }}>
          {g.shop ? initials(g.shop.publicName) : <Store className="h-5 w-5" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold text-gray-900">{g.shop?.publicName}</span>
          <span className="num block text-xs text-gray-500">
            {[t('common.items', { n: g.itemCount }), g.shop?.estimatedDeliveryMinutes ? t('common.eta', { min: g.shop.estimatedDeliveryMinutes }) : null, g.shop && !g.shop.isOpen ? t('common.closed') : null].filter(Boolean).join(' · ')}
          </span>
        </span>
        <ChevronRight className="h-4 w-4 text-gray-400 rtl:rotate-180" />
      </Link>

      {g.minOrderAmount > 0 && (
        <div className="px-4 pt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
            <div className={cn('h-full rounded-full transition-all', g.meetsMinOrder ? 'bg-green-500' : 'bg-brand-500')} style={{ width: `${pct}%` }} />
          </div>
          <p className={cn('num mt-1.5 text-xs font-medium', g.meetsMinOrder ? 'text-green-700' : 'text-gray-600')}>
            {g.meetsMinOrder ? t('cart.minMet') : t('cart.minProgress', { amount: money(g.minOrderAmount - g.subtotal) })}
          </p>
        </div>
      )}

      <ul className="divide-y divide-gray-100 px-4">
        {g.lines.map((l) => {
          const extra = optionText(l);
          return (
            <li key={l.id} className="flex gap-3 py-3">
              <Img src={l.imageUrl} alt={l.productName} color={color} sizes="64px" className="h-16 w-16 shrink-0 rounded-xl" fallback={g.gate ? <GateIcon gate={g.gate} className="h-6 w-6 opacity-50" /> : null} />
              <div className="min-w-0 flex-1">
                <Link href={app.href(`/p/${l.productId}`)} className="line-clamp-2 text-sm font-semibold text-gray-900 hover:text-brand-700">{l.productName}</Link>
                {(l.variantName || extra) && <p className="line-clamp-2 text-xs text-gray-500">{[l.variantName, extra].filter(Boolean).join(' · ')}</p>}
                {l.requiresPrescription && <span className="mt-0.5 inline-block rounded bg-red-100 px-1.5 text-2xs font-bold text-red-700">{t('common.rx')}</span>}
                {l.priceChanged && <p className="num text-xs text-amber-700">{t('cart.priceChanged', { old: money(l.savedPrice) })}</p>}
                {l.problemText && <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-red-600"><AlertTriangle className="h-3.5 w-3.5" />{l.problemText}</p>}
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="num text-sm font-bold text-gray-900">{money(l.lineTotal)}</span>
                  {l.problem === 'OUT_OF_STOCK' || l.problem === 'NOT_LISTED' || l.problem === 'HIDDEN' || l.problem === 'OPTIONS' ? (
                    <button type="button" onClick={() => cart.remove(l)} className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline"><Trash2 className="h-4 w-4" />{t('common.remove')}</button>
                  ) : (
                    <Stepper value={l.quantity} max={Math.max(l.maxQty, 1)} size="sm" trashAtOne busy={cart.busy === l.productId} onChange={(v) => cart.setQty(l, v)} />
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {g.needsPrescription && <RxBlock shopName={g.shop?.publicName ?? ''} url={rxUrl} onChange={onRx} />}

      <dl className="num space-y-1.5 border-t border-gray-100 bg-gray-50/60 px-4 py-3 text-sm">
        <div className="flex justify-between text-gray-600">
          <dt>{t('cart.fee')}</dt>
          <dd>{g.deliveryFee ? money(g.deliveryFee) : t('common.free')}</dd>
        </div>
        {g.shop?.freeDeliveryAbove && g.deliveryFee > 0 ? <p className="text-xs text-brand-700">{t('cart.freeFrom', { amount: money(g.shop.freeDeliveryAbove) })}</p> : null}
        <div className="flex justify-between font-bold text-gray-900"><dt>{t('cart.shopTotal')}</dt><dd>{money(g.shopTotal)}</dd></div>
      </dl>
    </section>
  );
}

function RxBlock({ shopName, url, onChange }: { shopName: string; url?: string; onChange: (url: string | null) => void }) {
  const app = useApp();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const pick = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await uploadPrescription(file));
    } catch {
      app.toast(app.t('cart.uploadFailed'), 'error');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };
  return (
    <div className={cn('mx-4 mb-3 rounded-2xl p-3 ring-1', url ? 'bg-green-50 ring-green-200' : 'bg-red-50 ring-red-200')}>
      <div className="flex items-start gap-3">
        {url ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" /> : <FileText className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-900">{url ? app.t('cart.rxUploaded') : app.t('cart.rxTitle')}</p>
          {!url && <p className="text-xs text-gray-700">{app.t('cart.rxBody', { shop: shopName })}</p>}
        </div>
        <button type="button" disabled={busy} onClick={() => input.current?.click()} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-bold text-gray-900 shadow-card ring-1 ring-gray-200 disabled:opacity-60">
          <Camera className="h-4 w-4" />
          {busy ? app.t('cart.rxUploading') : url ? app.t('cart.rxChange') : app.t('cart.rxUpload')}
        </button>
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" capture="environment" hidden onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  );
}
