/** Sign-in page. */
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginView } from '@/components/market/LoginView';
import { Skeleton } from '@/components/ui';
import { pageLang, type LangParams } from '@/lib/page';
import { pageMeta } from '@/lib/seo';

export async function generateMetadata({ params }: { params: LangParams }): Promise<Metadata> {
  const { lang, t } = await pageLang(params);
  return pageMeta({ lang, path: '/login', title: `${t('common.signIn')} | Nafaa Market`, description: t('auth.sub'), noindex: true });
}

export default async function LoginPage({ params }: { params: LangParams }) {
  await pageLang(params);
  return (
    <div className="container-page pt-6 md:pt-12">
      <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-md rounded-2xl" />}>
        <LoginView />
      </Suspense>
    </div>
  );
}
