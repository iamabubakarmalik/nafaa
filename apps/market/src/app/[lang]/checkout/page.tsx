/** Checkout page (customer-only, rendered in the browser through the bridge). */
import type { Metadata } from 'next';
import { CheckoutView } from '@/components/market/CheckoutView';
import { pageLang, type LangParams } from '@/lib/page';
import { pageMeta } from '@/lib/seo';

export async function generateMetadata({ params }: { params: LangParams }): Promise<Metadata> {
  const { lang, t } = await pageLang(params);
  return pageMeta({ lang, path: '/checkout', title: `${t('checkout.title')} | Nafaa Market`, description: t('seo.homeDesc'), noindex: true });
}

export default async function CheckoutPage({ params }: { params: LangParams }) {
  const { t } = await pageLang(params);
  return (
    <div className="container-page pt-4 md:pt-8">
      <h1 className="mb-4 text-2xl font-extrabold text-gray-900">{t('checkout.title')}</h1>
      <CheckoutView />
    </div>
  );
}
