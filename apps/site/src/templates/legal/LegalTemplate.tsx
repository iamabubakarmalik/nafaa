/**
 * Legal PAGE template (privacy, terms, refund policy). Long-form text with:
 * the H1 (from a hero block, or the entry title when there is none), the
 * visible "Updated {date}" (ARCH 8: legal pages show it), a sticky table of
 * contents built from the same heading ids the renderer gives (blockOutline),
 * and the blocks in a readable column.
 *
 * Title: the page's `{title}`. Schema: WebPage (graph.ts).
 */
import { blockOutline } from '@/components/blocks/BlockRenderer';
import type { PublicEntry } from '@/lib/cms/contract/cms-contract';
import { Blocks } from '../core/Blocks';
import { PageFrame } from '../core/frame';
import { MetaRow } from '../core/parts';
import { Updated } from '../core/ui';

export function LegalTemplate({ entry }: { entry: PublicEntry }) {
  const hero = entry.blocks.filter((b) => b.type === 'hero');
  const body = entry.blocks.filter((b) => b.type !== 'hero');
  const hasHero = hero.length > 0;
  const outline = blockOutline(body).filter((h) => h.level === 2);

  return (
    <PageFrame entry={entry}>
      <MetaRow entry={entry} showUpdated={false} />
      {!hasHero ? (
        <header className="mx-auto box-content max-w-container px-gutter pb-4 pt-10 md:pt-14">
          <h1 className="text-h1 text-fg-strong">{entry.title}</h1>
          {entry.summary ? <p className="mt-4 max-w-[42rem] text-body-lg text-fg-muted">{entry.summary}</p> : null}
          <Updated date={entry.dateModified} label="Last updated" className="mt-4" />
        </header>
      ) : (
        <>
          <Blocks entry={entry} blocks={hero} />
          <div className="mx-auto box-content max-w-container px-gutter pb-6">
            <Updated date={entry.dateModified} label="Last updated" />
          </div>
        </>
      )}
      <div className="mx-auto box-content max-w-container px-gutter pb-section">
        <div className="grid gap-10 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-14">
          {outline.length > 1 ? (
            <nav aria-labelledby="legal-toc" className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:self-start">
              <h2 id="legal-toc" className="text-eyebrow uppercase text-fg-subtle">
                On this page
              </h2>
              <ol className="mt-3 space-y-2 border-l border-line text-small">
                {outline.map((h) => (
                  <li key={h.id}>
                    <a href={`#${h.id}`} className="-ml-px block border-l border-transparent pl-3 text-fg-muted transition-colors duration-fast hover:border-fg-strong hover:text-fg-strong">
                      {h.text}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          ) : (
            <span aria-hidden className="hidden lg:block" />
          )}
          <div className="min-w-0 [&_section]:!py-0 [&_section+section]:!pt-8 [&_.mx-auto]:!mx-0 [&_.mx-auto]:!px-0">
            <Blocks entry={entry} blocks={body} />
          </div>
        </div>
      </div>
    </PageFrame>
  );
}
