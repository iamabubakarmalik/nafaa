'use client';

/**
 * Optional shopper account: log in with a one-time code (SMS or email; the
 * API sends it), then see orders, saved addresses and returns/tracking
 * through Nafaa's customer portal.
 */
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronRight, Loader2, LogOut, MapPin, Package } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { AccountOrders, Address, StoreCustomer } from '@/lib/api';
import { formatDate, isPkMobile } from '@/lib/format';
import { sf, SfError } from '@/lib/client/sf';
import { useStore } from '../providers/StoreProvider';

interface AccountData {
  account: { customer: StoreCustomer; addresses: Address[] } | null;
  orders: AccountOrders | null;
}

export function AccountClient() {
  const { t, money, href, shop } = useStore();
  const router = useRouter();
  const next = useSearchParams().get('next');
  const [data, setData] = useState<AccountData | null>(null);
  const [mode, setMode] = useState<'sms' | 'email'>('sms');
  const [to, setTo] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState<{ devCode?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = () => sf<AccountData>('account').then(setData).catch(() => setData({ account: null, orders: null }));
  useEffect(() => {
    void load();
  }, []);

  const openPortal = async (orderToken: string) => {
    const r = await sf<{ url: string | null }>('portal', { orderToken }).catch(() => ({ url: null }));
    if (r.url) window.location.href = r.url;
    else router.push(href(`/orders/${encodeURIComponent(orderToken)}`));
  };

  if (!data) {
    return (
      <div className="page grid min-h-[50vh] place-items-center">
        <Loader2 className="animate-spin text-muted" />
      </div>
    );
  }

  if (!data.account) {
    return (
      <section className="page flex justify-center py-14 md:py-20">
        <div className="w-full max-w-md">
          <h1 className="h-display text-center text-3xl font-semibold">{t('account.login')}</h1>
          <p className="mt-2 text-center text-[15px] text-muted">{mode === 'sms' ? t('account.loginText') : t('account.loginTextEmail')}</p>
          <form
            className="mt-8 space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setErr(null);
              if (!sent) {
                if (mode === 'sms' ? !isPkMobile(to) : !/^\S+@\S+\.\S+$/.test(to)) return setErr(mode === 'sms' ? t('checkout.phoneInvalid') : t('checkout.required'));
                setBusy(true);
                try {
                  const r = await sf<{ sent: boolean; devCode?: string }>('otp', { channel: mode, to });
                  setSent({ devCode: r.devCode });
                } catch (x) {
                  setErr(x instanceof SfError ? x.message : t('common.error'));
                } finally {
                  setBusy(false);
                }
                return;
              }
              setBusy(true);
              try {
                await sf('verify', { to, code });
                if (next && next.startsWith('/') && !next.startsWith('//')) router.push(href(next));
                else await load();
              } catch (x) {
                setErr(x instanceof SfError ? x.message : t('common.error'));
              } finally {
                setBusy(false);
              }
            }}
          >
            <input
              className="field"
              dir="ltr"
              type={mode === 'sms' ? 'tel' : 'email'}
              inputMode={mode === 'sms' ? 'tel' : 'email'}
              placeholder={mode === 'sms' ? '0300 1234567' : 'you@example.com'}
              value={to}
              disabled={!!sent}
              onChange={(e) => setTo(e.target.value)}
            />
            {sent && (
              <>
                <input className="field text-center text-xl tracking-[0.5em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="••••••" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} autoFocus />
                {sent.devCode && <p className="text-center text-[12px] text-muted">Test code: {sent.devCode}</p>}
              </>
            )}
            {err && <p className="text-[13px] text-sale">{err}</p>}
            <button className="btn btn-primary btn-lg btn-block" disabled={busy || (!!sent && code.length < 4)}>
              {busy ? <Loader2 size={18} className="animate-spin" /> : sent ? t('account.verify') : t('account.sendCode')}
            </button>
            <button
              type="button"
              className="block w-full text-center text-[14px] underline underline-offset-4"
              onClick={() => {
                setMode(mode === 'sms' ? 'email' : 'sms');
                setSent(null);
                setTo('');
                setCode('');
                setErr(null);
              }}
            >
              {mode === 'sms' ? t('account.loginEmail') : t('account.loginPhone')}
            </button>
          </form>
          <Link href={href('/account/track')} className="mt-10 flex items-center justify-between rounded-card border border-line px-4 py-4 text-[15px] font-medium hover:bg-surface">
            <span className="flex items-center gap-2">
              <Package size={18} /> {t('account.trackTitle')}
            </span>
            <ChevronRight size={18} className="rtl:rotate-180" />
          </Link>
        </div>
      </section>
    );
  }

  const { customer, addresses } = data.account;
  const orders = data.orders?.items ?? [];
  return (
    <section className="page py-10 md:py-14">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="h-display text-3xl font-semibold">{t('account.title')}</h1>
          <p className="mt-1 text-muted">{customer.name || customer.phone || customer.email}</p>
        </div>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={async () => {
            await sf('logout');
            setData({ account: null, orders: null });
          }}
        >
          <LogOut size={15} /> {t('account.logout')}
        </button>
      </div>
      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div>
          <h2 className="mb-4 text-lg font-semibold">{t('account.orders')}</h2>
          {orders.length === 0 ? (
            <p className="rounded-card bg-surface px-5 py-10 text-center text-muted">{t('account.noOrders')}</p>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-card border border-line">
              {orders.map((o) => (
                <li key={o.orderToken}>
                  <button type="button" onClick={() => openPortal(o.orderToken)} className="flex w-full items-center gap-4 px-5 py-4 text-start hover:bg-surface">
                    <span className="flex-1">
                      <span className="block font-semibold">{o.orderNumber}</span>
                      <span className="block text-[13px] text-muted">
                        {formatDate(o.createdAt, shop.lang)} · {t('cart.items', { n: o.itemCount })}
                      </span>
                    </span>
                    <span className="badge bg-surface text-fg">{o.statusLabel}</span>
                    <span className="w-24 text-end font-semibold tabular-nums">{money(o.total)}</span>
                    <ChevronRight size={18} className="text-muted rtl:rotate-180" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h2 className="mb-4 text-lg font-semibold">{t('account.addresses')}</h2>
          {addresses.length === 0 ? (
            <p className="rounded-card bg-surface px-5 py-8 text-center text-[14px] text-muted">{t('account.noAddresses')}</p>
          ) : (
            <ul className="space-y-3">
              {addresses.map((a) => (
                <li key={a.id} className="rounded-card border border-line p-4 text-[14px]">
                  <p className="flex items-center gap-2 font-semibold">
                    <MapPin size={15} /> {a.name}
                    {a.default && <span className="badge bg-primary/10 text-primary">{t('account.default')}</span>}
                  </p>
                  <p className="mt-1 text-muted">
                    {a.address}, {a.city}
                  </p>
                  <p className="text-muted" dir="ltr">
                    {a.phone}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
