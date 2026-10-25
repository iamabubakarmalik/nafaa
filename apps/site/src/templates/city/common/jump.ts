/**
 * Jump-bar items from an entry's blocks: one chip per section title, in page
 * order, with the ids BlockRenderer gives them (`h-<block id>` for a block's
 * own title; rich-text H2s through the shared slug rules; cityFacts without
 * a heading titles each part `h-<block id>-<part>`). Well-known sections get
 * short labels; other headings are trimmed.
 */
import { markdownHeadings } from '@/components/blocks/rich-text/Markdown';
import { createSlugger } from '@/components/blocks/rich-text/slug';
import type { Block } from '@/lib/cms/contract/cms-contract';
import { truncate } from '@/lib/seo/text';
import { blockTargetId } from './blocks';
import { stringsFor } from './strings';
import type { JumpItem } from './ui';


const SKIP = new Set<Block['type']>(['hero', 'answerBox', 'cta', 'callout', 'leadForm', 'tool', 'stats', 'logoCloud', 'testimonial']);

export function jumpItemsFromBlocks(blocks: readonly Block[], locale = 'en'): JumpItem[] {
  const t = stringsFor(locale);
  const CITY_FACT_LABEL: Record<string, string> = {
    tax: t.jumpTax,
    markets: t.jumpMarkets,
    areas: t.jumpAreas,
    support: t.jumpSupport,
    nearby: t.jumpNearby,
  };
  const visible = blocks.filter((block) => block.hidden !== true);
  const slugger = createSlugger();
  for (const block of visible) {
    if (block.anchor) slugger.reserve(block.anchor);
    slugger.reserve(blockTargetId(block));
  }
  const items: JumpItem[] = [];
  const push = (id: string, label: string) => items.push({ id, label: truncate(label, 34) });

  for (const block of visible) {
    if (SKIP.has(block.type)) continue;
    switch (block.type) {
      case 'richText': {
        // Ids must come from the same slugger walk as the renderer, so every heading is read.
        const h2 = markdownHeadings(block.markdown, slugger).filter((h) => h.level === 2);
        if (h2[0]) push(h2[0].id, h2[0].text);
        break;
      }
      case 'cityFacts':
        if (block.heading) push(blockTargetId(block), block.show.map((k) => CITY_FACT_LABEL[k]).join(' & '));
        else push(`${blockTargetId(block)}-${block.show[0]}`, CITY_FACT_LABEL[block.show[0]!] ?? block.show[0]!);
        break;
      case 'faq':
        push(blockTargetId(block), t.jumpFaq);
        break;
      case 'sources':
        push(blockTargetId(block), block.heading ?? t.sources);
        break;
      default:
        if ('heading' in block && typeof block.heading === 'string' && block.heading.trim()) push(blockTargetId(block), block.heading);
    }
  }
  return items;
}

/** Inserts a template-owned section before the item with id `beforeId` (or at the end). */
export function insertJumpItem(items: JumpItem[], item: JumpItem, beforeId?: string): JumpItem[] {
  const at = beforeId ? items.findIndex((i) => i.id === beforeId) : -1;
  if (at < 0) return [...items, item];
  return [...items.slice(0, at), item, ...items.slice(at)];
}
