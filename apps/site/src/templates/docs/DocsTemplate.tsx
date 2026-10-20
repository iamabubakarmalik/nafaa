/**
 * Developer docs template (ARCH 8, DOC; `/developers` and below). Three
 * columns on wide screens: the docs tree, the page, and "On this page".
 * The tree is server-rendered (<details> per branch, the current branch open)
 * and collapses into one "Docs menu" disclosure on phones. Endpoint pages show
 * their method and path from `data.apiRef`. Code samples are codeSample
 * blocks (server-highlighted by the block renderer, copy island only).
 * Schema: WebPage + TechArticle (+ FAQPage when the page has FAQs).
 */
import Link from 'next/link';
import type { EntryCard, PublicEntity, PublicEntry, SiteSettings } from '@/lib/cms/contract/cms-contract';
import { PageBreadcrumbs } from '@/components/layout/Breadcrumbs';
import { cx } from '@/components/ui/cx';
import { JsonLd } from '@/components/seo/JsonLd';
import { Body } from '../article/parts/Body';
import { relativePath } from '../article/parts/Cards';
import { FixtureRibbon } from '../article/parts/FixtureRibbon';
import { formatDate, isoDate } from '../article/parts/format';
import { s5Graph } from '../article/parts/graph';
import { outline } from '../article/parts/outline';
import { ApiHero } from './ApiHero';
import { buildDocTree, containsPath, flattenDocs, type DocNode } from './tree';

const METHOD_TONE: Record<string, string> = {
  GET: 'bg-sky-50 text-sky-800 ring-sky-600/20 ink:bg-sky-400/10 ink:text-sky-200',
  POST: 'bg-brand-50 text-brand-800 ring-brand-600/20 ink:bg-brand-400/10 ink:text-brand-200',
  PATCH: 'bg-amber-50 text-amber-800 ring-amber-600/25 ink:bg-amber-400/10 ink:text-amber-200',
  PUT: 'bg-amber-50 text-amber-800 ring-amber-600/25 ink:bg-amber-400/10 ink:text-amber-200',
  DELETE: 'bg-rose-50 text-rose-800 ring-rose-600/20 ink:bg-rose-400/10 ink:text-rose-200',
};

function MethodBadge({ method }: { method: string }) {
  return <span className={cx('inline-flex rounded px-1.5 py-0.5 font-mono text-[0.6875rem] font-semibold ring-1 ring-inset', METHOD_TONE[method])}>{method}</span>;
}

function TreeList({ nodes, current, depth = 0 }: { nodes: DocNode[]; current: string; depth?: number }) {
  return (
    <ul role="list" className={cx('space-y-0.5', depth > 0 && 'ml-3 mt-0.5 border-l border-line pl-2')}>
      {nodes.map((node) => {
        const active = node.card.path === current;
        const link = (
          <Link
            href={relativePath(node.card)}
            aria-current={active ? 'page' : undefined}
            className={cx(
              'block rounded-md px-2.5 py-1.5 text-small leading-snug transition-colors duration-fast',
              active ? 'bg-brand-50 font-medium text-brand-800 ink:bg-brand-400/10 ink:text-brand-200' : 'text-fg-muted hover:bg-surface-3 hover:text-fg-strong',
            )}
          >
            {node.card.shortName || node.card.title}
          </Link>
        );
        return (
          <li key={node.card.id}>
            {node.children.length ? (
              <details open={containsPath(node, current)} className="group">
                <summary className="flex cursor-pointer list-none items-center [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0 flex-1">{link}</span>
                  <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="mr-1.5 shrink-0 text-fg-subtle transition-transform duration-fast group-open:rotate-90">
                    <path d="m9 6 6 6-6 6" />
                  </svg>
                </summary>
                <TreeList nodes={node.children} current={current} depth={depth + 1} />
              </details>
            ) : (
              link
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Sidebar({ root, tree, current }: { root: EntryCard | undefined; tree: DocNode[]; current: string }) {
  return (
    <div className="space-y-4">
      {root ? (
        <Link
          href={relativePath(root)}
          aria-current={root.path === current ? 'page' : undefined}
          className={cx(
            'block rounded-md px-2.5 py-1.5 text-small font-medium transition-colors duration-fast',
            root.path === current ? 'bg-brand-50 text-brand-800 ink:bg-brand-400/10 ink:text-brand-200' : 'text-fg-strong hover:bg-surface-3',
          )}
        >
          Overview
        </Link>
      ) : null}
      <TreeList nodes={tree} current={current} />
    </div>
  );
}

export interface DocsTemplateProps {
  entry: PublicEntry;
  docs: EntryCard[];
  site: SiteSettings;
  entity: PublicEntity | null;
}

export function DocsTemplate({ entry, docs, site, entity }: DocsTemplateProps) {
  if (entry.data.type !== 'DOC') return null;
  const data = entry.data;
  const tree = buildDocTree(docs);
  const root = docs.find((d) => d.path === '/developers');
  const flat = flattenDocs(tree, root);
  const index = flat.findIndex((d) => d.path === entry.path);
  const prev = index > 0 ? flat[index - 1] : undefined;
  const next = index >= 0 ? flat[index + 1] : undefined;
  const toc = outline(entry, { withFaqs: true });
  const isRoot = entry.path === '/developers';
  const childCards = isRoot ? tree.map((n) => n.card) : entry.children;
  const graph = s5Graph({ entry, site, entity, faq: true });

  return (
    <>
      <JsonLd data={graph} />
      <FixtureRibbon entry={entry} />
      <div className="mx-auto box-content max-w-wide px-gutter">
        <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10 xl:grid-cols-[15rem_minmax(0,1fr)_13rem]">
          <aside aria-label="Developer docs" className="lg:border-r lg:border-line/70 lg:pr-4">
            <details className="group mt-4 rounded-lg border border-line bg-surface-2 lg:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-small font-medium text-fg-strong [&::-webkit-details-marker]:hidden">
                Docs menu
                <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-fg-subtle transition-transform duration-fast group-open:rotate-180">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </summary>
              <nav aria-label="Docs pages" className="border-t border-line p-2">
                <Sidebar root={root} tree={tree} current={entry.path} />
              </nav>
            </details>
            <nav aria-label="Docs pages" className="sticky top-[calc(var(--header-h)+1.5rem)] hidden max-h-[calc(100vh-var(--header-h)-3rem)] overflow-y-auto py-8 lg:block">
              <p className="mb-3 px-2.5 text-eyebrow uppercase text-fg-subtle">API v1</p>
              <Sidebar root={root} tree={tree} current={entry.path} />
            </nav>
          </aside>

          <article className="min-w-0 pb-section pt-6 lg:pt-8">
            <PageBreadcrumbs crumbs={entry.breadcrumbs} />
            <header className="mt-8 max-w-prose">
              {data.apiRef ? (
                <p className="mb-4 flex items-center gap-2">
                  <MethodBadge method={data.apiRef.method} />
                  <code className="font-mono text-small text-fg-strong">{data.apiRef.path}</code>
                </p>
              ) : (
                <p className="mb-3 text-eyebrow uppercase text-link">{isRoot ? 'Developers' : 'Guide'}</p>
              )}
              <h1 className="text-h1 text-fg-strong">{entry.title}</h1>
              {entry.summary ? <p className="mt-4 text-body-lg text-fg-muted">{entry.summary}</p> : null}
              {entry.dateModified ? (
                <p className="mt-4 text-small text-fg-subtle">
                  Updated <time dateTime={isoDate(entry.dateModified)}>{formatDate(entry.dateModified)}</time>
                </p>
              ) : null}
            </header>
            {isRoot ? <ApiHero live={new Set(docs.map((d) => d.path))} /> : null}

            <div className="docs-body -mx-gutter mt-8 [&_.mx-auto]:!ml-0">
              <Body entry={entry} variant="docs" withFaqs />
            </div>

            {childCards.length ? (
              <section aria-labelledby="in-section" className="mt-12 max-w-prose">
                <h2 id="in-section" className="text-h4 text-fg-strong">
                  {isRoot ? 'Explore the API' : 'In this section'}
                </h2>
                <ul role="list" className="mt-4 grid gap-3 sm:grid-cols-2">
                  {childCards.map((card) => (
                    <li key={card.id} className="group relative rounded-lg border border-line bg-surface p-4 transition-[border-color,box-shadow] duration-fast hover:border-line-strong hover:shadow-e1">
                      <Link href={relativePath(card)} className="font-medium text-fg-strong after:absolute after:inset-0 group-hover:text-link">
                        {card.title}
                      </Link>
                      {card.summary ? <p className="mt-1 line-clamp-2 text-small text-fg-muted">{card.summary}</p> : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {prev || next ? (
              <nav aria-label="Previous and next" className="mt-14 grid max-w-prose gap-3 border-t border-line pt-8 sm:grid-cols-2">
                {prev ? (
                  <Link href={relativePath(prev)} rel="prev" className="group rounded-lg border border-line p-4 transition-colors duration-fast hover:border-line-strong">
                    <span className="text-small text-fg-subtle">Previous</span>
                    <span className="mt-1 block font-medium text-fg-strong group-hover:text-link">{prev.title}</span>
                  </Link>
                ) : (
                  <span />
                )}
                {next ? (
                  <Link href={relativePath(next)} rel="next" className="group rounded-lg border border-line p-4 text-right transition-colors duration-fast hover:border-line-strong">
                    <span className="text-small text-fg-subtle">Next</span>
                    <span className="mt-1 block font-medium text-fg-strong group-hover:text-link">{next.title}</span>
                  </Link>
                ) : null}
              </nav>
            ) : null}
          </article>

          {toc.length > 1 ? (
            <nav aria-label="On this page" className="hidden xl:block">
              <div className="sticky top-[calc(var(--header-h)+1.5rem)] py-8">
                <p className="mb-3 text-eyebrow uppercase text-fg-subtle">On this page</p>
                <ol className="space-y-1.5 text-small">
                  {toc.map((item) => (
                    <li key={item.id} className={item.level === 3 ? 'pl-3' : undefined}>
                      <a href={`#${item.id}`} className="block leading-snug text-fg-muted transition-colors duration-fast hover:text-fg-strong">
                        {item.text}
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            </nav>
          ) : null}
        </div>
      </div>
    </>
  );
}
