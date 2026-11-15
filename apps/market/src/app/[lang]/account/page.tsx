/** Account page (customer-only). */
import type { Metadata } from 'next';
import { AccountView } from '@/components/market/AccountView';
import { pageLang, type LangParams } from '@/lib/page';
import { pageMeta } from '@/lib/seo';

export async function generateMetadata({ params }: { params: LangParams }): Promise<Metadata> {
  const { lang, t } = await pageLang(params);
  return pageMeta({ lang, path: '/account', title: `${t('account.title')} | Nafaa Market`, description: t('seo.homeDesc'), noindex: true });
}

export default async function AccountPage({ params }: { params: LangParams }) {
  const { t } = await pageLang(params);
  return (
    <div className="container-page max-w-4xl pt-4 md:pt-8">
      <h1 className="mb-4 text-2xl font-extrabold text-gray-900">{t('account.title')}</h1>
      <AccountView />
    </div>
  );
}
