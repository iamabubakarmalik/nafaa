/**
 * Small builders for fixture blocks. Each fixture entry calls `ids(prefix)`
 * once and passes the generator to the builders, so block ids are stable
 * and match BLOCK_ID_PATTERN.
 */
import type {
  AnswerBoxBlock,
  Block,
  CmsEntryType,
  Cta,
  DiagramSpec,
  EntryGridBlock,
  FeatureStatus,
  FeaturesGridBlock,
  HeroBlock,
  IconName,
  StepsBlock,
} from '@/lib/cms/contract/cms-contract';

export type IdGen = () => string;

export function ids(prefix: string): IdGen {
  let n = 0;
  const safe = prefix.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 24) || 'fx';
  return () => `${safe}-b${String(++n).padStart(2, '0')}`;
}

export const cta = (label: string, href: string, variant?: Cta['variant']): Cta => ({ label, href, ...(variant ? { variant } : {}) });

export function hero(
  id: IdGen,
  sub: string,
  opts: Partial<Omit<HeroBlock, 'id' | 'type' | 'sub'>> = {},
): HeroBlock {
  return {
    id: id(),
    type: 'hero',
    sub,
    primaryCta: opts.primaryCta ?? cta('Start free trial', 'signup'),
    secondaryCta: opts.secondaryCta ?? cta('Book a demo', 'demo', 'secondary'),
    layout: opts.layout ?? 'split',
    ...(opts.eyebrow ? { eyebrow: opts.eyebrow } : {}),
    ...(opts.heading ? { heading: opts.heading } : {}),
    ...(opts.media ? { media: opts.media } : {}),
    ...(opts.badges ? { badges: opts.badges } : {}),
  };
}

export function answer(id: IdGen, facts: [string, string][], romanUrdu?: string, heading?: string): AnswerBoxBlock {
  return {
    id: id(),
    type: 'answerBox',
    facts: facts.map(([label, value]) => ({ label, value })),
    ...(romanUrdu ? { romanUrdu } : {}),
    ...(heading ? { heading } : {}),
  };
}

export function features(
  id: IdGen,
  heading: string,
  items: { icon: IconName; title: string; body: string; href?: string; status?: FeatureStatus }[],
  opts: { intro?: string; columns?: 2 | 3 | 4 } = {},
): FeaturesGridBlock {
  return { id: id(), type: 'featuresGrid', heading, columns: opts.columns ?? 3, items, ...(opts.intro ? { intro: opts.intro } : {}) };
}

export function steps(id: IdGen, heading: string, items: [string, string][], opts: { intro?: string; howTo?: boolean } = {}): StepsBlock {
  return {
    id: id(),
    type: 'steps',
    heading,
    items: items.map(([title, body]) => ({ title, body })),
    ...(opts.intro ? { intro: opts.intro } : {}),
    ...(opts.howTo ? { howTo: true } : {}),
  };
}

export function grid(
  id: IdGen,
  entryType: CmsEntryType,
  opts: Partial<Omit<EntryGridBlock, 'id' | 'type' | 'entryType'>> = {},
): EntryGridBlock {
  return { id: id(), type: 'entryGrid', entryType, layout: opts.layout ?? 'cards', ...opts };
}

export function diagram(id: IdGen, caption: string, spec: DiagramSpec, heading?: string): Block {
  return { id: id(), type: 'diagram', caption, diagram: spec, ...(heading ? { heading } : {}) };
}

export function rich(id: IdGen, markdown: string): Block {
  return { id: id(), type: 'richText', markdown };
}

export function faq(id: IdGen, heading?: string): Block {
  return { id: id(), type: 'faq', ...(heading ? { heading } : {}) };
}

export function ctaBand(id: IdGen, heading: string, body?: string, primary: Cta = cta('Start free trial', 'signup'), secondary?: Cta): Block {
  return {
    id: id(),
    type: 'cta',
    heading,
    primaryCta: primary,
    secondaryCta: secondary ?? cta('Talk to us on WhatsApp', 'whatsapp', 'secondary'),
    ...(body ? { body } : {}),
  };
}

export function pricing(id: IdGen, opts: { compact?: boolean; heading?: string; highlightPlan?: string } = {}): Block {
  return { id: id(), type: 'pricingTable', showToggle: true, ...opts };
}
