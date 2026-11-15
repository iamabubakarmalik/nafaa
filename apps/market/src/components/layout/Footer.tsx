/** Site footer: gates, legal pages, the merchant sign-up link and languages. */
import Link from 'next/link';
import { getDict, href, makeT, pick, LANGS } from '@/lib/i18n';
import { SIGNUP_URL } from '@/lib/site';
import type { GateDef, Lang } from '@/lib/types';
import { Logo } from './Logo';

export function Footer({ lang, gates }: { lang: Lang; gates: GateDef[] }) {
  const t = makeT(getDict(lang));
  const h = (p: string) => href(lang, p);
  return (
    <footer className="mt-16 border-t border-shell-line bg-white pb-[calc(var(--bottom-nav)+1.5rem)] pt-10">
      <div className="container-page grid gap-8 md:grid-cols-4">
        <div className="md:col-span-1">
          <Logo href={h('/')} label={t('common.appName')} />
          <p className="mt-2 text-sm text-gray-500">{t('footer.tagline')}</p>
          <a href={SIGNUP_URL} className="mt-4 inline-flex rounded-xl bg-brand-50 px-4 py-2.5 text-sm font-semibold text-brand-800 ring-1 ring-brand-200 hover:bg-brand-100">
            {t('footer.sell')}
          </a>
        </div>
        <nav aria-label={t('footer.gates')}>
          <h2 className="text-xs font-bold uppercase tracking-wide text-gray-500">{t('footer.gates')}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {gates.map((g) => (
              <li key={g.id}><Link href={h(`/${g.slug}`)} className="text-gray-700 hover:text-brand-700">{pick(g.label, lang)}</Link></li>
            ))}
          </ul>
        </nav>
        <nav aria-label={t('footer.company')}>
          <h2 className="text-xs font-bold uppercase tracking-wide text-gray-500">{t('footer.company')}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {(['about', 'terms', 'privacy', 'refund'] as const).map((k) => (
              <li key={k}><Link href={h(`/${k}`)} className="text-gray-700 hover:text-brand-700">{t(`footer.${k}`)}</Link></li>
            ))}
          </ul>
        </nav>
        <nav aria-label={t('account.language')}>
          <h2 className="text-xs font-bold uppercase tracking-wide text-gray-500">{t('account.language')}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {LANGS.map((l) => (
              <li key={l}><Link href={href(l, '/')} hrefLang={l === 'roman' ? 'ur-Latn' : l} className="text-gray-700 hover:text-brand-700">{t(`lang.${l}`)}</Link></li>
            ))}
          </ul>
        </nav>
      </div>
      <p className="container-page mt-10 text-xs text-gray-400">© {new Date().getFullYear()} Nafaa · market.nafaa.pk</p>
    </footer>
  );
}
