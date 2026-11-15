/** Legal page "privacy" (copy in src/i18n, legal.privacy). */
import type { Metadata } from 'next';
import { LegalPage, legalMetaDesc, legalMetaTitle } from '@/components/market/LegalPage';
import { pageLang, type LangParams } from '@/lib/page';
import { pageMeta } from '@/lib/seo';

export async function generateMetadata({ params }: { params: LangParams }): Promise<Metadata> {
  const { lang } = await pageLang(params);
  return pageMeta({ lang, path: '/privacy', title: legalMetaTitle(lang, 'privacy'), description: legalMetaDesc(lang, 'privacy') });
}

export default async function Page({ params }: { params: LangParams }) {
  const { lang } = await pageLang(params);
  return <LegalPage lang={lang} doc="privacy" />;
}
