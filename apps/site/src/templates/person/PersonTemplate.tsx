/**
 * Person template (ARCH 8, PERSON): an author or reviewer page. H1 name,
 * role, bio (summary + body blocks), the topics they know (knowsAbout),
 * verified profiles (sameAs, rel="me") and their writing. Schema: ProfilePage
 * with a Person node (S1 graph), which article pages reference as author.
 *
 * Writing list: the public entries API has no author filter yet (reported),
 * so the page lists the entries the editor relates to the person plus any
 * entryGrid blocks on the entry.
 */
import Link from 'next/link';
import type { PublicEntity, PublicEntry, SiteSettings } from '@/lib/cms/contract/cms-contract';
import { PageBreadcrumbs } from '@/components/layout/Breadcrumbs';
import { Container } from '@/components/ui/Container';
import { JsonLd } from '@/components/seo/JsonLd';
import { CmsImage, mediaById } from '@/lib/media';
import { Body } from '../article/parts/Body';
import { CardGrid, ContentCard } from '../article/parts/Cards';
import { FixtureRibbon } from '../article/parts/FixtureRibbon';
import { initials } from '../article/parts/format';
import { s5Graph } from '../article/parts/graph';

const TYPE_LABEL: Partial<Record<string, string>> = { GUIDE: 'Guide', BLOG_POST: 'Article', COMPLIANCE: 'Compliance', CASE_STUDY: 'Customer story' };

function hostLabel(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    if (host.includes('linkedin')) return 'LinkedIn';
    if (host === 'x.com' || host.includes('twitter')) return 'X';
    if (host.includes('github')) return 'GitHub';
    return host;
  } catch {
    return url;
  }
}

export function PersonTemplate({ entry, site, entity }: { entry: PublicEntry; site: SiteSettings; entity: PublicEntity | null }) {
  if (entry.data.type !== 'PERSON') return null;
  const data = entry.data;
  const photo = mediaById(entry.media, data.photoMediaId) ?? entry.image;
  const graph = s5Graph({ entry, site, entity });
  const writing = entry.related.filter((card) => card.type !== 'PERSON');

  return (
    <>
      <JsonLd data={graph} />
      <FixtureRibbon entry={entry} />
      <header className="relative isolate overflow-hidden border-b border-line/70">
        <div aria-hidden className="bg-grid pointer-events-none absolute inset-x-0 top-0 -z-10 h-[24rem]" />
        <Container className="pb-12 pt-6 md:pb-16 md:pt-8">
          <PageBreadcrumbs crumbs={entry.breadcrumbs} />
          <div className="mt-10 flex flex-col gap-8 md:mt-14 md:flex-row md:items-center">
            {photo ? (
              <CmsImage media={photo} sizes="128px" aspectRatio="1:1" maxWidth={256} alt="" priority className="size-28 shrink-0 rounded-full object-cover ring-4 ring-canvas md:size-32" />
            ) : (
              <span aria-hidden className="inline-flex size-28 shrink-0 items-center justify-center rounded-full bg-brand-50 text-h2 text-brand-800 ring-1 ring-inset ring-brand-600/15 md:size-32 ink:bg-brand-400/10 ink:text-brand-200">
                {initials(data.name)}
              </span>
            )}
            <div className="max-w-3xl">
              <h1 className="text-h1 text-fg-strong">{data.name}</h1>
              <p className="mt-2 text-body-lg text-fg-muted">
                {data.role}
                {entity?.brandName ? ` at ${entity.brandName}` : ''}
              </p>
              {data.sameAs.length ? (
                <ul className="mt-5 flex flex-wrap gap-2">
                  {data.sameAs.map((url) => (
                    <li key={url}>
                      <a href={url} rel="me noopener" className="inline-flex items-center rounded-full border border-line-strong px-3 py-1 text-small text-fg transition-colors duration-fast hover:border-fg-subtle">
                        {hostLabel(url)}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </Container>
      </header>

      <div className="py-12 md:py-16">
        <Container size="prose" className="space-y-8">
          {entry.summary ? <p className="text-body-lg text-fg">{entry.summary}</p> : null}
          {data.knowsAbout.length ? (
            <div>
              <h2 className="text-eyebrow uppercase text-fg-subtle">Writes about</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {data.knowsAbout.map((topic) => (
                  <li key={topic} className="rounded-full bg-surface-3 px-3 py-1 text-small text-fg">
                    {topic}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Container>
        <div className="mt-8">
          <Body entry={entry} variant="article" />
        </div>
      </div>

      {writing.length ? (
        <section aria-labelledby="writing" className="theme-muted border-t border-line/70 bg-canvas py-16 md:py-20">
          <Container>
            <h2 id="writing" className="text-h3 text-fg-strong">
              Writing by {data.name}
            </h2>
            <CardGrid className="mt-8">
              {writing.map((card) => (
                <ContentCard key={card.id} card={card} eyebrow={TYPE_LABEL[card.type]} />
              ))}
            </CardGrid>
          </Container>
        </section>
      ) : null}

      <Container className="pb-12">
        <Link href="/team" className="text-small font-medium text-link hover:underline hover:underline-offset-4">
          Meet the team
        </Link>
      </Container>
    </>
  );
}
