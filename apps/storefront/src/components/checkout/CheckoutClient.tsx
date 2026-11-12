'use client';

/**
 * One-page checkout: contact → address (Pakistani city list) → delivery
 * rate → payment (COD / JazzCash / Easypaisa / card through Nafaa's
 * gateways) → discount code → notes → place order.
 *
 * The cart is saved as the shopper types (contact first), so an unfinished
 * checkout shows up in Abandoned carts. Prices always come from the server:
 * the order is placed with the total the shopper saw (expectedTotal) and the
 * API refuses it if anything changed.
 */
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, Banknote, ChevronDown, CreditCard, Loader2, Lock, ShieldCheck, Tag, Wallet, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Cart, CheckoutResult, PaymentCode, ShippingRate } from '@/lib/api';
import { isPkMobile } from '@/lib/format';
import { provinceOf } from '@/lib/pk-cities';
import { readCookie, sf, SfError } from '@/lib/client/sf';
import { track } from '@/lib/client/track';
import { useStore } from '../providers/StoreProvider';
import { CitySelect } from './CitySelect';

type Errors = Partial<Record<'phone' | 'name' | 'email' | 'city' | 'address' | 'postalCode' | 'rate', string>>;

const PAY_ICON: Record<PaymentCode, typeof Banknote> = { COD: Banknote, JAZZCASH: Wallet, EASYPAISA: Wallet, SAFEPAY: CreditCard };

export function CheckoutClient() {
  const { cart, cartReady, setCart, t, money, href, shop } = useStore();
  const router = useRouter();
  const cs = shop.checkout;
  const [form, setForm] = useState({ phone: '', name: '', email: '', city: '', province: '', address: '', landmark: '', postalCode: '', notes: '', marketing: true, hp: '' });
  const [rates, setRates] = useState<ShippingRate[] | null>(null);
  const [rateId, setRateId] = useState<string>('');
  const [noDelivery, setNoDelivery] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentCode>(shop.payments.find((p) => p.code === 'COD') ? 'COD' : shop.payments[0]?.code ?? 'COD');
  const [coupon, setCoupon] = useState('');
  const [couponMsg, setCouponMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [placing, setPlacing] = useState(false);
  const [fatal, setFatal] = useState<string | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const started = useRef(false);
  const [loggedIn, setLoggedIn] = useState(true);
  useEffect(() => setLoggedIn(!!readCookie('nafaa_customer_in')), []);

  useEffect(() => {
    document.body.classList.add('nf-bar');
    return () => document.body.classList.remove('nf-bar');
  }, []);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Prefill from a recovered cart.
  useEffect(() => {
    if (!cart) return;
    setForm((f) => ({
      ...f,
      phone: f.phone || cart.contact.phone || '',
      name: f.name || cart.contact.name || '',
      email: f.email || cart.contact.email || '',
      city: f.city || cart.address.city || '',
      address: f.address || cart.address.address || '',
      landmark: f.landmark || cart.address.landmark || '',
      notes: f.notes || cart.notes || '',
    }));
    if (cart.coupon) setCoupon(cart.coupon.code);
    if (!started.current && cart.lines.length) {
      started.current = true;
      track('checkout_started', { value: cart.subtotal, contentIds: cart.lines.map((l) => l.productId) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart?.token]);

  // Notes written on the cart page travel with the order even when checkout has no notes box.
  const notesOf = (f: typeof form) => (cs.notes ? f.notes : f.notes || cart?.notes || '').trim();

  const set = (k: keyof typeof form, v: string | boolean) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k as keyof Errors]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  // Save contact + address to the cart (abandoned-cart recovery), debounced.
  const saveDraft = (f = form) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (!isPkMobile(f.phone) && !/^\S+@\S+\.\S+$/.test(f.email)) return;
      sf<{ cart: Cart | null }>('cart.patch', {
        contact: { name: f.name || null, phone: f.phone || null, email: f.email || null },
        address: { address: f.address || null, city: f.city || null, province: f.province || null, landmark: f.landmark || null, postalCode: f.postalCode || null },
        notes: notesOf(f) || null,
      })
        .then((r) => r.cart && setCart(r.cart))
        .catch(() => undefined);
    }, 700);
  };

  // Delivery rates for the chosen city.
  useEffect(() => {
    if (!form.city || !cart?.lines.length) return;
    let live = true;
    setRates(null);
    setNoDelivery(null);
    sf<{ rates: ShippingRate[]; reason?: string | null }>('shipping', { city: form.city, province: form.province })
      .then((r) => {
        if (!live) return;
        setRates(r.rates);
        if (!r.rates.length) setNoDelivery(r.reason || t('checkout.notAvailableCity'));
        const keep = r.rates.find((x) => x.id === rateId) ?? r.rates[0];
        setRateId(keep?.id ?? '');
      })
      .catch(() => live && setRates([]));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.city, cart?.itemCount]);

  const rate = rates?.find((r) => r.id === rateId) ?? null;
  const subtotal = cart?.subtotal ?? 0;
  const discount = cart?.discount ?? 0;
  const codBlocked = !!cs.maxCodOrder && subtotal - discount > cs.maxCodOrder;
  const methodOk = (code: PaymentCode) => (code === 'COD' ? (rate ? rate.codAvailable : true) && !codBlocked : true);

  useEffect(() => {
    if (!methodOk(method)) {
      const first = shop.payments.find((p) => methodOk(p.code));
      if (first) setMethod(first.code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rate, codBlocked]);

  // Tell the cart the chosen rate and method so its totals are exact.
  useEffect(() => {
    if (!rateId || !cart) return;
    sf<{ cart: Cart | null }>('cart.patch', { shippingRateId: rateId, paymentMethod: method, address: { city: form.city || null, province: form.province || null } })
      .then((r) => r.cart && setCart(r.cart))
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rateId, method]);

  const shipping = cart?.shipping && cart.shipping.rateId === rateId ? cart.shipping.price : rate?.price ?? 0;
  const codFee = method === 'COD' ? (cart?.shipping?.rateId === rateId ? cart?.codFee ?? 0 : rate?.codFee ?? 0) : 0;
  const total = cart?.shipping?.rateId === rateId && cart.paymentMethod === method ? cart.total : subtotal - discount + shipping + codFee;
  const belowMin = !!cs.minOrder && subtotal - discount < cs.minOrder;

  const validate = (): boolean => {
    const e: Errors = {};
    if (!isPkMobile(form.phone)) e.phone = t('checkout.phoneInvalid');
    if (form.name.trim().length < 2) e.name = t('checkout.required');
    if (cs.fields.email === 'required' && !/^\S+@\S+\.\S+$/.test(form.email)) e.email = t('checkout.required');
    if (!form.city) e.city = t('checkout.required');
    if (form.address.trim().length < 6) e.address = t('checkout.required');
    if (cs.fields.postalCode === 'required' && !form.postalCode.trim()) e.postalCode = t('checkout.required');
    if (form.city && !rateId) e.rate = noDelivery || t('checkout.shippingPick');
    setErrors(e);
    const first = Object.keys(e)[0];
    if (first) document.getElementById(`f-${first}`)?.focus();
    return !first;
  };

  const place = async () => {
    setFatal(null);
    if (!cart || !validate()) return;
    setPlacing(true);
    try {
      const patched = await sf<{ cart: Cart | null }>('cart.patch', {
        contact: { name: form.name, phone: form.phone, email: form.email || null },
        address: { address: form.address, city: form.city, province: form.province || null, landmark: form.landmark || null, postalCode: form.postalCode || null },
        notes: notesOf(form) || null,
        shippingRateId: rateId,
        paymentMethod: method,
      });
      const c = patched.cart ?? cart;
      setCart(c);
      const res = await sf<CheckoutResult>('checkout', {
        expectedTotal: c.total,
        contact: { name: form.name.trim(), phone: form.phone.replace(/\s/g, ''), email: form.email || undefined },
        address: { address: form.address.trim(), city: form.city, province: form.province || undefined, postalCode: form.postalCode || undefined, landmark: form.landmark || undefined },
        shippingRateId: rateId,
        paymentMethod: method,
        notes: notesOf(form) || undefined,
        acceptsMarketing: cs.marketingOptIn ? form.marketing : false,
        hp: form.hp,
      });
      track('purchase', { value: res.total, orderNumber: res.orderNumber, contentIds: c.lines.map((l) => l.productId) });
      try {
        sessionStorage.setItem(`nf_purchase_${res.orderToken}`, '1');
      } catch {
        /* ignore */
      }
      setCart(null);
      if (res.payment.required && res.payment.url) {
        window.location.href = res.payment.url;
        return;
      }
      router.push(href(`/orders/${encodeURIComponent(res.orderToken)}`));
    } catch (e) {
      if (e instanceof SfError) {
        if (e.code === 'PRICE_CHANGED' && e.body?.cart) setCart(e.body.cart as Cart);
        if (e.code === 'OUT_OF_STOCK') await sf<{ cart: Cart | null }>('cart.get').then((r) => setCart(r.cart)).catch(() => undefined);
        setFatal(e.message || t('checkout.error'));
      } else setFatal(t('checkout.error'));
      setPlacing(false);
    }
  };

  const applyCoupon = async (code: string | null) => {
    setCouponMsg(null);
    try {
      const r = await sf<{ ok: boolean; message: string; cart: Cart | null }>('cart.coupon', { code: code ?? '' });
      if (r.cart) setCart(r.cart);
      if (code) setCouponMsg({ ok: r.ok, text: r.message });
      else setCoupon('');
    } catch (e) {
      setCouponMsg({ ok: false, text: e instanceof SfError ? e.message : t('common.error') });
    }
  };

  const lines = cart?.lines ?? [];
  const summary = useMemo(
    () => (
      <div>
        <ul className="divide-y divide-line">
          {lines.map((l) => (
            <li key={l.lineId} className="flex items-center gap-3 py-3">
              <span className="relative h-16 w-14 shrink-0 rounded-[10px] bg-bg ring-1 ring-line">
                {l.image && <Image src={l.image} alt="" fill sizes="56px" className="rounded-[10px] object-cover" />}
                <span className="absolute -end-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-fg/80 px-1 text-[11px] font-bold text-bg">{l.quantity}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 text-[14px] font-medium leading-snug">{l.title}</span>
                {l.variantTitle && <span className="block text-[12.5px] text-muted">{l.variantTitle}</span>}
                {l.problem && <span className="block text-[12px] text-sale">{t('cart.unavailable')}</span>}
              </span>
              <span className="text-[14px] font-medium tabular-nums">{money(l.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 border-t border-line pt-4">
          {cart?.coupon ? (
            <div className="flex items-center justify-between rounded-input bg-ok/10 px-3 py-2.5 text-[14px] text-ok">
              <span className="flex items-center gap-2 font-semibold">
                <Tag size={15} /> {cart.coupon.code}
                <span className="font-normal">· {cart.coupon.message}</span>
              </span>
              <button type="button" onClick={() => applyCoupon(null)} aria-label={t('checkout.removeCoupon')}>
                <X size={16} />
              </button>
            </div>
          ) : (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (coupon.trim()) void applyCoupon(coupon.trim());
              }}
            >
              <input className="field !min-h-[46px] flex-1 uppercase" placeholder={t('checkout.coupon')} value={coupon} onChange={(e) => setCoupon(e.target.value)} autoComplete="off" />
              <button type="submit" className="btn btn-outline !min-h-[46px]" disabled={!coupon.trim()}>
                {t('checkout.apply')}
              </button>
            </form>
          )}
          {couponMsg && !(couponMsg.ok && cart?.coupon) && <p className={`mt-2 text-[13px] ${couponMsg.ok ? 'text-ok' : 'text-sale'}`}>{couponMsg.text}</p>}
        </div>
        <dl className="mt-4 space-y-2 border-t border-line pt-4 text-[14.5px]">
          <div className="flex justify-between">
            <dt>{t('cart.subtotal')}</dt>
            <dd className="tabular-nums">{money(subtotal)}</dd>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-ok">
              <dt>{t('cart.discount')}</dt>
              <dd className="tabular-nums">-{money(discount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt>{t('checkout.shippingLine')}</dt>
            <dd className="tabular-nums">{rate ? (shipping === 0 ? <b className="text-ok">{t('checkout.free')}</b> : money(shipping)) : <span className="text-muted">—</span>}</dd>
          </div>
          {codFee > 0 && (
            <div className="flex justify-between">
              <dt>{t('checkout.codLine')}</dt>
              <dd className="tabular-nums">{money(codFee)}</dd>
            </div>
          )}
          <div className="flex items-baseline justify-between border-t border-line pt-3">
            <dt className="text-[16px] font-semibold">{t('checkout.total')}</dt>
            <dd className="text-[22px] font-semibold tabular-nums">{money(total)}</dd>
          </div>
        </dl>
      </div>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lines, cart, coupon, couponMsg, rate, shipping, codFee, total, discount, subtotal],
  );

  if (!cartReady) {
    return (
      <div className="page grid gap-8 py-10 lg:grid-cols-[1fr_420px]">
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-40 rounded-card" />
          ))}
        </div>
        <div className="skeleton h-80 rounded-card" />
      </div>
    );
  }
  if (!lines.length) {
    return (
      <div className="page flex flex-col items-center gap-3 py-24 text-center">
        <p className="text-xl font-semibold">{t('cart.empty')}</p>
        <Link href={href('/collections/all')} className="btn btn-primary mt-3">
          {t('cart.continue')}
        </Link>
      </div>
    );
  }
  if (cs.loginMode === 'required' && !loggedIn) {
    return (
      <div className="page flex flex-col items-center gap-4 py-24 text-center">
        <Lock size={28} className="text-muted" />
        <p className="max-w-sm text-[16px]">{t('checkout.loginRequired')}</p>
        <Link href={href('/account?next=/checkout')} className="btn btn-primary">
          {t('account.login')}
        </Link>
      </div>
    );
  }

  const fieldErr = (k: keyof Errors) => errors[k] && <p className="mt-1.5 flex items-center gap-1 text-[12.5px] text-sale"><AlertCircle size={13} /> {errors[k]}</p>;
  const payLabel = (code: PaymentCode, name: string) => (code === 'COD' ? t('checkout.cod') : code === 'JAZZCASH' ? t('checkout.jazzcash') : code === 'EASYPAISA' ? t('checkout.easypaisa') : code === 'SAFEPAY' ? t('checkout.card') : name);

  return (
    <div className="pb-24 lg:pb-16">
      {/* Phone: collapsible summary on top */}
      <div className="border-b border-line bg-surface lg:hidden">
        <button type="button" onClick={() => setSummaryOpen(!summaryOpen)} className="page flex h-14 items-center justify-between text-[14px] font-medium">
          <span className="flex items-center gap-1.5 text-primary">
            {summaryOpen ? t('checkout.hideSummary') : t('checkout.showSummary')} <ChevronDown size={16} className={summaryOpen ? 'rotate-180' : ''} />
          </span>
          <span className="text-[17px] font-semibold tabular-nums">{money(total)}</span>
        </button>
        {summaryOpen && <div className="page pb-5">{summary}</div>}
      </div>

      <div className="page grid gap-10 pt-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-14 lg:pt-12">
        <form
          className="space-y-9"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void place();
          }}
        >
          <h1 className="h-display text-2xl font-semibold md:text-3xl">{t('checkout.title')}</h1>

          <fieldset className="space-y-4">
            <legend className="mb-4 text-[17px] font-semibold">{t('checkout.contact')}</legend>
            <div>
              <label htmlFor="f-phone" className="label">{t('checkout.phone')}</label>
              <div className="relative">
                <span className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-[15px] text-muted" dir="ltr">🇵🇰</span>
                <input id="f-phone" className="field ps-11" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" placeholder="0300 1234567" value={form.phone} aria-invalid={!!errors.phone} onChange={(e) => set('phone', e.target.value)} onBlur={() => saveDraft()} />
              </div>
              {errors.phone ? fieldErr('phone') : <p className="mt-1.5 text-[12.5px] text-muted">{t('checkout.phoneHint')}</p>}
            </div>
            <div>
              <label htmlFor="f-name" className="label">{t('checkout.name')}</label>
              <input id="f-name" className="field" autoComplete="name" value={form.name} aria-invalid={!!errors.name} onChange={(e) => set('name', e.target.value)} onBlur={() => saveDraft()} />
              {fieldErr('name')}
            </div>
            {cs.fields.email !== 'hidden' && (
              <div>
                <label htmlFor="f-email" className="label">{cs.fields.email === 'required' ? t('checkout.email') : t('checkout.emailOptional')}</label>
                <input id="f-email" className="field" type="email" inputMode="email" autoComplete="email" dir="ltr" value={form.email} aria-invalid={!!errors.email} onChange={(e) => set('email', e.target.value)} onBlur={() => saveDraft()} />
                {fieldErr('email')}
              </div>
            )}
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="mb-4 text-[17px] font-semibold">{t('checkout.delivery')}</legend>
            <div>
              <label htmlFor="f-city" className="label">{t('checkout.city')}</label>
              <CitySelect
                id="f-city"
                value={form.city}
                invalid={!!errors.city}
                placeholder={t('checkout.cityPlaceholder')}
                onChange={(c) => {
                  const next = { ...form, city: c.name, province: provinceOf(c.name) ?? c.province };
                  setForm(next);
                  setErrors((e) => ({ ...e, city: undefined, rate: undefined }));
                  saveDraft(next);
                }}
              />
              {fieldErr('city')}
            </div>
            <div>
              <label htmlFor="f-address" className="label">{t('checkout.address')}</label>
              <textarea id="f-address" rows={2} className="field resize-none" autoComplete="street-address" placeholder={t('checkout.addressPlaceholder')} value={form.address} aria-invalid={!!errors.address} onChange={(e) => set('address', e.target.value)} onBlur={() => saveDraft()} />
              {fieldErr('address')}
            </div>
            {(cs.fields.landmark !== 'hidden' || cs.fields.postalCode !== 'hidden') && (
              <div className="grid gap-4 sm:grid-cols-2">
                {cs.fields.landmark !== 'hidden' && (
                  <div>
                    <label htmlFor="f-landmark" className="label">{t('checkout.landmark')}</label>
                    <input id="f-landmark" className="field" value={form.landmark} onChange={(e) => set('landmark', e.target.value)} />
                  </div>
                )}
                {cs.fields.postalCode !== 'hidden' && (
                  <div>
                    <label htmlFor="f-postalCode" className="label">{t('checkout.postal')}</label>
                    <input id="f-postalCode" className="field" inputMode="numeric" value={form.postalCode} aria-invalid={!!errors.postalCode} onChange={(e) => set('postalCode', e.target.value)} />
                    {fieldErr('postalCode')}
                  </div>
                )}
              </div>
            )}
          </fieldset>

          <fieldset>
            <legend className="mb-4 text-[17px] font-semibold">{t('checkout.shipping')}</legend>
            {!form.city ? (
              <p className="rounded-card bg-surface px-4 py-4 text-[14px] text-muted">{t('checkout.shippingPick')}</p>
            ) : rates === null ? (
              <div className="skeleton h-16 rounded-card" />
            ) : noDelivery ? (
              <p className="rounded-card bg-sale/10 px-4 py-4 text-[14px] text-sale">{noDelivery}</p>
            ) : (
              <div className="overflow-hidden rounded-card border border-line">
                {rates.map((r) => (
                  <label key={r.id} className={`flex cursor-pointer items-center gap-3 border-b border-line px-4 py-4 last:border-b-0 ${rateId === r.id ? 'bg-primary/5' : ''}`}>
                    <input type="radio" name="rate" className="h-[18px] w-[18px] accent-[rgb(var(--c-primary))]" checked={rateId === r.id} onChange={() => setRateId(r.id)} />
                    <span className="flex-1">
                      <span className="block text-[15px] font-medium">{r.name}</span>
                      {r.eta && <span className="block text-[13px] text-muted">{r.eta}</span>}
                    </span>
                    <span className="text-[15px] font-semibold tabular-nums">{r.price === 0 ? <span className="text-ok">{t('checkout.free')}</span> : money(r.price)}</span>
                  </label>
                ))}
              </div>
            )}
            {fieldErr('rate')}
          </fieldset>

          <fieldset>
            <legend className="mb-4 text-[17px] font-semibold">{t('checkout.payment')}</legend>
            <div className="overflow-hidden rounded-card border border-line">
              {shop.payments.map((p) => {
                const ok = methodOk(p.code);
                const Icon = PAY_ICON[p.code] ?? Wallet;
                const fee = p.code === 'COD' && rate && rate.codFee > 0 ? t('checkout.codFee', { fee: money(rate.codFee) }) : null;
                return (
                  <label key={p.code} className={`flex items-center gap-3 border-b border-line px-4 py-4 last:border-b-0 ${ok ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'} ${method === p.code ? 'bg-primary/5' : ''}`}>
                    <input type="radio" name="pay" className="h-[18px] w-[18px] accent-[rgb(var(--c-primary))]" disabled={!ok} checked={method === p.code} onChange={() => setMethod(p.code)} />
                    <span className="flex-1">
                      <span className="block text-[15px] font-medium">{payLabel(p.code, p.name)}</span>
                      <span className="block text-[13px] text-muted">{!ok ? t('checkout.notAvailableCity') : p.code === 'COD' ? t('checkout.codText') : t('checkout.walletText')}</span>
                    </span>
                    {fee && method === 'COD' && <span className="text-[12.5px] text-muted">{fee}</span>}
                    <Icon size={20} className="text-muted" />
                  </label>
                );
              })}
            </div>
          </fieldset>

          {cs.notes && (
            <div>
              <label htmlFor="f-notes" className="label">{t('checkout.notes')}</label>
              <textarea id="f-notes" rows={2} className="field resize-none" placeholder={t('checkout.notesPlaceholder')} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
            </div>
          )}
          <input className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.hp} onChange={(e) => set('hp', e.target.value)} />
          {cs.marketingOptIn && (
            <label className="flex items-center gap-2.5 text-[14px]">
              <input type="checkbox" className="h-[18px] w-[18px] accent-[rgb(var(--c-primary))]" checked={form.marketing} onChange={(e) => set('marketing', e.target.checked)} />
              {t('checkout.marketing')}
            </label>
          )}

          {fatal && (
            <p className="flex items-start gap-2 rounded-card bg-sale/10 px-4 py-3 text-[14px] text-sale">
              <AlertCircle size={18} className="mt-0.5 shrink-0" /> {fatal}
            </p>
          )}
          {belowMin && <p className="rounded-card bg-warn/10 px-4 py-3 text-[14px] text-warn">Minimum order {money(cs.minOrder)}</p>}

          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg p-3 lg:static lg:border-0 lg:p-0">
            <button type="submit" className="btn btn-primary btn-lg btn-block !min-h-[56px] text-[16px]" disabled={placing || belowMin || !!noDelivery}>
              {placing ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> {t('checkout.placing')}
                </>
              ) : method === 'COD' ? (
                `${t('checkout.place')} · ${money(total)}`
              ) : (
                t('checkout.placePay', { amount: money(total) })
              )}
            </button>
          </div>
          <p className="flex items-center justify-center gap-1.5 text-[12.5px] text-muted">
            <ShieldCheck size={14} /> {t('checkout.secureNote')}
            {cs.termsUrl && (
              <Link href={href(cs.termsUrl)} className="underline">
                {t('policy.terms')}
              </Link>
            )}
          </p>
        </form>

        <aside className="hidden h-fit rounded-card bg-surface p-6 lg:sticky lg:top-24 lg:block">
          <h2 className="mb-2 text-[17px] font-semibold">{t('checkout.summary')}</h2>
          {summary}
        </aside>
      </div>
    </div>
  );
}
