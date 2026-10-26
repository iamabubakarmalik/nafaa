/**
 * Glossary term template (ARCH 8, GLOSSARY_TERM): H1 "What is {term}?" with
 * the one-sentence definition straight under it (the answer AI search
 * quotes), then the meaning in English and Roman Urdu, other names, an
 * example, the body ("How Nafaa handles it"), related terms and reading.
 * Schema: DefinedTerm in the /glossary DefinedTermSet (+ FAQPage when the
 * term has FAQs).
 */
import Link from 'next/link';
import type { PublicEntity, PublicEntry, SiteSettings } from '@/lib/cms/contract/cms-contract';
import { Container } from '@/components/ui/Container';
import { JsonLd } from '@/components/seo/JsonLd';
import { Markdown } from '@/components/blocks/rich-text/Markdown';
import { Prose } from '@/components/ui/Prose';
import { localizePath } from '@/lib/cms/locale';
import { uiStrings } from '@/lib/i18n/ui';
import { Body } from '../article/parts/Body';
import { CardGrid, ContentCard, relativePath } from '../article/parts/Cards';
import { FixtureRibbon } from '../article/parts/FixtureRibbon';
import { s5Graph } from '../article/parts/graph';
import { PageHeader } from '../article/parts/Headers';
import { formatDate, glossaryLetters, isoDate, letterAnchor, localeIndexLetter } from '../article/parts/format';

export function questionTitle(term: string, locale?: string): string {
  return uiStrings(locale).content.glossary.question(term);
}

export function GlossaryTermTemplate({ entry, site, entity }: { entry: PublicEntry; site: SiteSettings; entity: PublicEntity | null }) {
  if (entry.data.type !== 'GLOSSARY_TERM') return null;
  const data = entry.data;
  const relatedTerms = entry.related.filter((card) => card.type === 'GLOSSARY_TERM');
  const relatedOther = entry.related.filter((card) => card.type !== 'GLOSSARY_TERM');
  const locale = entry.locale;
  const t = uiStrings(locale).content;
  const g = t.glossary;
  const letter = localeIndexLetter(data.term, locale);
  const letters = glossaryLetters(locale).filter((l) => l !== '#');
  const glossaryPath = localizePath(locale, '/glossary');
  const graph = s5Graph({ entry, site, entity, faq: true });

  return (
    <>
      <JsonLd data={graph} />
      <FixtureRibbon entry={entry} />
      <article>
        <PageHeader
          entry={entry}
          title={questionTitle(data.term, locale)}
          eyebrow={t.typeLabels.GLOSSARY_TERM}
          eyebrowHref={glossaryPath}
          intro={<span className="text-fg">{data.definition}</span>}
          size="article"
          meta={
            entry.dateModified ? (
              <p className="text-small text-fg-subtle">
                {uiStrings(locale).updated} <time dateTime={isoDate(entry.dateModified)}>{formatDate(entry.dateModified, locale)}</time>
              </p>
            ) : undefined
          }
        />
        <div className="pb-section pt-10 md:pt-14">
          <Container size="prose" className="space-y-10">
            <section aria-labelledby="meaning">
              <h2 id="meaning" className="text-h3 text-fg-strong">
                {g.meaning}
              </h2>
              <div className="mt-5 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2">
                <div className="bg-surface p-5 md:p-6">
                  <p className="text-eyebrow uppercase text-fg-subtle">{g.ownLanguage}</p>
                  <p className="mt-2 text-fg">{data.definition}</p>
                </div>
                <div className="bg-surface p-5 md:p-6">
                  <p className="text-eyebrow uppercase text-fg-subtle">{g.romanUrdu}</p>
                  <p lang="ur-Latn" className="mt-2 text-fg">
                    {data.definitionRomanUrdu}
                  </p>
                </div>
              </div>
              {data.alsoKnownAs.length ? (
                <p className="mt-4 text-small text-fg-muted">
                  <span className="text-fg-subtle">{g.alsoCalled}</span>
                  {data.alsoKnownAs.map((name, i) => (
                    <span key={name}>
                      {i > 0 ? ', ' : ''}
                      <span className="font-medium text-fg">{name}</span>
                    </span>
                  ))}
                  .
                </p>
              ) : null}
            </section>

            {data.example ? (
              <section aria-labelledby="example">
                <h2 id="example" className="text-h3 text-fg-strong">
                  {g.example}
                </h2>
                <figure className="mt-5 border-l-2 border-brand-600 pl-5">
                  <Prose className="text-fg">
                    <Markdown text={data.example} opts={{ media: entry.media, locale: entry.locale, plainLinks: false, idPrefix: 'example' }} />
                  </Prose>
                </figure>
              </section>
            ) : null}
          </Container>

          <div className="mt-10">
            <Body entry={entry} variant="article" withFaqs />
          </div>

          {relatedTerms.length ? (
            <Container size="prose" className="mt-14">
              <h2 className="text-h3 text-fg-strong">{g.relatedTerms}</h2>
              <ul className="mt-5 divide-y divide-line border-y border-line">
                {relatedTerms.map((card) => (
                  <li key={card.id} className="group relative py-4">
                    <Link href={relativePath(card)} className="font-medium text-fg-strong after:absolute after:inset-0 group-hover:text-link">
                      {card.title}
                    </Link>
                    {card.summary ? <p className="mt-1 line-clamp-2 text-small text-fg-muted">{card.summary}</p> : null}
                  </li>
                ))}
              </ul>
            </Container>
          ) : null}
        </div>
      </article>

      {relatedOther.length ? (
        <section aria-labelledby="learn-more" className="theme-muted border-t border-line/70 bg-canvas py-16 md:py-20">
          <Container>
            <h2 id="learn-more" className="text-h3 text-fg-strong">
              {g.learnMore}
            </h2>
            <CardGrid className="mt-8">
              {relatedOther.slice(0, 6).map((card) => (
                <ContentCard key={card.id} card={card} eyebrow={card.type === 'GLOSSARY_TERM' ? undefined : t.typeLabels[card.type]} date={null} />
              ))}
            </CardGrid>
          </Container>
        </section>
      ) : null}

      <nav aria-label={g.azNav} className="border-t border-line/70 py-10">
        <Container>
          <p className="text-eyebrow uppercase text-fg-subtle">{g.browse}</p>
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {letters.map((l) => (
              <li key={l}>
                <Link
                  href={`${glossaryPath}#${letterAnchor(l)}`}
                  aria-current={l === letter ? 'true' : undefined}
                  className="inline-flex size-9 items-center justify-center rounded-md border border-line text-small font-medium text-fg-muted transition-colors duration-fast hover:border-line-strong hover:text-fg-strong aria-[current]:border-brand-600 aria-[current]:bg-brand-50 aria-[current]:text-brand-800 ink:aria-[current]:bg-brand-400/10 ink:aria-[current]:text-brand-200"
                >
                  {l}
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </nav>
    </>
  );
}
