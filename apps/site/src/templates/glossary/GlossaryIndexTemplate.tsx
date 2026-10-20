/**
 * Glossary hub (PAGE /glossary): every published term A-Z with its
 * one-sentence definition, a sticky letter bar and an in-page filter.
 * Schema: CollectionPage + ItemList (S1) plus the DefinedTermSet that every
 * term page points to (`/glossary#set`), listing its terms.
 */
import Link from 'next/link';
import type { EntryCard, PublicEntity, PublicEntry, SiteSettings } from '@/lib/cms/contract/cms-contract';
import { Container } from '@/components/ui/Container';
import { JsonLd } from '@/components/seo/JsonLd';
import { absoluteUrl } from '@/lib/cms/env';
import { Body } from '../article/parts/Body';
import { relativePath } from '../article/parts/Cards';
import { FixtureRibbon } from '../article/parts/FixtureRibbon';
import { filterText, indexLetter } from '../article/parts/format';
import { s5Graph } from '../article/parts/graph';
import { PageHeader } from '../article/parts/Headers';
import { ListFilter } from '../article/parts/ListFilter';

const LETTERS = ['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];

function groupByLetter(terms: EntryCard[]): Map<string, EntryCard[]> {
  const groups = new Map<string, EntryCard[]>();
  for (const term of [...terms].sort((a, b) => a.title.localeCompare(b.title, 'en'))) {
    const letter = indexLetter(term.title);
    groups.set(letter, [...(groups.get(letter) ?? []), term]);
  }
  return groups;
}

export function GlossaryIndexTemplate({ entry, terms, site, entity }: { entry: PublicEntry; terms: EntryCard[]; site: SiteSettings; entity: PublicEntity | null }) {
  const groups = groupByLetter(terms);
  const termSet = {
    '@type': 'DefinedTermSet',
    '@id': absoluteUrl('/glossary#set'),
    name: entry.title,
    url: entry.url,
    hasDefinedTerm: terms.map((t) => ({ '@type': 'DefinedTerm', name: t.title, url: t.url, description: t.summary ?? undefined })),
  };
  const graph = s5Graph({ entry, site, entity, items: terms.map((t) => ({ name: t.title, url: t.url })), extra: [termSet], faq: true });

  return (
    <>
      <JsonLd data={graph} />
      <FixtureRibbon entry={entry} />
      <PageHeader entry={entry} eyebrow={`${terms.length} terms`}>
        {terms.length > 8 ? <ListFilter target="glossary-list" label="Search the glossary" placeholder="Search terms, e.g. khata or FBR" countLabel="{n} matching terms" /> : null}
      </PageHeader>

      <nav aria-label="Letters" className="sticky top-[var(--header-h)] z-10 border-b border-line/70 bg-canvas/85 backdrop-blur supports-[backdrop-filter]:bg-canvas/70">
        <Container>
          <ul className="-mx-1 flex gap-0.5 overflow-x-auto py-2 [scrollbar-width:none]">
            {LETTERS.map((l) => {
              const has = groups.has(l);
              return (
                <li key={l}>
                  {has ? (
                    <a href={`#letter-${l === '#' ? 'other' : l.toLowerCase()}`} className="inline-flex size-8 items-center justify-center rounded-md text-small font-medium text-fg-strong transition-colors duration-fast hover:bg-surface-3">
                      {l}
                    </a>
                  ) : (
                    <span aria-hidden className="inline-flex size-8 items-center justify-center text-small text-fg-subtle/50">
                      {l}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </Container>
      </nav>

      <Container className="py-12 md:py-16">
        <div id="glossary-list" className="space-y-6 md:space-y-8">
          {[...groups.entries()].map(([letter, items]) => (
            <section key={letter} data-filter-group aria-labelledby={`letter-${letter === '#' ? 'other' : letter.toLowerCase()}`} className="grid gap-4 md:grid-cols-[6rem_minmax(0,1fr)]">
              <h2
                id={`letter-${letter === '#' ? 'other' : letter.toLowerCase()}`}
                className="scroll-mt-[calc(var(--header-h)+4rem)] text-h2 text-fg-subtle/70 md:sticky md:top-[calc(var(--header-h)+4.5rem)] md:self-start"
              >
                {letter}
              </h2>
              <ul role="list" className="grid gap-x-8 sm:grid-cols-2">
                {items.map((term) => (
                  <li key={term.id} data-filter-item data-filter-text={filterText(term.title, term.summary)} className="group relative border-t border-line py-4">
                    <h3 className="text-h4 text-fg-strong">
                      <Link href={relativePath(term)} className="after:absolute after:inset-0 group-hover:text-link">
                        {term.title}
                      </Link>
                    </h3>
                    {term.summary ? <p className="mt-1.5 line-clamp-3 text-small text-fg-muted">{term.summary}</p> : null}
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {terms.length === 0 ? <p className="text-fg-muted">The first terms are being written.</p> : null}
        </div>
      </Container>

      <Body entry={entry} variant="hub" skipGridsOf={['GLOSSARY_TERM']} withFaqs />
    </>
  );
}
