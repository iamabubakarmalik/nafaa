/**
 * Hub pages for the S4 sections (/pos-software, /compliance, /best,
 * /compare). A hub is a PAGE entry (ARCH 5.2): its blocks render first, and
 * the section's directory is added after them unless the editor already
 * placed an entryGrid. With no PAGE entry published yet, the route still
 * shows the directory so breadcrumbs and menus never lead to a 404, but that
 * generated page is noindex: indexable hub copy belongs in the CMS.
 */
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { PageBreadcrumbs } from '@/components/layout/Breadcrumbs';
import { Container } from '@/components/ui/Container';
import { JsonLd } from '@/components/seo/JsonLd';
import type { PublicEntry } from '@/lib/cms/contract/cms-contract';
import { getEntry, getLayout } from '@/lib/cms/client';
import { isProduction } from '@/lib/cms/env';
import { DEFAULT_LOCALE } from '@/lib/cms/locale';
import { buildEntryGraph, buildSiteGraph, itemListNode } from '@/lib/seo/graph';
import { buildEntryMetadata, buildPageMetadata } from '@/lib/seo/metadata';
import { absoluteUrl } from '@/lib/cms/env';
import { Blocks } from './blocks';
import { loadEntity } from './data';
import { MetaBar, TemplateFrame } from './ui';

export interface HubCopy {
  path: string;
  title: string;
  intro: string;
}

/** The hub's PAGE entry, or null. Hubs never use fixtures: S3 owns PAGE fixtures. */
export async function loadHubEntry(path: string, locale: string = DEFAULT_LOCALE): Promise<PublicEntry | null> {
  try {
    const entry = await getEntry(path, locale);
    return entry && entry.type === 'PAGE' ? entry : null;
  } catch (error) {
    if (isProduction) throw error;
    return null;
  }
}

export function hubMetadata(entry: PublicEntry | null, copy: HubCopy): Metadata {
  if (entry) return buildEntryMetadata(entry, { hasOgRoute: false });
  return buildPageMetadata({ title: copy.title, description: copy.intro, path: copy.path, noindex: true });
}

export async function HubView({
  entry,
  copy,
  items,
  children,
}: {
  entry: PublicEntry | null;
  copy: HubCopy;
  /** Directory entries for the ItemList node. */
  items: { name: string; url: string }[];
  /** The directory. */
  children: ReactNode;
}) {
  const locale = entry?.locale ?? DEFAULT_LOCALE;
  const [{ site }, entity] = await Promise.all([getLayout(locale), loadEntity(locale)]);

  if (entry) {
    const hasGrid = entry.blocks.some((block) => block.type === 'entryGrid');
    return (
      <TemplateFrame entry={entry} graph={buildEntryGraph(entry, { site, entity, items })}>
        <MetaBar entry={entry} />
        <Blocks entry={entry} slots={{ end: hasGrid ? null : children }} />
      </TemplateFrame>
    );
  }

  const siteGraph = buildSiteGraph({ site, entity });
  const list = itemListNode(absoluteUrl(`${copy.path}#list`), items);
  const graph = list ? { ...siteGraph, '@graph': [...(siteGraph['@graph'] as unknown[]), list] } : siteGraph;
  return (
    <>
      <JsonLd data={graph} />
      <Container className="pb-6 pt-6 md:pt-8">
        <PageBreadcrumbs
          crumbs={[
            { name: 'Home', path: '/', url: absoluteUrl('/') },
            { name: copy.title, path: copy.path, url: absoluteUrl(copy.path) },
          ]}
        />
        <h1 className="mt-10 max-w-measure text-h1 text-fg-strong md:mt-14">{copy.title}</h1>
        <p className="mt-4 max-w-measure text-body-lg text-fg-muted">{copy.intro}</p>
      </Container>
      {children}
    </>
  );
}
