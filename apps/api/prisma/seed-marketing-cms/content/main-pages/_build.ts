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
  pos: 'cmvgy1q9y00hn0b7srn32zrv4',
  posDark: 'cmvgy1s2l00ho0b7sio9gaxaq',
  posPhone: 'cmvgy1tk800hp0b7sv80s7lk4',
  posOnlineAlert: 'cmvgy1v8i00hq0b7szk54olya',
  dashboard: 'cmvgy1wnu00hr0b7srohkk7r8',
  dashboardDark: 'cmvgy1y5l00hs0b7sqyzzv632',
  dashboardPhone: 'cmvgy1zqg00ht0b7so1kgdr6o',
  inventory: 'cmvgy21h200hu0b7sphtdv59r',
  inventoryDark: 'cmvgy233600hv0b7s73shnyi3',
  lowStock: 'cmvgy24wg00hw0b7sia4o8ugl',
  khata: 'cmvgy26g800hx0b7sq7nue60t',
  khataPhone: 'cmvgy284b00hy0b7s1fmbgx1q',
  profitByProduct: 'cmvgy29j700hz0b7s52bywf11',
  profitLoss: 'cmvgy2b3200i00b7soaicb3ql',
  reports: 'cmvgy2cma00i10b7s9p9r805h',
  taxSetup: 'cmvgy2fdo00i20b7s30hchlm5',
  onlineOrders: 'cmvgy2h4w00i30b7scefls7dn',
  salesChannels: 'cmvgy2ilf00i40b7sn3d702oq',
  staff: 'cmvgy2jxw00i50b7s7cg4bszh',
  settings: 'cmvgy2ldz00i60b7sxnutwghd',
  branches: 'cmvgy2mvv00i70b7shtpuw4om',
  branchesDark: 'cmvgy2ogh00i80b7s7mtfiv5l',
  branchList: 'cmvgy2pvw00i90b7sp54gmke5',
  receipt: 'cmvgy2rmj00ia0b7s0f8cng05',
  tables: 'cmvgy2suw00ib0b7sklk7e7hf',
  tablesDark: 'cmvgy2uap00ic0b7sxdj0n3k2',
  tablesTablet: 'cmvgy2w9j00id0b7sdszoz8i9',
  kot: 'cmvgy2y9d00ie0b7s9ktjmx4d',
  kotDark: 'cmvgy2zxa00if0b7s8x44xx0e',
  restaurantDashboard: 'cmvgy31bd00ig0b7s5txgrrwy',
  restaurantMenu: 'cmvgy32ug00ih0b7s1hte42vz',
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
