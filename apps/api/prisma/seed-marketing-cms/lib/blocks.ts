/**
 * Small builders for seeded blocks.
 *
 * Block ids are derived from the entry and the block's position, so running
 * the seed twice produces the same ids and a re-seed with `--overwrite` does
 * not churn the revision diff.
 */

import { createHash } from 'node:crypto';
import type { DraftBlock, IconName } from '../../../src/admin-marketing/cms/contract/cms-contract';

/** Deterministic block id (matches BLOCK_ID_PATTERN: 6-32 chars). */
export function blockId(entryKey: string, index: number): string {
  return 'b' + createHash('sha1').update(`${entryKey}#${index}`).digest('hex').slice(0, 11);
}

/** Assigns ids in order. Builders below return blocks without ids. */
export function withIds(entryKey: string, blocks: Omit<DraftBlock, 'id'>[]): DraftBlock[] {
  return blocks.map((b, i) => ({ ...b, id: blockId(entryKey, i) }) as DraftBlock);
}

type NoId<T> = Omit<T, 'id'>;
type Block = NoId<DraftBlock>;

/** The two CTAs every money page starts with. `signup` and `demo` are resolved by the API. */
export const SIGNUP_CTA = { label: 'Start free trial', href: 'signup', variant: 'primary' as const, trackAs: 'hero_signup' };
export const DEMO_CTA = { label: 'Book a demo', href: 'demo', variant: 'secondary' as const, trackAs: 'hero_demo' };
export const WHATSAPP_CTA = { label: 'Ask on WhatsApp', href: 'whatsapp', variant: 'ghost' as const, trackAs: 'whatsapp' };

export function hero(sub: string, opts: { eyebrow?: string; heading?: string; badges?: string[] } = {}): Block {
  return {
    type: 'hero',
    ...(opts.eyebrow ? { eyebrow: opts.eyebrow } : {}),
    ...(opts.heading ? { heading: opts.heading } : {}),
    sub,
    primaryCta: SIGNUP_CTA,
    secondaryCta: DEMO_CTA,
    ...(opts.badges ? { badges: opts.badges } : {}),
    layout: 'split',
  };
}

export function answerBox(facts: { label: string; value: string }[], romanUrdu?: string, heading?: string): Block {
  return {
    type: 'answerBox',
    ...(heading ? { heading } : {}),
    facts,
    ...(romanUrdu ? { romanUrdu } : {}),
  };
}

export function featuresGrid(heading: string, items: { icon: IconName; title: string; body: string }[], intro?: string): Block {
  return {
    type: 'featuresGrid',
    heading,
    ...(intro ? { intro } : {}),
    columns: items.length % 3 === 0 ? 3 : 2,
    items,
  };
}

export function faq(heading = 'Common questions'): Block {
  return { type: 'faq', heading };
}

export function richText(markdown: string): Block {
  return { type: 'richText', markdown };
}

export function callout(tone: 'info' | 'tip' | 'warning', body: string, title?: string): Block {
  return { type: 'callout', tone, ...(title ? { title } : {}), body };
}

/**
 * Writer notes: a hidden callout. Hidden blocks stay in the draft for the
 * editor and are never rendered or published.
 */
export function writerNotes(body: string): Block {
  return { type: 'callout', tone: 'warning', title: 'Writer notes (hidden)', body, hidden: true };
}

export function cta(heading: string, body?: string): Block {
  return { type: 'cta', heading, ...(body ? { body } : {}), primaryCta: SIGNUP_CTA, secondaryCta: WHATSAPP_CTA };
}
