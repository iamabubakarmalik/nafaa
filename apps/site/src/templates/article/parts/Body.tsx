/**
 * The one place the S5 templates hand blocks to S2's BlockRenderer.
 *
 * - The template renders its own header (H1, intro, byline), so `hero` is
 *   always excluded here, and hubs can drop the entryGrid blocks whose list
 *   the template already shows (`skipGridsOf`).
 * - `withFaqs`: types whose block palette has no `faq` block (articles,
 *   glossary, docs) still show the entry's FAQs, through the same FAQ block
 *   as every other page, placed after the content and before a closing
 *   `cta` block, so the call to action ends the page. FAQPage schema is added
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
  /**
   * The `cta` blocks that end the entry are left out here and rendered by
   * <ClosingCta> at the end of the page, full width, after the template's
   * own closing parts (author, related reading, next/previous).
   */
  ctaAtEnd?: boolean;
}

/** Visible `cta` blocks at the very end of the entry's blocks, in order. */
function trailingCtas(entry: PublicEntry): Block[] {
  const visible = entry.blocks.filter((block) => !block.hidden && block.type !== 'hero');
  let at = visible.length;
  while (at > 0 && visible[at - 1]!.type === 'cta') at -= 1;
  return visible.slice(at);
}

export function bodyBlocks(entry: PublicEntry, { skipGridsOf, withFaqs, ctaAtEnd }: BodyOptions = {}): Block[] {
  const held = new Set(ctaAtEnd ? trailingCtas(entry) : []);
  const blocks = entry.blocks.filter((block) => {
    if (block.hidden || block.type === 'hero' || held.has(block)) return false;
    if (block.type === 'entryGrid' && skipGridsOf?.includes(block.entryType)) return false;
    return true;
  });
  if (withFaqs && entry.faqs.length && !blocks.some((block) => block.type === 'faq')) {
    // A closing `cta` block stays last: the FAQs go in before it.
    let at = blocks.length;
    while (at > 0 && blocks[at - 1]!.type === 'cta') at -= 1;
    blocks.splice(at, 0, { id: 'faqs-auto', type: 'faq' });
  }
  return blocks;
}

export interface BodyProps extends BodyOptions {
  entry: PublicEntry;
  /** Layout hint for the wrapper (article and docs columns, hubs, tools). */
  variant?: 'article' | 'docs' | 'hub' | 'tool';
  renderTool?: (toolKey: ToolKey) => ReactNode;
}

export function Body({ entry, variant = 'article', skipGridsOf, withFaqs, ctaAtEnd, renderTool }: BodyProps) {
  const blocks = bodyBlocks(entry, { skipGridsOf, withFaqs, ctaAtEnd });
  if (!blocks.length) return null;
  return (
    // The template's header already gives the page its top rhythm, so the first block starts closer.
    <div data-body={variant} className={variant === 'hub' ? undefined : '[&>section:first-child]:!pt-6 md:[&>section:first-child]:!pt-10'}>
      <BlockRenderer blocks={blocks} entry={entry} renderTool={renderTool} />
    </div>
  );
}

/**
 * The closing call to action. The entry's own `cta` blocks at the end of its
 * content win (pair with `ctaAtEnd` on <Body>). Otherwise, with `fallback`,
 * a plain one with links from site settings (sign-up and demo), unless the
 * entry already places a `cta` block elsewhere. Nothing is hard-coded.
 */
export function closingCtaBlocks(entry: PublicEntry, site: SiteSettings, fallback = true): Block[] {
  const own = trailingCtas(entry);
  if (own.length) return own;
  if (!fallback || entry.blocks.some((block) => block.type === 'cta' && !block.hidden)) return [];
  if (!site.signupUrl) return [];
  const t = uiStrings(entry.locale).content.closing;
  return [
    {
      id: 'cta-closing',
      type: 'cta',
      heading: t.heading,
      body: t.body,
      primaryCta: { label: t.primary, href: site.signupUrl, trackAs: 'closing_signup' },
      ...(site.demoPath ? { secondaryCta: { label: t.secondary, href: site.demoPath, trackAs: 'closing_demo' } } : {}),
    },
  ];
}

export function ClosingCta({ entry, site, fallback = true, className }: { entry: PublicEntry; site: SiteSettings; fallback?: boolean; className?: string }) {
  const blocks = closingCtaBlocks(entry, site, fallback);
  if (!blocks.length) return null;
  return (
    <div data-closing-cta="" className={className}>
      <BlockRenderer blocks={blocks} entry={entry} />
    </div>
  );
}
