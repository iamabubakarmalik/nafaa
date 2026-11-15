/** Orders list page (customer-only). */
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { OrdersView } from '@/components/market/OrdersView';
import { Skeleton } from '@/components/ui';
import { pageLang, type LangParams } from '@/lib/page';
import { pageMeta } from '@/lib/seo';

export async function generateMetadata({ params }: { params: LangParams }): Promise<Metadata> {
  const { lang, t } = await pageLang(params);
  return pageMeta({ lang, path: '/orders', title: `${t('orders.title')} | Nafaa Market`, description: t('seo.homeDesc'), noindex: true });
}

export default async function OrdersPage({ params }: { params: LangParams }) {
  const { t } = await pageLang(params);
  return (
    <div className="container-page max-w-3xl pt-4 md:pt-8">
      <h1 className="mb-4 text-2xl font-extrabold text-gray-900">{t('orders.title')}</h1>
      <Suspense fallback={<Skeleton className="h-28 rounded-2xl" />}>
        <OrdersView />
      </Suspense>
    </div>
  );
}
