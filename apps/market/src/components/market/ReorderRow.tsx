'use client';
/** "Order again": the signed-in customer's recent orders with a one-tap reorder. */
import { RotateCcw, Store } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { Button } from '@/components/ui';
import { m } from '@/lib/client';
import { money, initials } from '@/lib/format';
import type { OrderSummary, Page } from '@/lib/types';
import { Section } from './Section';

export function ReorderRow() {
  const app = useApp();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!app.signedIn) return;
    m<Page<OrderSummary>>('orders')
      .then((r) => setOrders(r.items.filter((o) => o.status === 'DELIVERED').slice(0, 8)))
      .catch(() => setOrders([]));
  }, [app.signedIn]);

  if (!orders.length) return null;

  const reorder = async (o: OrderSummary) => {
    setBusy(o.id);
    try {
      await m(`orders/${o.id}/reorder`, { body: {} });
      await app.refreshCart();
      app.toast(app.t('orders.reordered'), 'ok', { label: app.t('common.viewCart'), href: app.href('/cart') });
    } catch (e) {
      app.toast(app.errorText(e), 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Section title={app.t('home.reorderTitle')}>
      <div className="scroll-x">
        {orders.map((o) => (
          <div key={o.id} className="card flex w-[260px] shrink-0 flex-col gap-3 p-3">
            <Link href={app.href(`/orders/${o.id}`)} className="flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-sm font-bold text-brand-700">
                {o.shop ? initials(o.shop.name) : <Store className="h-5 w-5" />}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-gray-900">{o.shop?.name}</span>
                <span className="block truncate text-xs text-gray-500">{o.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}</span>
              </span>
            </Link>
            <div className="flex items-center justify-between">
              <span className="num text-sm font-semibold text-gray-800">{money(o.total)}</span>
              <Button size="sm" variant="secondary" loading={busy === o.id} icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={() => reorder(o)}>
                {app.t('orders.reorder')}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
