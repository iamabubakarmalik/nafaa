import type { Metadata } from 'next';
import { t } from '@/lib/i18n';
import { meta } from '@/lib/seo';
import { site, templateSections, type SiteParams } from '@/lib/store';
import { Sections } from '@/components/sections/Sections';
import { Suspense } from 'react';

type Props = { params: Promise<SiteParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ctx = await site(params);
  return meta(ctx, { title: t(ctx.lang, 'account.title'), path: '/account', noindex: true });
}

export default async function AccountPage({ params }: Props) {
  const ctx = await site(params);
  if (ctx.blocked) return null;
  return (
    <Suspense fallback={null}>
      <Sections sections={templateSections(ctx, 'account')} ctx={ctx} />
    </Suspense>
  );
}
