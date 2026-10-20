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
  { key: 'proof', label: 'Saboot & FAQ' },
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
  hero: { label: 'Hero', help: 'Page ka H1, sub-heading, buttons aur tasveer', icon: PanelTop, group: 'opening', create: () => ({ layout: 'split', sub: '', primaryCta: cta('signup', 'primary') }) },
  answerBox: { label: 'Answer box', help: 'Mukhtasar jawab, key facts aur Roman Urdu summary', icon: Sparkles, group: 'opening', create: () => ({ facts: [{ label: '', value: '' }, { label: '', value: '' }] }) },
  richText: { label: 'Text', help: 'Markdown: H2/H3, lists, tables, links', icon: Type, group: 'content', create: () => ({ markdown: '' }) },
  steps: { label: 'Steps', help: 'Qadam ba qadam tareeqa (HowTo bhi)', icon: ListChecks, group: 'content', create: () => ({ heading: '', items: [{ title: '', body: '' }, { title: '', body: '' }] }) },
  callout: { label: 'Callout', help: 'Info, tip ya warning box', icon: Info, group: 'content', create: () => ({ tone: 'info', body: '' }) },
  screenshot: { label: 'Screenshot', help: 'Asal app ki tasveer frame me, callouts ke saath', icon: MonitorSmartphone, group: 'content', create: () => ({ frame: 'browser', layout: 'full' }) },
  diagram: { label: 'Diagram', help: 'Code se bana chalta hua diagram', icon: Workflow, group: 'content', create: () => ({ caption: '', diagram: { kind: 'offline-sync', animate: true } }) },
  codeSample: { label: 'Code sample', help: 'Developers ke liye code tabs', icon: Code, group: 'content', create: () => ({ tabs: [{ label: 'cURL', language: 'bash', code: '' }] }) },
  featuresGrid: { label: 'Features grid', help: '3-12 features, icons ke saath', icon: LayoutGrid, group: 'selling', create: () => ({ heading: '', columns: 3, items: [{ icon: 'check', title: '', body: '' }, { icon: 'check', title: '', body: '' }, { icon: 'check', title: '', body: '' }] }) },
  comparisonTable: {
    label: 'Comparison table',
    help: 'Muqabla: yes / no / partial ya text',
    icon: Table2,
    group: 'selling',
    create: () => ({ heading: '', caption: '', columns: [{ key: 'nafaa', label: 'Nafaa', highlight: true }, { key: 'other', label: '' }], rows: [{ label: '', cells: {} }] }),
  },
  pricingTable: { label: 'Pricing table', help: 'Plans aur prices hamesha Plan table se', icon: BadgeDollarSign, group: 'selling', create: () => ({ showToggle: true }) },
  stats: { label: 'Stats', help: 'Sirf API ke hisaab kiye numbers, khud number nahi likh sakte', icon: ChartColumn, group: 'selling', create: () => ({ items: [{ metric: 'industries.count', label: '' }] }) },
  faq: { label: 'FAQ', help: 'Is page ke FAQs (FAQ tab se jorein)', icon: CircleHelp, group: 'proof', create: () => ({}) },
  testimonial: { label: 'Testimonials', help: 'Sirf ijazat wale customer quotes', icon: MessageSquareQuote, group: 'proof', create: () => ({ mode: 'auto', limit: 3 }) },
  logoCloud: { label: 'Logo cloud', help: 'Sirf ijazat wale customer logos', icon: Images, group: 'proof', create: () => ({ mode: 'auto', limit: 12 }) },
  sources: { label: 'Sources', help: 'Hawalay: official links aur check ki date', icon: BookMarked, group: 'proof', create: () => ({ items: [{ title: '', url: '', publisher: '', accessedAt: new Date().toISOString().slice(0, 10) }] }) },
  entryGrid: { label: 'Entry grid', help: 'Entries ki khud-ba-khud list (hubs)', icon: Columns3, group: 'lists', create: (t) => ({ entryType: t === 'BLOG_CATEGORY' || t === 'PERSON' ? 'BLOG_POST' : 'INDUSTRY', layout: 'cards', sort: 'order' }) },
  relatedLinks: { label: 'Related links', help: 'Related pages ke cards (Links tab se)', icon: Link, group: 'lists', create: () => ({ source: 'related', limit: 6 }) },
  cityFacts: { label: 'City facts', help: 'Shehar ka tax, markets, areas, support', icon: Building2, group: 'lists', create: () => ({ show: ['tax'] }) },
  cta: { label: 'CTA band', help: 'Action ke liye patti, buttons ke saath', icon: Megaphone, group: 'action', create: () => ({ heading: '', primaryCta: cta('signup', 'primary') }) },
  leadForm: { label: 'Lead form', help: 'Contact ya demo form (leads admin me aati hain)', icon: Contact, group: 'action', create: () => ({ heading: '', form: 'contact', formType: 'SALES', successMessage: '' }) },
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
      return str(b.heading) || stripMarkdown(str(b.sub)) || 'Entry ka title H1 banega';
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
      return str(b.heading) || str(b.caption) || (b.mediaId ? 'Tasveer lagi hai' : 'Tasveer nahi chuni');
    case 'faq':
      return str(b.heading) || 'Entry ke FAQs';
    case 'stats':
      return `${(b.items as unknown[] | undefined)?.length ?? 0} metrics`;
    case 'pricingTable':
      return str(b.heading) || ((b.planSlugs as string[] | undefined)?.length ? (b.planSlugs as string[]).join(', ') : 'Sab public plans');
    case 'entryGrid':
      return str(b.heading) || `${str(b.entryType)} list`;
    case 'relatedLinks':
      return str(b.heading) || (b.source === 'tags' ? 'Tags se' : 'Related se');
    case 'cityFacts':
      return ((b.show as string[] | undefined) ?? []).join(', ') || 'Kuch nahi chuna';
    case 'testimonial':
    case 'logoCloud':
      return str(b.heading) || (b.mode === 'pick' ? `${(b.ids as unknown[] | undefined)?.length ?? 0} chune hue` : 'Auto');
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
