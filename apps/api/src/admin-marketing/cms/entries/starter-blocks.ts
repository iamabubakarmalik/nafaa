/**
 * Starter blocks for a new entry (contract STARTER_BLOCKS and
 * PAGE_TEMPLATE_STARTER_BLOCKS) with layout defaults only. No copy is
 * written here; editors fill every text field.
 */
import { randomBytes } from 'crypto';
import {
  PAGE_TEMPLATE_STARTER_BLOCKS,
  STARTER_BLOCKS,
  type BlockType,
  type CmsEntryType,
  type DraftBlock,
  type PageTemplate,
} from '../contract/cms-contract';

/** nanoid-style id (10 chars of A-Za-z0-9_-). */
export function newBlockId(): string {
  return randomBytes(8).toString('base64url').slice(0, 10);
}

const DEFAULTS: Partial<Record<BlockType, Record<string, unknown>>> = {
  hero: { layout: 'split', primaryCta: { label: '', href: 'signup', variant: 'primary' } },
  answerBox: { facts: [] },
  featuresGrid: { columns: 3, items: [] },
  screenshot: { frame: 'browser', layout: 'full' },
  comparisonTable: { columns: [], rows: [] },
  cta: { primaryCta: { label: '', href: 'signup', variant: 'primary' } },
  richText: { markdown: '' },
  steps: { items: [] },
  pricingTable: { showToggle: true },
  entryGrid: { layout: 'cards' },
  relatedLinks: { source: 'related' },
  sources: { items: [] },
  leadForm: { form: 'contact' },
};

function entryGridType(type: CmsEntryType, template: PageTemplate | undefined, data: Record<string, unknown>, nth: number): Record<string, unknown> {
  if (type === 'PAGE' && template === 'roadmap') {
    return nth === 0
      ? { entryType: 'PRODUCT', filter: { status: ['coming', 'beta'] }, layout: 'cards' }
      : { entryType: 'INTEGRATION', filter: { status: ['coming', 'beta'] }, layout: 'cards' };
  }
  if (type === 'PAGE' && template === 'home') return { entryType: 'INDUSTRY', layout: 'grouped' };
  if (type === 'PAGE' && typeof data.hubOf === 'string') return { entryType: data.hubOf, layout: data.hubOf === 'INDUSTRY' ? 'grouped' : 'cards' };
  if (type === 'BLOG_CATEGORY' || type === 'PERSON') return { entryType: 'BLOG_POST', sort: 'recent', layout: 'list' };
  if (type === 'PRODUCT' || type === 'INTEGRATION') return { entryType: 'INDUSTRY', layout: 'cards' };
  if (type === 'SERVICE') return { entryType: 'CASE_STUDY', layout: 'cards' };
  return { layout: 'cards' };
}

const CITY_FACT_ORDER: Partial<Record<CmsEntryType, string[][]>> = {
  CITY: [['tax'], ['markets', 'areas'], ['support']],
  CITY_INDUSTRY: [['tax']],
};

export function starterBlocks(type: CmsEntryType, data: Record<string, unknown>): DraftBlock[] {
  const template = type === 'PAGE' ? ((typeof data.template === 'string' ? data.template : 'default') as PageTemplate) : undefined;
  const list = template ? PAGE_TEMPLATE_STARTER_BLOCKS[template] ?? STARTER_BLOCKS.PAGE : STARTER_BLOCKS[type];
  let grids = 0;
  let facts = 0;
  return list.map((blockType) => {
    const block: DraftBlock = { id: newBlockId(), type: blockType, ...(DEFAULTS[blockType] ?? {}) };
    if (blockType === 'entryGrid') Object.assign(block, entryGridType(type, template, data, grids++));
    if (blockType === 'cityFacts') block.show = CITY_FACT_ORDER[type]?.[facts++] ?? ['tax'];
    if (blockType === 'tool' && typeof data.toolKey === 'string') block.toolKey = data.toolKey;
    if (blockType === 'leadForm' && type === 'SERVICE' && data.areaServed === 'worldwide') Object.assign(block, { form: 'quote', currencies: ['PKR', 'USD'], whatsapp: true });
    return block;
  });
}
