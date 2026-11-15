/** Cart page (customer-only, rendered in the browser through the bridge). */
import type { Metadata } from 'next';
import { CartView } from '@/components/market/CartView';
import { pageLang, type LangParams } from '@/lib/page';
import { pageMeta } from '@/lib/seo';

export async function generateMetadata({ params }: { params: LangParams }): Promise<Metadata> {
  const { lang, t } = await pageLang(params);
  return pageMeta({ lang, path: '/cart', title: `${t('cart.title')} | Nafaa Market`, description: t('seo.homeDesc'), noindex: true });
}

export default async function CartPage({ params }: { params: LangParams }) {
  const { t } = await pageLang(params);
  return (
    <div className="container-page pb-24 pt-4 md:pt-8 lg:pb-0">
      <h1 className="mb-4 text-2xl font-extrabold text-gray-900">{t('cart.title')}</h1>
      <CartView />
    </div>
  );
}
