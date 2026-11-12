import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { site, type SiteParams } from '@/lib/store';
import { OrderConfirmation } from '@/components/checkout/OrderConfirmation';

type Props = { params: Promise<SiteParams & { token: string }> };

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function OrderPage({ params }: Props) {
  const p = await params;
  const ctx = await site(p);
  if (ctx.blocked) return null;
  const token = decodeURIComponent(p.token);
  const order = await api.order(ctx.storeId, token);
  if (!order) notFound();
  return <OrderConfirmation order={order} token={token} />;
}
