/**
 * Builders for the main marketing pages (products, solutions, services,
 * pricing, marketplace). Each page is written as a short spec and expanded
 * here into the blocks its template expects, so every page in this folder
 * shares one order and one set of CTAs.
 *
 * Screenshots are the P2 captures of the two demo shops (Nafaa Demo Mart and
 * Nafaa Demo Kitchen) in the local media library; see
 * apps/site/scripts/capture/manifest.json for what each one shows.
 */

import type { DraftBlock, IconName } from '../../../../src/admin-marketing/cms/contract/cms-contract';
import { DEMO_CTA, SIGNUP_CTA, WHATSAPP_CTA, withIds } from '../../lib/blocks';
import type { EntryRef, SeedEntry } from '../../lib/types';
import { PAGE_DIAGRAMS } from './diagrams';

type Block = Omit<DraftBlock, 'id'>;

/** Media ids of the P2 screenshots (local CMS media library). */
export const SHOT = {
  pos: 'media_retail-pos',
  posDark: 'media_retail-pos-dark',
  posPhone: 'media_retail-pos-phone',
  posOnlineAlert: 'media_retail-pos-online-alert',
  dashboard: 'media_retail-dashboard',
  dashboardDark: 'media_retail-dashboard-dark',
  dashboardPhone: 'media_retail-dashboard-phone',
  inventory: 'media_retail-products',
  inventoryDark: 'media_retail-products-dark',
  lowStock: 'media_retail-low-stock',
  khata: 'media_retail-khata',
  khataPhone: 'media_retail-khata-phone',
  profitByProduct: 'media_retail-profit-report',
  profitLoss: 'media_retail-profit-loss',
  reports: 'media_retail-reports',
  taxSetup: 'media_retail-tax-settings',
  onlineOrders: 'media_retail-online-orders',
  salesChannels: 'media_retail-sales-channels',
  staff: 'media_retail-staff',
  settings: 'media_retail-settings',
  branches: 'media_retail-branches',
  branchesDark: 'media_retail-branches-dark',
  branchList: 'media_retail-branch-list',
  receipt: 'media_retail-receipt',
  tables: 'media_restaurant-tables',
  tablesDark: 'media_restaurant-tables-dark',
  tablesTablet: 'media_restaurant-tables-tablet',
  kot: 'media_restaurant-kot',
  kotDark: 'media_restaurant-kot-dark',
  restaurantDashboard: 'media_restaurant-dashboard',
  restaurantMenu: 'media_restaurant-menu',
} as const;

export type Frame = 'browser' | 'phone' | 'tablet' | 'desktop' | 'receipt' | 'none';

export interface HeroSpec {
  eyebrow: string;
  heading: string;
  sub: string;
  media?: { id: string; url?: string; frame?: Frame };
  diagram?: Record<string, unknown>;
  badges?: string[];
  layout?: 'split' | 'centered';
  primary?: { label: string; href: string; trackAs?: string };
  secondary?: { label: string; href: string; trackAs?: string };
}

export interface ShotSpec {
  heading?: string;
  body?: string;
  id: string;
  frame?: Frame;
  url?: string;
  layout?: 'full' | 'split-left' | 'split-right';
  caption?: string;
  callouts?: { x: number; y: number; label: string }[];
  theme?: 'default' | 'muted' | 'ink';
}

export type FeatureItem = [icon: IconName, title: string, body: string, status?: 'beta' | 'coming', href?: string];

export interface PageSpec {
  type: 'PRODUCT' | 'SOLUTION' | 'SERVICE' | 'PAGE';
  slug: string;
  title: string;
  summary: string;
  data: Record<string, unknown>;
  seoTitle: string;
  seoDescription: string;
  focusKeyword: string;
  hero: HeroSpec;
  answer?: { facts: [string, string][]; romanUrdu: string; heading?: string };
  /** Blocks in page order, written with the helpers below. */
  body: Block[];
  cta?: { heading: string; body?: string; primary?: HeroSpec['primary']; secondary?: HeroSpec['secondary'] };
  faqKeys?: string[];
  relations?: { ref: EntryRef; kind: 'TAG' | 'RELATED' }[];
  sortOrder?: number;
  featured?: boolean;
  noindex?: boolean;
  evidence: string[];
  needsOwner?: string[];
}

function ctaOf(spec: HeroSpec['primary'], fallback: typeof SIGNUP_CTA | typeof DEMO_CTA | typeof WHATSAPP_CTA, variant: 'primary' | 'secondary' | 'ghost') {
  return spec ? { label: spec.label, href: spec.href, variant, ...(spec.trackAs ? { trackAs: spec.trackAs } : {}) } : fallback;
}

export function heroBlock(h: HeroSpec): Block {
  const media = h.media
    ? { kind: 'screenshot', mediaId: h.media.id, frame: h.media.frame ?? 'browser', ...(h.media.url ? { url: h.media.url } : {}) }
    : h.diagram
      ? { kind: 'diagram', diagram: h.diagram }
      : undefined;
  return {
    type: 'hero',
    eyebrow: h.eyebrow,
    heading: h.heading,
    sub: h.sub,
    primaryCta: ctaOf(h.primary, SIGNUP_CTA, 'primary'),
    secondaryCta: ctaOf(h.secondary, DEMO_CTA, 'secondary'),
    ...(h.badges ? { badges: h.badges } : {}),
    ...(media ? { media } : {}),
    layout: h.layout ?? 'centered',
  } as Block;
}

export function shot(s: ShotSpec): Block {
  return {
    type: 'screenshot',
    ...(s.heading ? { heading: s.heading } : {}),
    ...(s.body ? { body: s.body } : {}),
    mediaId: s.id,
    frame: s.frame ?? 'browser',
    ...(s.url ? { url: s.url } : {}),
    ...(s.callouts ? { callouts: s.callouts } : {}),
    layout: s.layout ?? 'split-right',
    ...(s.caption ? { caption: s.caption } : {}),
    ...(s.theme ? { theme: s.theme } : {}),
  } as Block;
}

export function features(heading: string, items: FeatureItem[], intro?: string, theme?: 'muted'): Block {
  return {
    type: 'featuresGrid',
    heading,
    ...(intro ? { intro } : {}),
    columns: items.length % 3 === 0 ? 3 : 2,
    items: items.map(([icon, title, body, status, href]) => ({ icon, title, body, ...(status ? { status } : {}), ...(href ? { href } : {}) })),
    ...(theme ? { theme } : {}),
  } as Block;
}

export function steps(heading: string, items: [string, string, string?][], intro?: string, howTo = false): Block {
  return {
    type: 'steps',
    heading,
    ...(intro ? { intro } : {}),
    items: items.map(([title, body, mediaId]) => ({ title, body, ...(mediaId ? { mediaId } : {}) })),
    ...(howTo ? { howTo: true } : {}),
  } as Block;
}

export function prose(markdown: string): Block {
  return { type: 'richText', markdown } as Block;
}

export function diagram(caption: string, spec: Record<string, unknown>, heading?: string, theme?: 'muted'): Block {
  return { type: 'diagram', ...(heading ? { heading } : {}), caption, diagram: spec, ...(theme ? { theme } : {}) } as Block;
}

export function table(heading: string, caption: string, columns: { key: string; label: string; highlight?: boolean }[], rows: [string, ...string[]][]): Block {
  return {
    type: 'comparisonTable',
    heading,
    caption,
    columns,
    rows: rows.map(([label, ...cells]) => ({ label, cells: Object.fromEntries(columns.map((c, i) => [c.key, { value: cells[i] ?? '' }])) })),
  } as Block;
}

export function pricing(heading = 'Plans and pricing', compact = true): Block {
  return { type: 'pricingTable', heading, showToggle: true, highlightPlan: 'pro', compact } as Block;
}

export function industriesGrid(heading: string, intro?: string, group?: string): Block {
  return {
    type: 'entryGrid',
    heading,
    ...(intro ? { intro } : {}),
    entryType: 'INDUSTRY',
    ...(group ? { filter: { group } } : {}),
    sort: 'order',
    limit: 8,
    layout: 'cards',
  } as Block;
}

export function callout(tone: 'info' | 'tip' | 'warning', body: string, title?: string): Block {
  return { type: 'callout', tone, ...(title ? { title } : {}), body } as Block;
}

export function leadForm(heading: string, intro: string, opts: { form?: 'quote' | 'demo' | 'contact'; formType?: 'SALES' | 'ENTERPRISE' | 'PARTNERSHIP' | 'GENERAL'; subjectPrefix?: string } = {}): Block {
  return {
    type: 'leadForm',
    anchor: 'quote',
    heading,
    intro,
    form: opts.form ?? 'quote',
    ...(opts.formType ? { formType: opts.formType } : {}),
    ...(opts.subjectPrefix ? { subjectPrefix: opts.subjectPrefix } : {}),
    successMessage: 'Shukriya! We have your request and will reply on email or WhatsApp within one working day.',
    currencies: ['PKR', 'USD'],
    whatsapp: true,
  } as Block;
}

/**
 * Places the page's diagrams (diagrams.ts) between its body sections: the
 * first after the first section, then one after every second section, so
 * diagrams alternate with screenshots and grids instead of stacking up.
 */
function weave(body: Block[], diagrams: Block[]): Block[] {
  if (!diagrams.length) return body;
  const out: Block[] = [];
  let next = 0;
  body.forEach((b, i) => {
    out.push(b);
    if (next < diagrams.length && (i === 0 || i % 2 === 0) && b.type !== 'diagram') out.push(diagrams[next++]!);
  });
  while (next < diagrams.length) out.push(diagrams[next++]!);
  return out;
}

/** Expands a page spec into a seed entry: hero, answer box, body, FAQ, closing CTA. */
export function page(spec: PageSpec): SeedEntry {
  const key = `${spec.type}:${spec.slug}`;
  const blocks: Block[] = [heroBlock(spec.hero)];
  if (spec.answer) {
    blocks.push({
      type: 'answerBox',
      ...(spec.answer.heading ? { heading: spec.answer.heading } : {}),
      facts: spec.answer.facts.map(([label, value]) => ({ label, value })),
      romanUrdu: spec.answer.romanUrdu,
    } as Block);
  }
  blocks.push(...weave(spec.body, PAGE_DIAGRAMS[key] ?? []));
  if (spec.faqKeys?.length) blocks.push({ type: 'faq', heading: 'Common questions' } as Block);
  if (spec.cta) {
    blocks.push({
      type: 'cta',
      heading: spec.cta.heading,
      ...(spec.cta.body ? { body: spec.cta.body } : {}),
      primaryCta: ctaOf(spec.cta.primary, SIGNUP_CTA, 'primary'),
      secondaryCta: ctaOf(spec.cta.secondary, WHATSAPP_CTA, 'ghost'),
    } as Block);
  }
  return {
    type: spec.type,
    slug: spec.slug,
    title: spec.title,
    summary: spec.summary,
    data: spec.data,
    blocks: withIds(key, blocks),
    ...(spec.faqKeys ? { faqKeys: spec.faqKeys } : {}),
    ...(spec.relations ? { relations: spec.relations } : {}),
    seoTitle: spec.seoTitle,
    seoDescription: spec.seoDescription,
    focusKeyword: spec.focusKeyword,
    ...(spec.noindex ? { noindex: true } : {}),
    ...(spec.sortOrder !== undefined ? { sortOrder: spec.sortOrder } : {}),
    ...(spec.featured ? { featured: true } : {}),
    origin: 'new (D2 main templates pass, 20 Oct 2026)',
    evidence: spec.evidence,
    factCheck: { checkedOn: '2026-10-20', note: 'Claims checked against apps/web/src and apps/api/src (see evidence). Prices only through {{price:...}} tokens and the pricing block.' },
    dropped: [],
    needsOwner: spec.needsOwner ?? [],
  };
}
