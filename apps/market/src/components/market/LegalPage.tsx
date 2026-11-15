/**
 * About, terms, privacy and refund pages from the dictionaries
 * (legal.<doc>.title/body). The wording is a first draft for owner review.
 */
import { getDict, makeT } from '@/lib/i18n';
import { SIGNUP_URL } from '@/lib/site';
import type { Lang } from '@/lib/types';

export type LegalDoc = 'about' | 'terms' | 'privacy' | 'refund';

export function LegalPage({ lang, doc }: { lang: Lang; doc: LegalDoc }) {
  const dict = getDict(lang);
  const t = makeT(dict);
  const body = dict.legal[doc].body as string[];
  return (
    <article className="container-page max-w-3xl pt-6 md:pt-10">
      <h1 className="text-3xl font-extrabold text-gray-900">{dict.legal[doc].title}</h1>
      {doc !== 'about' && <p className="mt-1 text-xs text-gray-500">{t('legal.updated')}</p>}
      <div className="card mt-6 space-y-4 p-6 text-[15px] leading-relaxed text-gray-700 md:p-8">
        {body.map((para) => <p key={para}>{para}</p>)}
        {doc === 'about' && (
          <p><a href={SIGNUP_URL} className="font-semibold text-brand-700 hover:underline">{t('footer.sell')}</a></p>
        )}
      </div>
    </article>
  );
}

export function legalMetaTitle(lang: Lang, doc: LegalDoc) {
  return `${getDict(lang).legal[doc].title} | Nafaa Market`;
}

export function legalMetaDesc(lang: Lang, doc: LegalDoc) {
  return (getDict(lang).legal[doc].body as string[])[0] ?? '';
}
