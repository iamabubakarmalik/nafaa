/**
 * Block metadata for the editor: label, help text, icon, palette group,
 * a starting draft and a one-line summary for the outline. Prop shapes come
 * from the contract; starting drafts hold structure only, never copy.
 */
import {
  BadgeDollarSign,
  BookMarked,
  Building2,
  ChartColumn,
  CircleHelp,
  Code,
  Columns3,
  Contact,
  Calculator,
  Images,
  Info,
  LayoutGrid,
  Link,
  ListChecks,
  Megaphone,
  MessageSquareQuote,
  MonitorSmartphone,
  PanelTop,
  Sparkles,
  Table2,
  Type,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import type { BlockOf, BlockType, CmsEntryType, DraftBlock } from '../contract/cms-contract';
import { newBlockId, stripMarkdown } from '../editor/lib';

export type BlockGroup = 'opening' | 'content' | 'selling' | 'proof' | 'lists' | 'action';

export const BLOCK_GROUPS: { key: BlockGroup; label: string }[] = [
  { key: 'opening', label: 'Shuruat' },
  { key: 'content', label: 'Content' },
  { key: 'selling', label: 'Features & price' },
  { key: 'proof', label: 'Proof and FAQ' },
  { key: 'lists', label: 'Lists & links' },
  { key: 'action', label: 'Action' },
];

/** A draft block of one type: id and type are set, every prop may be missing. */
export type DraftOf<T extends BlockType> = { id: string; type: T } & Partial<Omit<BlockOf<T>, 'id' | 'type'>>;

interface BlockMeta {
  label: string;
  help: string;
  icon: LucideIcon;
  group: BlockGroup;
  /** Starting props (structure only). */
  create: (entryType: CmsEntryType) => Record<string, unknown>;
}

const cta = (href: string, variant: 'primary' | 'secondary') => ({ label: '', href, variant });

export const BLOCK_META: Record<BlockType, BlockMeta> = {
  hero: { label: 'Hero', help: 'The page H1, sub-heading, buttons and image', icon: PanelTop, group: 'opening', create: () => ({ layout: 'split', sub: '', primaryCta: cta('signup', 'primary') }) },
  answerBox: { label: 'Answer box', help: 'A short answer, key facts and a Roman Urdu summary', icon: Sparkles, group: 'opening', create: () => ({ facts: [{ label: '', value: '' }, { label: '', value: '' }] }) },
  richText: { label: 'Text', help: 'Markdown: H2/H3, lists, tables, links', icon: Type, group: 'content', create: () => ({ markdown: '' }) },
  steps: { label: 'Steps', help: 'Step-by-step instructions (also HowTo)', icon: ListChecks, group: 'content', create: () => ({ heading: '', items: [{ title: '', body: '' }, { title: '', body: '' }] }) },
  callout: { label: 'Callout', help: 'An info, tip or warning box', icon: Info, group: 'content', create: () => ({ tone: 'info', body: '' }) },
  screenshot: { label: 'Screenshot', help: 'A real app picture in a frame, with callouts', icon: MonitorSmartphone, group: 'content', create: () => ({ frame: 'browser', layout: 'full' }) },
  diagram: { label: 'Diagram', help: 'An animated diagram drawn from code', icon: Workflow, group: 'content', create: () => ({ caption: '', diagram: { kind: 'offline-sync', animate: true } }) },
  codeSample: { label: 'Code sample', help: 'Code tabs for developers', icon: Code, group: 'content', create: () => ({ tabs: [{ label: 'cURL', language: 'bash', code: '' }] }) },
  featuresGrid: { label: 'Features grid', help: '3-12 features with icons', icon: LayoutGrid, group: 'selling', create: () => ({ heading: '', columns: 3, items: [{ icon: 'check', title: '', body: '' }, { icon: 'check', title: '', body: '' }, { icon: 'check', title: '', body: '' }] }) },
  comparisonTable: {
    label: 'Comparison table',
    help: 'Comparison: yes / no / partial or text',
    icon: Table2,
    group: 'selling',
    create: () => ({ heading: '', caption: '', columns: [{ key: 'nafaa', label: 'Nafaa', highlight: true }, { key: 'other', label: '' }], rows: [{ label: '', cells: {} }] }),
  },
  pricingTable: { label: 'Pricing table', help: 'Plans and prices always come from the Plans table', icon: BadgeDollarSign, group: 'selling', create: () => ({ showToggle: true }) },
  stats: { label: 'Stats', help: 'Only numbers calculated by the server; you cannot type a number', icon: ChartColumn, group: 'selling', create: () => ({ items: [{ metric: 'industries.count', label: '' }] }) },
  faq: { label: 'FAQ', help: 'The FAQs of this page (add them from the FAQ tab)', icon: CircleHelp, group: 'proof', create: () => ({}) },
  testimonial: { label: 'Testimonials', help: 'Quotes only from customers who gave consent', icon: MessageSquareQuote, group: 'proof', create: () => ({ mode: 'auto', limit: 3 }) },
  logoCloud: { label: 'Logo cloud', help: 'Logos only from customers who gave consent', icon: Images, group: 'proof', create: () => ({ mode: 'auto', limit: 12 }) },
  sources: { label: 'Sources', help: 'References: official links and the date they were checked', icon: BookMarked, group: 'proof', create: () => ({ items: [{ title: '', url: '', publisher: '', accessedAt: new Date().toISOString().slice(0, 10) }] }) },
  entryGrid: { label: 'Entry grid', help: 'An automatic list of entries (hubs)', icon: Columns3, group: 'lists', create: (t) => ({ entryType: t === 'BLOG_CATEGORY' || t === 'PERSON' ? 'BLOG_POST' : 'INDUSTRY', layout: 'cards', sort: 'order' }) },
  relatedLinks: { label: 'Related links', help: 'Cards of related pages (from the Links tab)', icon: Link, group: 'lists', create: () => ({ source: 'related', limit: 6 }) },
  cityFacts: { label: 'City facts', help: 'City tax, markets, areas and support', icon: Building2, group: 'lists', create: () => ({ show: ['tax'] }) },
  cta: { label: 'CTA band', help: 'A call-to-action band with buttons', icon: Megaphone, group: 'action', create: () => ({ heading: '', primaryCta: cta('signup', 'primary') }) },
  leadForm: { label: 'Lead form', help: 'A contact or demo form (submissions arrive as leads)', icon: Contact, group: 'action', create: () => ({ heading: '', form: 'contact', formType: 'SALES', successMessage: '' }) },
  tool: { label: 'Tool', help: 'Calculator island', icon: Calculator, group: 'action', create: () => ({ toolKey: 'gst-calculator' }) },
};

export function createBlock(type: BlockType, entryType: CmsEntryType): DraftBlock {
  return { id: newBlockId(), type, ...BLOCK_META[type].create(entryType) } as DraftBlock;
}

/** Deep copy with a fresh id (duplicate action). */
export function cloneBlock(block: DraftBlock): DraftBlock {
  const copy = JSON.parse(JSON.stringify(block)) as DraftBlock;
  return { ...copy, id: newBlockId(), anchor: undefined };
}

const str = (v: unknown) => (typeof v === 'string' ? v : '');

/** One-line description for the outline. */
export function blockSummary(block: DraftBlock): string {
  const b = block as Record<string, unknown>;
  switch (block.type) {
    case 'hero':
      return str(b.heading) || stripMarkdown(str(b.sub)) || 'The entry title becomes the H1';
    case 'richText': {
      const md = str(b.markdown);
      const h = /^#{2,3}\s+(.+)$/m.exec(md);
      return h?.[1] ?? (stripMarkdown(md).slice(0, 80) || 'Khali');
    }
    case 'callout':
      return str(b.title) || stripMarkdown(str(b.body)).slice(0, 80) || str(b.tone);
    case 'diagram':
      return str(b.caption) || str((b.diagram as { kind?: string } | undefined)?.kind);
    case 'screenshot':
      return str(b.heading) || str(b.caption) || (b.mediaId ? 'Image added' : 'No image chosen');
    case 'faq':
      return str(b.heading) || 'The entry FAQs';
    case 'stats':
      return `${(b.items as unknown[] | undefined)?.length ?? 0} metrics`;
    case 'pricingTable':
      return str(b.heading) || ((b.planSlugs as string[] | undefined)?.length ? (b.planSlugs as string[]).join(', ') : 'All public plans');
    case 'entryGrid':
      return str(b.heading) || `${str(b.entryType)} list`;
    case 'relatedLinks':
      return str(b.heading) || (b.source === 'tags' ? 'From tags' : 'From related');
    case 'cityFacts':
      return ((b.show as string[] | undefined) ?? []).join(', ') || 'Nothing chosen';
    case 'testimonial':
    case 'logoCloud':
      return str(b.heading) || (b.mode === 'pick' ? `${(b.ids as unknown[] | undefined)?.length ?? 0} chosen` : 'Auto');
    case 'sources':
      return `${(b.items as unknown[] | undefined)?.length ?? 0} sources`;
    case 'codeSample':
      return str(b.heading) || ((b.tabs as { label?: string }[] | undefined) ?? []).map((t) => t.label).join(' / ');
    case 'tool':
      return str(b.toolKey);
    case 'leadForm':
      return str(b.heading) || `${str(b.form)} form`;
    default:
      return str(b.heading) || '';
  }
}
