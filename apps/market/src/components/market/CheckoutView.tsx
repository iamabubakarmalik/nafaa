'use client';
/**
 * Checkout: address (saved or new with map pin), delivery / pickup / dine-in
 * (only what every shop in the cart offers), delivery time when a shop uses
 * slots, payment (methods the platform and every shop accept), coupon, note,
 * and totals from checkout/preview. 409 answers refresh the cart or the
 * total with a clear message instead of failing silently.
 */
import { AlertTriangle, Banknote, Check, CreditCard, MapPin, Plus, ShoppingCart, Tag, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { Button, ButtonLink, EmptyState, Input, Skeleton, Textarea, cn } from '@/components/ui';
import { ClientError, m } from '@/lib/client';
import { dateOnly, money } from '@/lib/format';
import type { Address, CheckoutPreview, DeliveryType, PaymentMethod, PlacedOrders, Slot } from '@/lib/types';
import { AddressSheet } from './AddressSheet';
import { readRx, saveRx } from './rx';

const CONFIG_TO_METHOD: Record<string, PaymentMethod> = { cod: 'COD', jazzcash: 'JAZZCASH', easypaisa: 'EASYPAISA', card: 'CARD', bankTransfer: 'BANK_TRANSFER' };
const METHOD_ICON: Partial<Record<PaymentMethod, typeof Banknote>> = { COD: Banknote, CARD: CreditCard, JAZZCASH: Wallet, EASYPAISA: Wallet, BANK_TRANSFER: Banknote, WALLET: Wallet };
const METHOD_KEY: Record<PaymentMethod, string> = { COD: 'checkout.cod', CARD: 'checkout.card', JAZZCASH: 'checkout.jazzcash', EASYPAISA: 'checkout.easypaisa', BANK_TRANSFER: 'checkout.bankTransfer', WALLET: 'checkout.cod' };

export function CheckoutView() {
  const app = useApp();
  const { t } = app;
  const router = useRouter();
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [addressId, setAddressId] = useState<string | undefined>();
  const [addOpen, setAddOpen] = useState(false);
  const [type, setType] = useState<DeliveryType>('DELIVERY');
  const [preview, setPreview] = useState<CheckoutPreview | null>(null);
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<string | undefined>();
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [notes, setNotes] = useState('');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cart = app.cart;
  const groups = useMemo(() => cart?.shopGroups ?? [], [cart]);
  const allBooking = groups.length > 0 && groups.every((g) => g.gate === 'BOOKING');

  const types = useMemo(() => {
    const out: DeliveryType[] = [];
    if (allBooking) return ['PICKUP'] as DeliveryType[];
    if (groups.every((g) => g.shop?.offersDelivery !== false)) out.push('DELIVERY');
    if (groups.every((g) => g.shop?.offersPickup)) out.push('PICKUP');
    if (groups.every((g) => g.shop?.offersDineIn && g.flow?.dineIn)) out.push('DINE_IN');
    return out.length ? out : (['DELIVERY'] as DeliveryType[]);
  }, [groups, allBooking]);

  useEffect(() => {
    if (!types.includes(type)) setType(types[0]!);
  }, [types, type]);

  const slotGroup = type === 'DELIVERY' ? groups.find((g) => g.flow?.deliverySlots) : undefined;
  const bookingSlot = useMemo(() => {
    for (const g of groups) for (const l of g.lines) if (typeof l.options?.bookingStart === 'string') return { start: l.options.bookingStart as string, end: String(l.options.bookingEnd ?? '') };
    return null;
  }, [groups]);

  // First load: cart and addresses.
  useEffect(() => {
    if (!app.signedIn) return;
    void app.refreshCart();
    m<Address[]>('addresses')
      .then((list) => {
        setAddresses(list);
        setAddressId(list.find((a) => a.isDefault)?.id ?? list[0]?.id);
      })
      .catch(() => setAddresses([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.signedIn]);

  const runPreview = useCallback(async () => {
    if (!groups.length) return;
    try {
      const p = await m<CheckoutPreview>('checkout/preview', { body: { addressId: type === 'DELIVERY' ? addressId : undefined, deliveryType: type, couponCode: coupon } });
      setPreview(p);
      if (coupon && p.couponError) {
        app.toast(p.couponError, 'error');
        setCoupon(undefined);
      }
    } catch (e) {
      setError(app.errorText(e));
    }
  }, [groups.length, type, addressId, coupon, app]);

  useEffect(() => {
    void runPreview();
  }, [runPreview, cart?.grandTotal]);

  useEffect(() => {
    setSlot(null);
    if (!slotGroup) return setSlots(null);
    m<Slot[]>('checkout/slots', { query: { shopId: slotGroup.shopId } }).then(setSlots).catch(() => setSlots([]));
  }, [slotGroup?.shopId]); // eslint-disable-line react-hooks/exhaustive-deps

  const methods = useMemo(() => {
    const allowed = new Set(app.payments.map((p) => CONFIG_TO_METHOD[p]).filter(Boolean));
    const list = (preview?.paymentMethods ?? []).filter((x) => x !== 'WALLET' && allowed.has(x));
    return list.length ? list : allowed.has('COD') ? (['COD'] as PaymentMethod[]) : [];
  }, [preview, app.payments]);

  useEffect(() => {
    if (!method || !methods.includes(method)) setMethod(methods[0] ?? null);
  }, [methods, method]);

  if (!app.signedIn) {
    return <EmptyState icon={<ShoppingCart />} title={t('common.signInToContinue')} action={<ButtonLink href={`${app.href('/login')}?next=${encodeURIComponent(app.href('/checkout'))}`}>{t('common.signIn')}</ButtonLink>} />;
  }
  if (cart && !groups.length) {
    return <EmptyState icon={<ShoppingCart />} title={t('checkout.empty')} action={<ButtonLink href={app.href('/')}>{t('cart.browse')}</ButtonLink>} />;
  }
  if (!cart || addresses === null) {
    return (
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4"><Skeleton className="h-36 rounded-2xl" /><Skeleton className="h-28 rounded-2xl" /><Skeleton className="h-28 rounded-2xl" /></div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  const place = async () => {
    setError(null);
    if (type === 'DELIVERY' && !addressId) return setError(t('checkout.pickAddress'));
    if (slotGroup && slots?.length && !slot) return setError(t('checkout.slotRequired', { shop: slotGroup.shop?.publicName ?? '' }));
    const rx = readRx();
    const needRx = groups.filter((g) => g.needsPrescription);
    if (needRx.some((g) => !rx[g.shopId])) return setError(t('checkout.rxMissing'));
    if (!method) return;
    const chosenSlot = slot ? { start: slot.start, end: slot.end } : allBooking && bookingSlot ? bookingSlot : null;
    setPlacing(true);
    try {
      const res = await m<PlacedOrders>('checkout/place', {
        body: {
          addressId: type === 'DELIVERY' ? addressId : undefined,
          deliveryType: type,
          paymentMethod: method,
          couponCode: coupon,
          customerNotes: notes.trim() || undefined,
          deliverySlotStart: chosenSlot?.start,
          deliverySlotEnd: chosenSlot?.end || undefined,
          attachments: needRx.map((g) => ({ kind: 'prescription', url: rx[g.shopId], shopId: g.shopId })),
          expectedTotal: preview?.finalTotal,
        },
      });
      needRx.forEach((g) => saveRx(g.shopId, null));
      app.setCart(null);
      void app.refreshCart();
      const first = res.orders[0];
      router.replace(res.orders.length === 1 && first ? `${app.href(`/orders/${first.id}`)}?placed=1` : `${app.href('/orders')}?placed=${res.orders.length}`);
    } catch (e) {
      if (e instanceof ClientError && e.status === 401) return void app.requireSignIn();
      if (e instanceof ClientError && e.code === 'OUT_OF_STOCK') {
        app.toast(t('checkout.changed'), 'error');
        await app.refreshCart();
        router.push(app.href('/cart'));
        return;
      }
      if (e instanceof ClientError && e.code === 'PRICE_CHANGED') {
        setError(t('checkout.priceChanged'));
        await app.refreshCart();
        await runPreview();
        return;
      }
      setError(app.errorText(e));
    } finally {
      setPlacing(false);
    }
  };

  const typeLabel = (x: DeliveryType) => (x === 'DELIVERY' ? t('checkout.delivery') : x === 'PICKUP' ? t('checkout.pickup') : t('checkout.dineIn'));
  const slotDays = [...new Set((slots ?? []).map((s) => s.date))];

  return (
    <div className="grid gap-4 pb-28 lg:grid-cols-[1fr_360px] lg:items-start lg:pb-0">
      <div className="space-y-4">
        {!allBooking && types.length > 1 && (
          <section className="card p-4">
            <h2 className="mb-3 font-bold text-gray-900">{t('checkout.howToGet')}</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {types.map((x) => (
                <button key={x} type="button" aria-pressed={type === x} onClick={() => setType(x)} className={cn('rounded-xl px-3 py-3 text-sm font-semibold ring-1', type === x ? 'bg-brand-50 text-brand-800 ring-brand-500' : 'bg-white text-gray-800 ring-gray-200')}>
                  {typeLabel(x)}
                </button>
              ))}
            </div>
          </section>
        )}

        {type === 'DELIVERY' && (
          <section className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">{t('checkout.address')}</h2>
              <button type="button" onClick={() => setAddOpen(true)} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700"><Plus className="h-4 w-4" />{t('checkout.addAddress')}</button>
            </div>
            {addresses.length ? (
              <div className="space-y-2">
                {addresses.map((a) => (
                  <label key={a.id} className={cn('flex cursor-pointer items-start gap-3 rounded-xl p-3 ring-1', addressId === a.id ? 'bg-brand-50 ring-brand-500' : 'bg-white ring-gray-200')}>
                    <input type="radio" name="addr" checked={addressId === a.id} onChange={() => setAddressId(a.id)} className="mt-1 accent-brand-600" />
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                    <span className="min-w-0 text-sm">
                      <span className="block font-semibold text-gray-900">{a.label}</span>
                      <span className="block text-gray-600">{[a.addressLine1, a.area, a.city].filter(Boolean).join(', ')}</span>
                      <span className="num block text-xs text-gray-500">{a.fullName} · {a.phone}</span>
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <button type="button" onClick={() => setAddOpen(true)} className="flex w-full items-center gap-3 rounded-xl border-2 border-dashed border-gray-300 p-4 text-start text-sm text-gray-600 hover:border-brand-400">
                <MapPin className="h-5 w-5 text-brand-600" />
                {t('checkout.noAddress')}
              </button>
            )}
          </section>
        )}

        {slotGroup && (
          <section className="card p-4">
            <h2 className="mb-1 font-bold text-gray-900">{t('checkout.slot')}</h2>
            <p className="mb-3 text-xs text-gray-500">{slotGroup.shop?.publicName}</p>
            {slots === null ? (
              <Skeleton className="h-11" />
            ) : !slots.length ? (
              <p className="text-sm text-gray-600">{t('shop.noSlots')}</p>
            ) : (
              <div className="space-y-3">
                {slotDays.map((d) => (
                  <div key={d}>
                    <p className="mb-1.5 text-xs font-semibold text-gray-700">{dateOnly(`${d}T12:00:00+05:00`, app.lang)}</p>
                    <div className="scroll-x">
                      {slots.filter((s) => s.date === d).map((s) => (
                        <button key={s.start} type="button" aria-pressed={slot?.start === s.start} onClick={() => setSlot(s)} className={cn('num shrink-0 rounded-xl px-3 py-2 text-sm font-semibold ring-1', slot?.start === s.start ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-gray-800 ring-gray-200')}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="card p-4">
          <h2 className="mb-3 font-bold text-gray-900">{t('checkout.payment')}</h2>
          <div className="space-y-2">
            {methods.map((x) => {
              const Icon = METHOD_ICON[x] ?? Banknote;
              return (
                <label key={x} className={cn('flex cursor-pointer items-center gap-3 rounded-xl p-3 ring-1', method === x ? 'bg-brand-50 ring-brand-500' : 'bg-white ring-gray-200')}>
                  <input type="radio" name="pay" checked={method === x} onChange={() => setMethod(x)} className="accent-brand-600" />
                  <Icon className="h-5 w-5 text-gray-600" />
                  <span className="text-sm">
                    <span className="block font-semibold text-gray-900">{t(METHOD_KEY[x])}</span>
                    {x === 'COD' && <span className="block text-xs text-gray-500">{t('checkout.codSub')}</span>}
                  </span>
                </label>
              );
            })}
          </div>
        </section>

        <section className="card space-y-4 p-4">
          <div>
            <label htmlFor="coupon" className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-gray-700"><Tag className="h-3.5 w-3.5" />{t('checkout.coupon')}</label>
            <div className="flex gap-2">
              <Input id="coupon" value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} maxLength={40} className="flex-1" autoComplete="off" />
              <Button variant="secondary" onClick={() => setCoupon(couponInput.trim() || undefined)} disabled={!couponInput.trim()}>{t('checkout.applyCoupon')}</Button>
            </div>
            {coupon && preview && !preview.couponError && preview.couponDiscount > 0 && (
              <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-green-700"><Check className="h-3.5 w-3.5" />{t('checkout.couponApplied')}</p>
            )}
          </div>
          <Textarea label={t('checkout.notes')} placeholder={t('checkout.notesPlaceholder')} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} rows={2} />
        </section>
      </div>

      <aside className="card sticky top-20 p-5">
        <h2 className="mb-3 font-bold text-gray-900">{t('checkout.summary')}</h2>
        <ul className="mb-3 space-y-2 border-b border-gray-100 pb-3 text-sm">
          {(preview?.shopBreakdown ?? []).map((b) => (
            <li key={b.shopId}>
              <div className="num flex justify-between gap-2 text-gray-800">
                <span className="truncate">{b.shop?.publicName} · {t('common.items', { n: b.itemCount })}</span>
                <span>{money(b.subtotal)}</span>
              </div>
              {b.errors.map((er) => <p key={er} className="mt-0.5 text-xs text-red-600">{er}</p>)}
            </li>
          ))}
        </ul>
        {preview ? (
          <dl className="num space-y-2 text-sm">
            <div className="flex justify-between text-gray-700"><dt>{t('common.subtotal')}</dt><dd>{money(preview.subtotal)}</dd></div>
            {type === 'DELIVERY' && <div className="flex justify-between text-gray-700"><dt>{t('checkout.deliveryFees')}</dt><dd>{preview.totalDeliveryFee ? money(preview.totalDeliveryFee) : t('common.free')}</dd></div>}
            {preview.totalDiscount > 0 && <div className="flex justify-between text-green-700"><dt>{t('common.discount')}</dt><dd>− {money(preview.totalDiscount)}</dd></div>}
            <div className="flex justify-between border-t border-gray-100 pt-2 text-lg font-extrabold text-gray-900"><dt>{t('common.total')}</dt><dd>{money(preview.finalTotal)}</dd></div>
          </dl>
        ) : (
          <Skeleton className="h-24" />
        )}
        {(error || preview?.warnings.length) ? (
          <p role="alert" className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 p-2.5 text-xs font-medium text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {error ?? preview?.warnings[0]}
          </p>
        ) : null}
        <div className="fixed inset-x-0 bottom-[var(--bottom-nav)] z-30 border-t border-gray-200 bg-white p-3 lg:static lg:mt-4 lg:border-0 lg:p-0">
          <Button block size="lg" loading={placing} disabled={!preview || !preview.canPlaceOrder || !method} onClick={place}>
            <span className="flex w-full items-center justify-between">
              <span>{placing ? t('checkout.placing') : t('checkout.place')}</span>
              {preview && <span className="num">{money(preview.finalTotal)}</span>}
            </span>
          </Button>
        </div>
      </aside>

      <AddressSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={(a) => {
          setAddresses((l) => [...(l ?? []).map((x) => (a.isDefault ? { ...x, isDefault: false } : x)), a]);
          setAddressId(a.id);
        }}
      />
    </div>
  );
}
