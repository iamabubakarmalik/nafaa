'use client';
/** Orders list: active orders first, then past orders with "Order again". */
import { ChevronRight, ReceiptText, RotateCcw, Store } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { Badge, Button, ButtonLink, EmptyState, Skeleton } from '@/components/ui';
import { m } from '@/lib/client';
import { dateTime, initials, money } from '@/lib/format';
import type { OrderSummary, Page } from '@/lib/types';
import { statusTone } from './status';

export function OrdersView() {
  const app = useApp();
  const { t } = app;
  const placed = Number(useSearchParams().get('placed')) || 0;
  const [data, setData] = useState<OrderSummary[] | null>(null);
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!app.signedIn) return;
    m<Page<OrderSummary>>('orders', { query: { page: String(page) } })
      .then((r) => {
        setData((d) => (page === 1 ? r.items : [...(d ?? []), ...r.items]));
        setMore(r.hasMore);
      })
      .catch((e) => {
        app.toast(app.errorText(e), 'error');
        setData((d) => d ?? []);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.signedIn, page]);

  if (!app.signedIn) {
    return <EmptyState icon={<ReceiptText />} title={t('orders.title')} body={t('orders.signInSub')} action={<ButtonLink href={`${app.href('/login')}?next=${encodeURIComponent(app.href('/orders'))}`}>{t('common.signIn')}</ButtonLink>} />;
  }
  if (!data) return <div className="space-y-3">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>;
  if (!data.length) return <EmptyState icon={<ReceiptText />} title={t('orders.empty')} body={t('orders.emptySub')} action={<ButtonLink href={app.href('/')}>{t('cart.browse')}</ButtonLink>} />;

  const reorder = async (o: OrderSummary) => {
    setBusy(o.id);
    try {
      await m(`orders/${o.id}/reorder`, { body: {} });
      await app.refreshCart();
      app.toast(t('orders.reordered'), 'ok', { label: t('common.viewCart'), href: app.href('/cart') });
    } catch (e) {
      app.toast(app.errorText(e), 'error');
    } finally {
      setBusy(null);
    }
  };

  const active = data.filter((o) => o.isActive);
  const past = data.filter((o) => !o.isActive);
  const card = (o: OrderSummary) => (
    <li key={o.id} className="card overflow-hidden">
      <Link href={app.href(`/orders/${o.id}`)} className="flex items-center gap-3 p-4 hover:bg-gray-50">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-sm font-bold text-brand-700">{o.shop ? initials(o.shop.name) : <Store className="h-5 w-5" />}</span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate font-bold text-gray-900">{o.shop?.name}</span>
            <Badge tone={statusTone(o.status)}>{t(`status.${o.status}`)}</Badge>
          </span>
          <span className="block truncate text-xs text-gray-500">{o.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}</span>
          <span className="num block text-xs text-gray-400">{dateTime(o.createdAt, app.lang)} · {money(o.total)}</span>
        </span>
        <ChevronRight className="h-4 w-4 text-gray-400 rtl:rotate-180" />
      </Link>
      {!o.isActive && o.status === 'DELIVERED' && (
        <div className="border-t border-gray-100 px-4 py-2">
          <Button size="sm" variant="ghost" loading={busy === o.id} icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={() => reorder(o)}>{t('orders.reorder')}</Button>
        </div>
      )}
    </li>
  );

  return (
    <div className="space-y-6">
      {placed > 1 && <p className="rounded-2xl bg-green-50 p-4 text-sm font-medium text-green-800 ring-1 ring-green-200">{t('success.title')} {t('success.multi', { n: placed })}</p>}
      {active.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-500">{t('orders.active')}</h2>
          <ul className="space-y-3">{active.map(card)}</ul>
        </section>
      )}
      {past.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-500">{t('orders.past')}</h2>
          <ul className="space-y-3">{past.map(card)}</ul>
        </section>
      )}
      {more && <div className="text-center"><Button variant="outline" onClick={() => setPage(page + 1)}>{t('common.seeAll')}</Button></div>}
    </div>
  );
}
