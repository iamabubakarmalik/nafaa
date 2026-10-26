/**
 * Content hubs owned by S5 (ARCH 5.2: hubs are PAGE entries at the type
 * root; blog categories are BLOG_CATEGORY entries). Each hub renders its
 * own list from the public entries API (cache-tagged by type, so a publish
 * refreshes it), the hub entry's blocks (answer box, FAQs, CTA) after it,
 * and one JSON-LD graph: CollectionPage + ItemList of the listed pages.
 *
 * Variants: blog index, blog category, guides (pillar hub), tools,
 * templates, team, changelog, customer stories.
 */
import Link from 'next/link';
import type { ReactNode } from 'react';
import type { EntryCard, PublicEntity, PublicEntry, SiteSettings } from '@/lib/cms/contract/cms-contract';
import { Container } from '@/components/ui/Container';
import { cx } from '@/components/ui/cx';
import { JsonLd } from '@/components/seo/JsonLd';
import { TOOL_META } from '@/components/islands/tools/meta';
import { localizePath } from '@/lib/cms/locale';
import { uiStrings } from '@/lib/i18n/ui';
import { CmsIcon } from '@/lib/icons';
import { CmsImage, mediaById } from '@/lib/media';
import { loadCards, loadEntriesFor } from './data';
import { Body, ClosingCta } from './parts/Body';
import { CardGrid, ContentCard, relativePath } from './parts/Cards';
import { FixtureRibbon } from './parts/FixtureRibbon';
import { formatDate, formatMonth, initials, isoDate } from './parts/format';
import { s5Graph } from './parts/graph';
import { PageHeader } from './parts/Headers';
import { ListFilter } from './parts/ListFilter';

interface HubBase {
  entry: PublicEntry;
  site: SiteSettings;
  entity: PublicEntity | null;
}

const items = (cards: EntryCard[]) => cards.map((c) => ({ name: c.title, url: c.url }));

function HubShell({ base, cards, eyebrow, header, children, skipGridsOf }: { base: HubBase; cards: EntryCard[]; eyebrow?: string; header?: ReactNode; children: ReactNode; skipGridsOf: PublicEntry['type'][] }) {
  const { entry, site, entity } = base;
  // The hub graph has no FAQPage of its own; add it for exactly the FAQs shown below.
  const graph = s5Graph({ entry, site, entity, items: items(cards), faq: true });
  return (
    <>
      <JsonLd data={graph} />
      <FixtureRibbon entry={entry} />
      <PageHeader entry={entry} eyebrow={eyebrow}>
        {header}
      </PageHeader>
      {children}
      <Body entry={entry} variant="hub" skipGridsOf={skipGridsOf} withFaqs />
      <ClosingCta entry={entry} site={site} />
    </>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-line-strong p-8 text-center text-fg-muted">{children}</p>;
}

// ─── Blog ───

function CategoryNav({ categories, current, locale }: { categories: EntryCard[]; current?: string; locale: string }) {
  if (!categories.length) return null;
  const t = uiStrings(locale).content;
  const chip = 'inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full border px-3.5 text-small font-medium transition-colors duration-fast';
  return (
    <nav aria-label={t.blogCategories}>
      <ul className="flex flex-wrap gap-2">
        <li>
          <Link href={localizePath(locale, '/blog')} aria-current={!current ? 'page' : undefined} className={cx(chip, !current ? 'border-fg-strong bg-fg-strong text-canvas' : 'border-line-strong text-fg-muted hover:text-fg-strong')}>
            {t.allPosts}
          </Link>
        </li>
        {categories.map((c) => {
          const active = c.path === current;
          return (
            <li key={c.id}>
              <Link href={relativePath(c)} aria-current={active ? 'page' : undefined} className={cx(chip, active ? 'border-fg-strong bg-fg-strong text-canvas' : 'border-line-strong text-fg-muted hover:text-fg-strong')}>
                {c.icon ? <CmsIcon name={c.icon} size={15} /> : null}
                {c.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Post id → its category card, from one list request per category. */
async function categoryOfPosts(categories: EntryCard[], locale: string): Promise<Map<string, EntryCard>> {
  const lists = await Promise.all(categories.map((c) => loadCards({ type: 'BLOG_POST', locale, tag: c.id, limit: 200 })));
  const map = new Map<string, EntryCard>();
  lists.forEach((posts, i) => posts.forEach((p) => map.has(p.id) || map.set(p.id, categories[i]!)));
  return map;
}

export async function BlogIndexTemplate(base: HubBase) {
  const { entry } = base;
  const [posts, categories, guides] = await Promise.all([
    loadCards({ type: 'BLOG_POST', locale: entry.locale, sort: 'recent', limit: 60 }),
    loadCards({ type: 'BLOG_CATEGORY', locale: entry.locale, sort: 'order', limit: 30 }),
    loadCards({ type: 'GUIDE', locale: entry.locale, sort: 'order', limit: 3 }),
  ]);
  const categoryOf = await categoryOfPosts(categories, entry.locale);
  const [featured, ...rest] = posts;
  const t = uiStrings(entry.locale).content;

  return (
    <HubShell
      base={base}
      cards={posts}
      eyebrow={t.blog}
      skipGridsOf={['BLOG_POST', 'BLOG_CATEGORY']}
      header={
        <div className="space-y-6">
          <CategoryNav categories={categories} locale={entry.locale} />
          {posts.length > 6 ? <ListFilter target="post-list" label={t.searchBlog} placeholder={t.searchPosts} countLabel={t.matchingPosts} emptyLabel={t.filterEmpty} /> : null}
        </div>
      }
    >
      <Container className="py-12 md:py-16">
        {posts.length ? (
          <CardGrid id="post-list">
            {featured ? <ContentCard card={featured} variant="featured" headingAs="h2" eyebrow={categoryOf.get(featured.id)?.title ?? t.latest} icon={categoryOf.get(featured.id)?.icon} filter /> : null}
            {rest.map((card) => (
              <ContentCard key={card.id} card={card} headingAs="h2" eyebrow={categoryOf.get(card.id)?.title} filter />
            ))}
          </CardGrid>
        ) : (
          <EmptyState>{t.firstPosts}</EmptyState>
        )}
      </Container>
      {guides.length ? (
        <section aria-labelledby="pillar-guides" className="theme-muted border-y border-line/70 bg-canvas py-14 md:py-16">
          <Container>
            <div className="flex items-end justify-between gap-6">
              <div>
                <p className="text-eyebrow uppercase text-link">{t.goDeeper}</p>
                <h2 id="pillar-guides" className="mt-2 text-h3 text-fg-strong">
                  {t.guides}
                </h2>
              </div>
              <Link href={localizePath(entry.locale, '/guides')} className="text-small font-medium text-link hover:underline hover:underline-offset-4">
                {t.allGuides}
              </Link>
            </div>
            <CardGrid className="mt-8">
              {guides.map((card) => (
                <ContentCard key={card.id} card={card} eyebrow={t.typeLabels.GUIDE} date={null} />
              ))}
            </CardGrid>
          </Container>
        </section>
      ) : null}
    </HubShell>
  );
}

export async function BlogCategoryTemplate(base: HubBase) {
  const { entry } = base;
  const [posts, categories] = await Promise.all([
    loadCards({ type: 'BLOG_POST', locale: entry.locale, tag: entry.id, sort: 'recent', limit: 60 }),
    loadCards({ type: 'BLOG_CATEGORY', locale: entry.locale, sort: 'order', limit: 30 }),
  ]);
  const t = uiStrings(entry.locale).content;
  return (
    <HubShell base={base} cards={posts} eyebrow={t.blogCategory} skipGridsOf={['BLOG_POST']} header={<CategoryNav categories={categories} current={entry.path} locale={entry.locale} />}>
      <Container className="py-12 md:py-16">
        {posts.length ? (
          <CardGrid>
            {posts.map((card) => (
              <ContentCard key={card.id} card={card} headingAs="h2" />
            ))}
          </CardGrid>
        ) : (
          <EmptyState>{t.noPostsInCategory}</EmptyState>
        )}
      </Container>
    </HubShell>
  );
}

// ─── Guides (pillar hub) ───

export async function GuidesHubTemplate(base: HubBase) {
  const { entry } = base;
  const guides = await loadCards({ type: 'GUIDE', locale: entry.locale, sort: 'order', limit: 50 });
  const clusters = await Promise.all(guides.map((g) => loadCards({ type: 'BLOG_POST', locale: entry.locale, tag: g.id, sort: 'recent', limit: 3 })));

  return (
    <HubShell base={base} cards={guides} eyebrow="Guides" skipGridsOf={['GUIDE']}>
      <Container className="py-12 md:py-16">
        {guides.length ? (
          <ol role="list" className="space-y-5">
            {guides.map((guide, i) => (
              <li key={guide.id} className="group relative grid overflow-hidden rounded-xl border border-line bg-surface shadow-e1 transition-[border-color,box-shadow] duration-base ease-out hover:border-line-strong hover:shadow-e2 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] ink:shadow-none">
                <div className="p-7 md:p-9">
                  <p className="text-eyebrow uppercase text-fg-subtle">
                    Guide {String(i + 1).padStart(2, '0')}
                    {guide.contentUpdatedAt ? (
                      <>
                        {' '}
                        · Updated <time dateTime={isoDate(guide.contentUpdatedAt)}>{formatDate(guide.contentUpdatedAt)}</time>
                      </>
                    ) : null}
                  </p>
                  <h2 className="mt-3 text-h3 text-fg-strong">
                    <Link href={relativePath(guide)} className="after:absolute after:inset-0 group-hover:text-link">
                      {guide.title}
                    </Link>
                  </h2>
                  {guide.summary ? <p className="mt-3 max-w-measure text-fg-muted">{guide.summary}</p> : null}
                  <p className="mt-6 inline-flex items-center gap-1.5 text-small font-medium text-link">
                    Read the guide
                    <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-fast group-hover:translate-x-0.5">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </p>
                </div>
                <div className="relative z-10 border-t border-line bg-surface-2 p-7 md:border-l md:border-t-0 md:p-9">
                  {clusters[i]?.length ? (
                    <>
                      <p className="text-eyebrow uppercase text-fg-subtle">Related posts</p>
                      <ul className="mt-3 space-y-3">
                        {clusters[i]!.map((post) => (
                          <li key={post.id}>
                            <Link href={relativePath(post)} className="text-small font-medium text-fg hover:text-link">
                              {post.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <div aria-hidden className="bg-dots absolute inset-0" />
                  )}
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState>The first guides are being written.</EmptyState>
        )}
      </Container>
    </HubShell>
  );
}

// ─── Tools ───

export async function ToolsHubTemplate(base: HubBase) {
  const { entry } = base;
  const cards = await loadCards({ type: 'TOOL', locale: entry.locale, sort: 'order', limit: 50 });
  const tools = await loadEntriesFor(cards);
  const keyOf = new Map(tools.map((t) => [t.id, t.data.type === 'TOOL' ? t.data.toolKey : undefined]));
  const t = uiStrings(entry.locale).content;
  return (
    <HubShell base={base} cards={cards} eyebrow={t.freeTools} skipGridsOf={['TOOL']}>
      <Container className="py-12 md:py-16">
        {cards.length ? (
          <CardGrid>
            {cards.map((card) => {
              const key = keyOf.get(card.id);
              return <ContentCard key={card.id} card={card} headingAs="h2" icon={key ? TOOL_META[key].icon : 'calculator'} date={null} meta={<span>{t.freeDot}</span>} />;
            })}
          </CardGrid>
        ) : (
          <EmptyState>{t.toolsSoon}</EmptyState>
        )}
      </Container>
    </HubShell>
  );
}

// ─── Templates ───

const FORMAT_BADGE: Record<string, string> = { xlsx: 'XLSX', pdf: 'PDF', docx: 'DOCX', csv: 'CSV' };

export async function TemplatesHubTemplate(base: HubBase) {
  const { entry } = base;
  const cards = await loadCards({ type: 'TEMPLATE', locale: entry.locale, sort: 'order', limit: 100 });
  const full = await loadEntriesFor(cards);
  const formatOf = new Map(full.map((t) => [t.id, t.data.type === 'TEMPLATE' ? t.data.format : undefined]));
  const t = uiStrings(entry.locale).content;
  return (
    <HubShell base={base} cards={cards} eyebrow={t.freeTemplates} skipGridsOf={['TEMPLATE']}>
      <Container className="py-12 md:py-16">
        {cards.length ? (
          <CardGrid>
            {cards.map((card) => {
              const format = formatOf.get(card.id);
              return (
                <ContentCard
                  key={card.id}
                  card={card}
                  headingAs="h2"
                  icon={format === 'xlsx' || format === 'csv' ? 'file-spreadsheet' : 'file-text'}
                  date={null}
                  meta={format ? <span className="rounded border border-line-strong px-1.5 py-px text-xs font-semibold tracking-wide text-fg-muted">{FORMAT_BADGE[format]}</span> : undefined}
                />
              );
            })}
          </CardGrid>
        ) : (
          <EmptyState>{t.templatesSoon}</EmptyState>
        )}
      </Container>
    </HubShell>
  );
}

// ─── Team ───

export async function TeamHubTemplate(base: HubBase) {
  const { entry } = base;
  const cards = await loadCards({ type: 'PERSON', locale: entry.locale, sort: 'order', limit: 100 });
  const people = await loadEntriesFor(cards);
  return (
    <HubShell base={base} cards={cards} eyebrow="Team" skipGridsOf={['PERSON']}>
      <Container className="py-12 md:py-16">
        {people.length ? (
          <ul role="list" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {people.map((person) => {
              if (person.data.type !== 'PERSON') return null;
              const photo = mediaById(person.media, person.data.photoMediaId) ?? person.image;
              return (
                <li key={person.id} className="group relative flex items-center gap-4 rounded-lg border border-line bg-surface p-5 shadow-e1 transition-[border-color,box-shadow] duration-fast hover:border-line-strong hover:shadow-e2 ink:shadow-none">
                  {photo ? (
                    <CmsImage media={photo} sizes="56px" aspectRatio="1:1" maxWidth={112} alt="" className="size-14 shrink-0 rounded-full object-cover" />
                  ) : (
                    <span aria-hidden className="inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-brand-50 font-semibold text-brand-800 ink:bg-brand-400/10 ink:text-brand-200">
                      {initials(person.data.name)}
                    </span>
                  )}
                  <div className="min-w-0">
                    <h2 className="text-h4 text-fg-strong">
                      <Link href={relativePath(person)} className="after:absolute after:inset-0 group-hover:text-link">
                        {person.data.name}
                      </Link>
                    </h2>
                    <p className="text-small text-fg-muted">{person.data.role}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState>Team profiles are on their way.</EmptyState>
        )}
      </Container>
    </HubShell>
  );
}

// ─── Changelog ───

const KIND: Record<string, { label: string; tone: string }> = {
  new: { label: 'New', tone: 'bg-brand-50 text-brand-800 ring-brand-600/20 ink:bg-brand-400/10 ink:text-brand-200' },
  improved: { label: 'Improved', tone: 'bg-sky-50 text-sky-800 ring-sky-600/20 ink:bg-sky-400/10 ink:text-sky-200' },
  fixed: { label: 'Fixed', tone: 'bg-surface-3 text-fg-muted ring-line-strong' },
};

export async function ChangelogHubTemplate(base: HubBase) {
  const { entry } = base;
  const cards = await loadCards({ type: 'CHANGELOG', locale: entry.locale, sort: 'recent', limit: 60 });
  const full = (await loadEntriesFor(cards)).flatMap((e) => (e.data.type === 'CHANGELOG' ? [{ entry: e, data: e.data }] : []));
  full.sort((a, b) => b.data.date.localeCompare(a.data.date));
  const months = new Map<string, typeof full>();
  for (const item of full) {
    const month = formatMonth(item.data.date);
    months.set(month, [...(months.get(month) ?? []), item]);
  }
  return (
    <HubShell base={base} cards={cards} eyebrow="Changelog" skipGridsOf={['CHANGELOG']}>
      <Container className="py-12 md:py-16">
        {full.length ? (
          <div className="mx-auto max-w-3xl">
            {[...months.entries()].map(([month, list]) => (
              <section key={month} aria-label={month} className="relative border-l border-line pb-10 pl-8 last:pb-0">
                <span aria-hidden className="absolute -left-[5px] top-1.5 size-2.5 rounded-full border-2 border-canvas bg-brand-600" />
                <h2 className="text-eyebrow uppercase text-fg-subtle">{month}</h2>
                <ul className="mt-4 space-y-4">
                  {list.map(({ entry: e, data }) => (
                    <li key={e.id} data-reveal="fade-up" className="group relative rounded-lg border border-line bg-surface p-5 transition-[border-color,box-shadow] duration-fast hover:border-line-strong hover:shadow-e1">
                      <div className="flex flex-wrap items-center gap-2 text-small text-fg-subtle">
                        <span className={cx('rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', KIND[data.kind]?.tone)}>{KIND[data.kind]?.label}</span>
                        <time dateTime={isoDate(data.date)}>{formatDate(data.date)}</time>
                        {data.version ? <span className="font-mono text-xs">v{data.version.replace(/^v/, '')}</span> : null}
                      </div>
                      <h3 className="mt-2 text-h4 text-fg-strong">
                        <Link href={relativePath(e)} className="after:absolute after:inset-0 group-hover:text-link">
                          {e.title}
                        </Link>
                      </h3>
                      {e.summary ? <p className="mt-1 text-small text-fg-muted">{e.summary}</p> : null}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <EmptyState>Updates will be listed here as they ship.</EmptyState>
        )}
      </Container>
    </HubShell>
  );
}

// ─── Customer stories ───

export async function CustomersHubTemplate(base: HubBase) {
  const { entry } = base;
  const cards = await loadCards({ type: 'CASE_STUDY', locale: entry.locale, sort: 'recent', limit: 60 });
  return (
    <HubShell base={base} cards={cards} eyebrow="Customers" skipGridsOf={['CASE_STUDY']}>
      <Container className="py-12 md:py-16">
        {cards.length ? (
          <CardGrid>
            {cards.map((card) => (
              <ContentCard key={card.id} card={card} headingAs="h2" eyebrow="Customer story" />
            ))}
          </CardGrid>
        ) : (
          <EmptyState>Stories from real shops will appear here once they agree to share them.</EmptyState>
        )}
      </Container>
    </HubShell>
  );
}

