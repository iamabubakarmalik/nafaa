'use client';
/**
 * Account: profile, addresses, saved items, followed shops, notifications,
 * language and theme, sign out and account deletion.
 */
import { Bell, ChevronRight, Heart, LogOut, MapPin, Moon, Store, Trash2, UserRound } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { applyTheme, readTheme, type ThemePref } from '@/components/layout/Prefs';
import { useApp } from '@/components/providers/AppProvider';
import { Badge, Button, ButtonLink, EmptyState, Input, Price, Sheet, Skeleton, cn } from '@/components/ui';
import { m } from '@/lib/client';
import { dateTime, initials } from '@/lib/format';
import { LANGS, switchLang } from '@/lib/i18n';
import type { Address, Customer, FollowedShop, NotificationItem, WishItem } from '@/lib/types';
import { AddressSheet } from './AddressSheet';

function Card({ icon, title, action, children }: { icon: ReactNode; title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-bold text-gray-900"><span className="text-brand-600 [&_svg]:h-5 [&_svg]:w-5">{icon}</span>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function AccountView() {
  const app = useApp();
  const { t } = app;
  const router = useRouter();
  const path = usePathname() || '/';
  const [me, setMe] = useState<Customer | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [wish, setWish] = useState<WishItem[] | null>(null);
  const [followed, setFollowed] = useState<FollowedShop[] | null>(null);
  const [notes, setNotes] = useState<NotificationItem[] | null>(null);
  const [theme, setTheme] = useState<ThemePref>('system');
  const [addOpen, setAddOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    setTheme(readTheme());
    if (!app.signedIn) return;
    m<Customer>('me').then((c) => { setMe(c); setName(c.fullName ?? ''); setEmail(c.email ?? ''); }).catch(() => undefined);
    m<Address[]>('addresses').then(setAddresses).catch(() => setAddresses([]));
    m<WishItem[]>('wishlist').then(setWish).catch(() => setWish([]));
    m<FollowedShop[]>('followed').then(setFollowed).catch(() => setFollowed([]));
    m<NotificationItem[]>('notifications').then(setNotes).catch(() => setNotes([]));
  }, [app.signedIn]);

  if (!app.signedIn) {
    return <EmptyState icon={<UserRound />} title={t('account.title')} body={t('account.guest')} action={<ButtonLink href={`${app.href('/login')}?next=${encodeURIComponent(app.href('/account'))}`}>{t('common.signIn')}</ButtonLink>} />;
  }

  const act = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      app.toast(app.errorText(e), 'error');
    } finally {
      setBusy(null);
    }
  };

  const signOut = () =>
    act('out', async () => {
      await m('auth/logout', { body: {} });
      app.setSignedIn(false);
      app.setCart(null);
      router.replace(app.href('/'));
      router.refresh();
    });

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="card flex items-center gap-4 p-5 md:col-span-2">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-100 text-lg font-bold text-brand-700">{me?.fullName ? initials(me.fullName) : <UserRound className="h-6 w-6" />}</span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-lg font-extrabold text-gray-900">{me ? t('account.hello', { name: me.fullName ?? '' }) : <Skeleton className="h-6 w-40" />}</div>
          <p className="num text-sm text-gray-500">{me?.phone}</p>
        </div>
        <ButtonLink href={app.href('/orders')} variant="secondary" size="sm">{t('nav.orders')}</ButtonLink>
      </section>

      <Card icon={<UserRound />} title={t('account.profile')}>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void act('profile', async () => { setMe(await m<Customer>('me', { method: 'PATCH', body: { fullName: name.trim(), email: email.trim() || undefined } })); app.toast(t('account.saved')); }); }}>
          <Input label={t('account.name')} value={name} onChange={(e) => setName(e.target.value)} maxLength={100} autoComplete="name" />
          <Input label={t('account.email')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} autoComplete="email" />
          <Button type="submit" size="sm" loading={busy === 'profile'}>{t('common.save')}</Button>
        </form>
      </Card>

      <Card icon={<MapPin />} title={t('account.addresses')} action={<button type="button" onClick={() => setAddOpen(true)} className="text-sm font-semibold text-brand-700">{t('checkout.addAddress')}</button>}>
        {addresses === null ? <Skeleton className="h-20" /> : !addresses.length ? <p className="text-sm text-gray-500">{t('account.noAddresses')}</p> : (
          <ul className="space-y-2">
            {addresses.map((a) => (
              <li key={a.id} className="flex items-start gap-3 rounded-xl p-3 ring-1 ring-gray-200">
                <div className="min-w-0 flex-1 text-sm">
                  <p className="flex items-center gap-2 font-semibold text-gray-900">{a.label}{a.isDefault && <Badge tone="brand">{t('account.default')}</Badge>}</p>
                  <p className="text-gray-600">{[a.addressLine1, a.area, a.city].filter(Boolean).join(', ')}</p>
                  {!a.isDefault && (
                    <button type="button" className="mt-1 text-xs font-semibold text-brand-700" onClick={() => act(`d-${a.id}`, async () => { await m(`addresses/${a.id}/default`, { body: {} }); setAddresses(addresses.map((x) => ({ ...x, isDefault: x.id === a.id }))); })}>
                      {t('account.makeDefault')}
                    </button>
                  )}
                </div>
                <button type="button" aria-label={t('common.remove')} className="grid h-9 w-9 place-items-center rounded-full text-gray-500 hover:bg-red-50 hover:text-red-600" onClick={() => act(`x-${a.id}`, async () => { await m(`addresses/${a.id}`, { method: 'DELETE' }); setAddresses(await m<Address[]>('addresses')); })}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card icon={<Heart />} title={t('account.wishlist')}>
        {wish === null ? <Skeleton className="h-20" /> : !wish.length ? <p className="text-sm text-gray-500">{t('account.noWishlist')}</p> : (
          <ul className="divide-y divide-gray-100">
            {wish.map((w) => (
              <li key={w.productId}>
                <Link href={app.href(`/p/${w.productId}`)} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0"><span className={cn('block truncate text-sm font-semibold', w.available ? 'text-gray-900' : 'text-gray-400')}>{w.name}</span><span className="block truncate text-xs text-gray-500">{w.shop?.name}</span></span>
                  <Price value={w.price} compareAt={w.compareAt} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card icon={<Store />} title={t('account.followed')}>
        {followed === null ? <Skeleton className="h-20" /> : !followed.length ? <p className="text-sm text-gray-500">{t('account.noFollowed')}</p> : (
          <ul className="divide-y divide-gray-100">
            {followed.map((s) => (
              <li key={s.shopId}>
                <Link href={app.href(`/shop/${s.slug}`)} className="flex items-center gap-3 py-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-xs font-bold text-brand-700">{initials(s.name)}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900">{s.name}<span className="block text-xs font-normal text-gray-500">{s.city}</span></span>
                  <ChevronRight className="h-4 w-4 text-gray-400 rtl:rotate-180" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card icon={<Bell />} title={t('account.notifications')} action={notes?.some((n) => !n.isRead) ? <button type="button" className="text-sm font-semibold text-brand-700" onClick={() => act('read', async () => { await m('notifications/read-all', { body: {} }); setNotes((n) => n?.map((x) => ({ ...x, isRead: true })) ?? null); })}>{t('account.markAllRead')}</button> : undefined}>
        {notes === null ? <Skeleton className="h-20" /> : !notes.length ? <p className="text-sm text-gray-500">{t('account.noNotifications')}</p> : (
          <ul className="divide-y divide-gray-100">
            {notes.slice(0, 10).map((n) => {
              const body = (
                <span className="flex items-start gap-2 py-2.5">
                  {!n.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-600" aria-hidden />}
                  <span className="min-w-0 text-sm"><span className="block font-semibold text-gray-900">{n.title}</span><span className="block text-gray-600">{n.body}</span><span className="num block text-xs text-gray-400">{dateTime(n.createdAt, app.lang)}</span></span>
                </span>
              );
              return <li key={n.id}>{n.actionUrl?.startsWith('/') ? <Link href={app.href(n.actionUrl)}>{body}</Link> : body}</li>;
            })}
          </ul>
        )}
      </Card>

      <Card icon={<Moon />} title={t('account.settings')}>
        <p className="mb-2 text-xs font-semibold text-gray-700">{t('account.language')}</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {LANGS.map((l) => (
            <Link key={l} href={switchLang(path, l)} className={cn('rounded-full px-4 py-2 text-sm font-semibold ring-1', l === app.lang ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-gray-700 ring-gray-200')}>{t(`lang.${l}`)}</Link>
          ))}
        </div>
        <p className="mb-2 text-xs font-semibold text-gray-700">{t('account.theme')}</p>
        <div className="flex flex-wrap gap-2">
          {(['light', 'dark', 'system'] as ThemePref[]).map((x) => (
            <button key={x} type="button" aria-pressed={theme === x} onClick={() => { applyTheme(x); setTheme(x); }} className={cn('rounded-full px-4 py-2 text-sm font-semibold ring-1', theme === x ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-gray-700 ring-gray-200')}>
              {t(`account.${x}`)}
            </button>
          ))}
        </div>
      </Card>

      <section className="flex flex-col gap-3 md:col-span-2 md:flex-row md:justify-between">
        <Button variant="outline" icon={<LogOut className="h-4 w-4" />} loading={busy === 'out'} onClick={signOut}>{t('common.signOut')}</Button>
        <button type="button" onClick={() => setDelOpen(true)} className="text-sm font-semibold text-red-600 hover:underline">{t('account.deleteAccount')}</button>
      </section>

      <AddressSheet open={addOpen} onClose={() => setAddOpen(false)} onSaved={async () => setAddresses(await m<Address[]>('addresses'))} />
      <Sheet open={delOpen} onClose={() => setDelOpen(false)} title={t('account.deleteAccount')} closeLabel={t('common.close')}
        footer={<div className="flex gap-2"><Button variant="secondary" block onClick={() => setDelOpen(false)}>{t('common.cancel')}</Button><Button variant="danger" block loading={busy === 'del'} onClick={() => act('del', async () => { await m('me', { method: 'DELETE', body: {} }); app.setSignedIn(false); app.setCart(null); app.toast(t('account.deleted')); router.replace(app.href('/')); router.refresh(); })}>{t('account.deleteAccount')}</Button></div>}>
        <p className="text-sm text-gray-700">{t('account.deleteConfirm')}</p>
      </Sheet>
    </div>
  );
}
