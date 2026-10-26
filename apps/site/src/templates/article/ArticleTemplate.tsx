/**
 * Article template (ARCH 8): BLOG_POST, GUIDE, CASE_STUDY, TEMPLATE and
 * CHANGELOG. One H1, an answer-first intro (the summary), byline with
 * author, reviewer and dates, a table of contents from the H2s, the body
 * blocks, FAQs, the author box, glossary terms and related reading, then a
 * closing CTA. One JSON-LD graph: WebPage + BlogPosting/Article (+ FAQPage).
 *
 * Variants:
 * - GUIDE (pillar): "In this guide" chapters and the posts tagged to it.
 * - TEMPLATE: a download panel for the DOCUMENT file.
 * - CASE_STUDY: the customer's results (consented, with a source note).
 * - CHANGELOG: kind, version and date in the header.
 */
import Link from 'next/link';
import type { EntryCard, PublicEntity, PublicEntry, SiteSettings } from '@/lib/cms/contract/cms-contract';
import { Container } from '@/components/ui/Container';
import { JsonLd } from '@/components/seo/JsonLd';
import { CmsIcon } from '@/lib/icons';
import { mediaById } from '@/lib/media';
import { loadCards } from './data';
import { AuthorBox, Byline } from './parts/Byline';
import { Body, ClosingCta } from './parts/Body';
import { CardGrid, ContentCard, relativePath } from './parts/Cards';
import { FixtureRibbon } from './parts/FixtureRibbon';
import { formatDate } from './parts/format';
import { s5Graph } from './parts/graph';
import { PageHeader } from './parts/Headers';
import { outline } from './parts/outline';
import { TocRail, TocInline } from './parts/Toc';

const CHANGE_KIND: Record<string, string> = { new: 'New', improved: 'Improved', fixed: 'Fixed' };
const FORMAT_LABEL: Record<string, string> = { xlsx: 'Excel (XLSX)', pdf: 'PDF', docx: 'Word (DOCX)', csv: 'CSV' };

function bytes(n: number): string {
  if (n < 1024) return `${n} bytes`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function eyebrowFor(entry: PublicEntry): { label: string; href?: string } {
  const category = entry.tags.BLOG_CATEGORY?.[0];
  switch (entry.type) {
    case 'BLOG_POST':
      return category ? { label: category.title, href: relativePath(category) } : { label: 'Blog', href: '/blog' };
    case 'GUIDE':
      return { label: 'Guide', href: '/guides' };
    case 'CASE_STUDY':
      return { label: 'Customer story', href: '/customers' };
    case 'TEMPLATE': {
      const format = entry.data.type === 'TEMPLATE' ? FORMAT_LABEL[entry.data.format] : undefined;
      return { label: format ? `Free template · ${format}` : 'Free template', href: '/templates' };
    }
    case 'CHANGELOG': {
      const d = entry.data.type === 'CHANGELOG' ? entry.data : null;
      return { label: d ? [CHANGE_KIND[d.kind], d.version, formatDate(d.date)].filter(Boolean).join(' · ') : 'Changelog', href: '/changelog' };
    }
    default:
      return { label: '' };
  }
}

/** The entries nearest to `id` in a dated list (one newer, then older ones), for neighbour links. */
function neighbours(list: readonly EntryCard[], id: string, count: number): EntryCard[] {
  const i = list.findIndex((card) => card.id === id);
  if (i < 0) return list.slice(0, count);
  const order = [i - 1, i + 1, i + 2, i - 2, i + 3, i - 3, i + 4, i - 4];
  return order.filter((j) => j >= 0 && j < list.length).slice(0, count).map((j) => list[j]!);
}

/**
 * "Keep reading": every RELATED card the editor set (glossary terms have their
 * own chip row), up to six, padded to three with same-category posts. A
 * changelog entry links its neighbours, so older updates stay reachable.
 */
async function moreReading(entry: PublicEntry): Promise<{ heading: string; cards: EntryCard[] }> {
  const seen = new Set([entry.id, ...entry.related.map((c) => c.id)]);
  let extra: EntryCard[] = [];
  if (entry.type === 'BLOG_POST') {
    const category = entry.tags.BLOG_CATEGORY?.[0];
    if (category) extra = await loadCards({ type: 'BLOG_POST', locale: entry.locale, tag: category.id, sort: 'recent', limit: 6 });
  } else if (entry.type === 'GUIDE') {
    extra = await loadCards({ type: 'BLOG_POST', locale: entry.locale, tag: entry.id, sort: 'recent', limit: 6 });
  } else if (entry.type === 'CHANGELOG') {
    extra = neighbours(await loadCards({ type: 'CHANGELOG', locale: entry.locale, sort: 'recent', limit: 50 }), entry.id, 3);
  }
  const related = entry.related.filter((c) => c.type !== 'GLOSSARY_TERM' && c.id !== entry.id).slice(0, 6);
  const limit = Math.max(3, related.length);
  const cards = [...related, ...extra.filter((c) => !seen.has(c.id))].slice(0, limit);
  return { heading: entry.type === 'GUIDE' ? 'Posts in this guide' : entry.type === 'CHANGELOG' ? 'More updates' : 'Keep reading', cards };
}

function TemplateDownload({ entry }: { entry: PublicEntry }) {
  if (entry.data.type !== 'TEMPLATE') return null;
  const file = mediaById(entry.media, entry.data.fileMediaId);
  if (!file) return null;
  const name = `${entry.path.split('/').pop() || 'template'}.${entry.data.format}`;
  return (
    <Container size="prose">
      <div className="flex flex-col gap-5 rounded-xl border border-line bg-surface-2 p-6 sm:flex-row sm:items-center sm:justify-between md:p-7">
        <div className="flex items-center gap-4">
          <span aria-hidden className="inline-flex size-12 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-600/15 ink:bg-brand-400/10 ink:text-brand-300">
            <CmsIcon name={entry.data.format === 'xlsx' || entry.data.format === 'csv' ? 'file-spreadsheet' : 'file-text'} size={24} />
          </span>
          <div>
            <p className="font-semibold text-fg-strong">{file.alt || entry.title}</p>
            <p className="text-small text-fg-subtle">
              {FORMAT_LABEL[entry.data.format]} · {bytes(file.bytes)} · free, no sign-up
            </p>
          </div>
        </div>
        <a
          href={file.url}
          download={name}
          data-track="cta_click"
          data-track-label={`Template download: ${entry.title}`}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-brand-700 px-5 text-[0.9375rem] font-medium text-white shadow-e1 transition-colors duration-fast hover:bg-brand-800"
        >
          <CmsIcon name="download" size={18} />
          Download
        </a>
      </div>
    </Container>
  );
}

function CaseResults({ entry }: { entry: PublicEntry }) {
  if (entry.data.type !== 'CASE_STUDY' || !entry.data.results.length) return null;
  return (
    <Container size="prose">
      <dl className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2">
        {entry.data.results.map((r) => (
          <div key={r.label} className="bg-surface p-5">
            <dt className="text-small text-fg-muted">{r.label}</dt>
            <dd className="mt-1 text-h3 tabular-nums text-fg-strong">{r.value}</dd>
            <dd className="mt-1 text-xs text-fg-subtle">{r.sourceNote}</dd>
          </div>
        ))}
      </dl>
    </Container>
  );
}

export interface ArticleTemplateProps {
  entry: PublicEntry;
  site: SiteSettings;
  entity: PublicEntity | null;
}

export async function ArticleTemplate({ entry, site, entity }: ArticleTemplateProps) {
  const eyebrow = eyebrowFor(entry);
  const toc = (entry.data as { toc?: boolean }).toc !== false ? outline(entry, { withFaqs: true }) : [];
  const [more] = await Promise.all([moreReading(entry)]);
  const terms = [...(entry.tags.GLOSSARY_TERM ?? []), ...entry.related.filter((c) => c.type === 'GLOSSARY_TERM')].filter(
    (card, i, list) => list.findIndex((other) => other.id === card.id) === i,
  );
  const graph = s5Graph({ entry, site, entity, faq: true });

  return (
    <>
      <JsonLd data={graph} />
      <FixtureRibbon entry={entry} />
      <article>
        <PageHeader entry={entry} eyebrow={eyebrow.label || undefined} eyebrowHref={eyebrow.href} size="article" meta={entry.type !== 'CHANGELOG' ? <Byline entry={entry} /> : undefined} />

        <div className={toc.length > 1 ? 'mx-auto max-w-wide xl:grid xl:grid-cols-[minmax(0,1fr)_14rem] xl:gap-6 xl:pr-gutter' : undefined}>
          <div className="min-w-0 pb-section pt-10 md:pt-14">
            {toc.length > 2 ? <TocInline items={toc} className="mb-10 xl:hidden" /> : null}
            {entry.type === 'TEMPLATE' ? (
              <div className="mb-10">
                <TemplateDownload entry={entry} />
              </div>
            ) : null}
            {entry.type === 'CASE_STUDY' ? (
              <div className="mb-10">
                <CaseResults entry={entry} />
              </div>
            ) : null}

            <Body entry={entry} variant="article" withFaqs />
            {terms.length || entry.author ? (
              <Container size="prose" className="mt-14 space-y-8">
                {terms.length ? (
                  <div>
                    <h2 className="text-eyebrow uppercase text-fg-subtle">Terms in this {entry.type === 'GUIDE' ? 'guide' : 'article'}</h2>
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {terms.map((term) => (
                        <li key={term.id}>
                          <Link
                            href={relativePath(term)}
                            className="inline-flex items-center rounded-full border border-line-strong bg-surface px-3 py-1 text-small text-fg transition-colors duration-fast hover:border-brand-600 hover:text-link"
                          >
                            {term.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {entry.author ? <AuthorBox person={entry.author} /> : null}
              </Container>
            ) : null}
          </div>
          <TocRail items={toc} />
        </div>
      </article>

      {more.cards.length ? (
        <section aria-labelledby="more-reading" className="theme-muted border-t border-line/70 bg-canvas py-16 md:py-20">
          <Container>
            <div className="flex items-end justify-between gap-6">
              <h2 id="more-reading" className="text-h3 text-fg-strong">
                {more.heading}
              </h2>
              <Link href={eyebrow.href ?? '/blog'} className="hidden text-small font-medium text-link hover:underline hover:underline-offset-4 sm:inline">
                See all
              </Link>
            </div>
            <CardGrid className="mt-8">
              {more.cards.map((card) => (
                <ContentCard key={card.id} card={card} eyebrow={card.type === 'GUIDE' ? 'Guide' : card.type === 'TOOL' ? 'Free tool' : undefined} />
              ))}
            </CardGrid>
          </Container>
        </section>
      ) : null}
      <ClosingCta entry={entry} site={site} />
    </>
  );
}
