/** Order detail and tracking page (customer-only). */
import type { Metadata } from 'next';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';
import { OrderView } from '@/components/market/OrderView';
import { Skeleton } from '@/components/ui';
import { pageLang } from '@/lib/page';
import { pageMeta } from '@/lib/seo';

type Params = Promise<{ lang: string; id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang, t } = await pageLang(params);
  return pageMeta({ lang, path: '/orders', title: `${t('orders.title')} | Nafaa Market`, description: t('seo.homeDesc'), noindex: true });
}

export default async function OrderPage({ params }: { params: Params }) {
  const { t, h } = await pageLang(params);
  const { id } = await params;
  return (
    <div className="container-page max-w-3xl pt-4 md:pt-8">
      <Link href={h('/orders')} className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-gray-600 hover:text-brand-700"><ChevronLeft className="h-4 w-4 rtl:rotate-180" />{t('orders.title')}</Link>
      <Suspense fallback={<Skeleton className="h-40 rounded-2xl" />}>
        <OrderView id={id.slice(0, 64)} />
      </Suspense>
    </div>
  );
}
