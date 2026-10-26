/**
 * The one place the S5 templates hand blocks to S2's BlockRenderer.
 *
 * - The template renders its own header (H1, intro, byline), so `hero` is
 *   always excluded here, and hubs can drop the entryGrid blocks whose list
 *   the template already shows (`skipGridsOf`).
 * - `withFaqs`: types whose block palette has no `faq` block (articles,
 *   glossary, docs) still show the entry's FAQs, through the same FAQ block
 *   as every other page, placed after the content. FAQPage schema is added
 *   by parts/graph.ts from the same list.
 * - `bodyBlocks()` is exported so the table of contents walks exactly the
 *   blocks the renderer receives (heading ids match).
 */
import type { ReactNode } from 'react';
import type { Block, CmsEntryType, PublicEntry, SiteSettings, ToolKey } from '@/lib/cms/contract/cms-contract';
import { BlockRenderer } from '@/components/blocks';
import { uiStrings } from '@/lib/i18n/ui';

export interface BodyOptions {
  skipGridsOf?: readonly CmsEntryType[];
  withFaqs?: boolean;
}

export function bodyBlocks(entry: PublicEntry, { skipGridsOf, withFaqs }: BodyOptions = {}): Block[] {
  const blocks = entry.blocks.filter((block) => {
    if (block.hidden || block.type === 'hero') return false;
    if (block.type === 'entryGrid' && skipGridsOf?.includes(block.entryType)) return false;
    return true;
  });
  if (withFaqs && entry.faqs.length && !blocks.some((block) => block.type === 'faq')) {
    blocks.push({ id: 'faqs-auto', type: 'faq' });
  }
  return blocks;
}

export interface BodyProps extends BodyOptions {
  entry: PublicEntry;
  /** Layout hint for the wrapper (article and docs columns, hubs, tools). */
  variant?: 'article' | 'docs' | 'hub' | 'tool';
  renderTool?: (toolKey: ToolKey) => ReactNode;
}

export function Body({ entry, variant = 'article', skipGridsOf, withFaqs, renderTool }: BodyProps) {
  const blocks = bodyBlocks(entry, { skipGridsOf, withFaqs });
  if (!blocks.length) return null;
  return (
    // The template's header already gives the page its top rhythm, so the first block starts closer.
    <div data-body={variant} className={variant === 'hub' ? undefined : '[&>section:first-child]:!pt-6 md:[&>section:first-child]:!pt-10'}>
      <BlockRenderer blocks={blocks} entry={entry} renderTool={renderTool} />
    </div>
  );
}

/**
 * The closing call to action, unless the entry already ends with its own
 * `cta` block. Labels are plain; links come from site settings (sign-up and
 * demo), so nothing is hard-coded.
 */
export function closingCtaBlock(entry: PublicEntry, site: SiteSettings): Block | null {
  if (entry.blocks.some((block) => block.type === 'cta' && !block.hidden)) return null;
  if (!site.signupUrl) return null;
  const t = uiStrings(entry.locale).content.closing;
  return {
    id: 'cta-closing',
    type: 'cta',
    heading: t.heading,
    body: t.body,
    primaryCta: { label: t.primary, href: site.signupUrl, trackAs: 'closing_signup' },
    ...(site.demoPath ? { secondaryCta: { label: t.secondary, href: site.demoPath, trackAs: 'closing_demo' } } : {}),
  };
}

export function ClosingCta({ entry, site }: { entry: PublicEntry; site: SiteSettings }) {
  const block = closingCtaBlock(entry, site);
  if (!block) return null;
  return <BlockRenderer blocks={[block]} entry={entry} />;
}
