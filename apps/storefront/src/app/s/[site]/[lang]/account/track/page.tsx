import type { Metadata } from 'next';
import { Suspense } from 'react';
import { t } from '@/lib/i18n';
import { meta } from '@/lib/seo';
import { site, type SiteParams } from '@/lib/store';
import { TrackClient } from '@/components/account/TrackClient';

type Props = { params: Promise<SiteParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ctx = await site(params);
  return meta(ctx, { title: t(ctx.lang, 'account.trackTitle'), path: '/account/track', noindex: true });
}

export default async function TrackPage({ params }: Props) {
  const ctx = await site(params);
  if (ctx.blocked) return null;
  return (
    <Suspense fallback={null}>
      <TrackClient />
    </Suspense>
  );
}
