/**
 * Main-content text and word count for quality gates (ARCH 5.5) and the
 * 5-gram similarity check.
 *
 * "Main content" is the prose a visitor reads on this page: the summary,
 * the text fields of visible blocks, the prose in `data` that the template
 * renders, and FAQs used only by this entry. It leaves out navigation,
 * footer, CTA buttons, lists filled from other entries (entryGrid,
 * relatedLinks, testimonials, logos, pricing), code, the Roman Urdu summary
 * (it repeats the English answer) and FAQs shared with other entries.
 */
import { countWords, type CmsEntryType } from '../contract/cms-contract';
import { markdownToPlainText } from './markdown';

export interface MainTextInput {
  type: CmsEntryType;
  summary?: string | null;
  /** Draft or published blocks; read defensively. */
  blocks: unknown;
  data?: unknown;
  /** FAQs attached to this entry and to no other entry. */
  ownFaqs?: readonly { question: string; answer: string }[];
}

type Rec = Record<string, unknown>;

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}
function arr(v: unknown): Rec[] {
  return Array.isArray(v) ? (v.filter((x) => x && typeof x === 'object') as Rec[]) : [];
}
function md(v: unknown): string {
  return markdownToPlainText(str(v));
}

/** Prose of one block, or "" for blocks whose content comes from elsewhere. */
function blockText(block: Rec, summary: string): string[] {
  switch (block.type) {
    case 'hero':
      return [str(block.heading), md(block.sub)];
    case 'answerBox':
      return [
        str(block.heading),
        block.answer ? md(block.answer) : summary,
        ...arr(block.facts).flatMap((f) => [str(f.label), md(f.value)]),
      ];
    case 'featuresGrid':
      return [str(block.heading), md(block.intro), ...arr(block.items).flatMap((i) => [str(i.title), md(i.body)])];
    case 'diagram':
      return [str(block.heading), str(block.caption)];
    case 'screenshot':
      return [str(block.heading), md(block.body), str(block.caption)];
    case 'comparisonTable':
      return [
        str(block.heading),
        str(block.caption),
        ...arr(block.rows).flatMap((r) => [
          str(r.label),
          ...Object.values((r.cells as Rec | undefined) ?? {}).flatMap((c) =>
            c && typeof c === 'object' ? [str((c as Rec).value), str((c as Rec).note)] : [],
          ),
        ]),
      ];
    case 'cta':
      return [str(block.heading), md(block.body)];
    case 'richText':
      return [md(block.markdown)];
    case 'steps':
      return [str(block.heading), md(block.intro), ...arr(block.items).flatMap((i) => [str(i.title), md(i.body)])];
    case 'callout':
      return [str(block.title), md(block.body)];
    case 'sources':
      return [str(block.heading), ...arr(block.items).map((s) => str(s.title))];
    case 'leadForm':
    case 'entryGrid':
      return [str(block.heading), md(block.intro)];
    case 'faq':
    case 'stats':
    case 'testimonial':
    case 'logoCloud':
    case 'pricingTable':
    case 'codeSample':
    case 'cityFacts':
    case 'relatedLinks':
      return [str(block.heading)];
    default:
      return [];
  }
}

/** Prose from `data` that the type's template renders on the page. */
function dataText(type: CmsEntryType, data: Rec, cityFactSections: ReadonlySet<string>): string[] {
  switch (type) {
    case 'CITY': {
      const out: string[] = [str(data.tier1Note)];
      if (cityFactSections.has('tax') && data.servicesTax && typeof data.servicesTax === 'object') {
        out.push(str((data.servicesTax as Rec).appliesTo));
      }
      if (cityFactSections.has('markets')) out.push(...arr(data.markets).flatMap((m) => [str(m.name), str(m.note)]));
      if (cityFactSections.has('areas')) out.push(...arr(data.areas).flatMap((a) => [str(a.name), str(a.note)]));
      if (cityFactSections.has('support') && data.support && typeof data.support === 'object') {
        out.push(str((data.support as Rec).note));
      }
      return out;
    }
    case 'BEST_OF':
      return [
        md(data.methodology),
        ...arr(data.items).flatMap((i) => [
          str(i.bestFor),
          ...(Array.isArray(i.strengths) ? i.strengths.map(str) : []),
          ...(Array.isArray(i.weaknesses) ? i.weaknesses.map(str) : []),
        ]),
      ];
    case 'COMPARE':
    case 'ALTERNATIVE':
      return [md(data.verdict)];
    case 'GLOSSARY_TERM':
      return [str(data.definition), md(data.example)];
    case 'COMPLIANCE':
      return [str(data.penaltySummary)];
    case 'CITY_INDUSTRY':
      return [];
    default:
      return [];
  }
}

/** Plain main-content text of an entry (input to word counts and similarity). */
export function extractMainText(input: MainTextInput): string {
  const summary = str(input.summary).trim();
  const blocks = arr(input.blocks).filter((b) => b.hidden !== true);
  const parts: string[] = [];

  // The summary shows in the answer box (when it has no own answer) or under
  // the title; count it once.
  const answerBoxUsesSummary = blocks.some((b) => b.type === 'answerBox' && !b.answer);
  if (summary && !answerBoxUsesSummary) parts.push(summary);

  const citySections = new Set<string>();
  for (const block of blocks) {
    parts.push(...blockText(block, summary));
    if (block.type === 'cityFacts' && Array.isArray(block.show)) block.show.forEach((s) => citySections.add(str(s)));
  }
  if (input.data && typeof input.data === 'object') parts.push(...dataText(input.type, input.data as Rec, citySections));
  for (const faq of input.ownFaqs ?? []) parts.push(faq.question, markdownToPlainText(faq.answer));

  return parts
    .map((p) => p.trim())
    .filter(Boolean)
    .join('\n');
}

/** Main-content words (the number compared with the quality gate). */
export function countMainWords(input: MainTextInput): number {
  return countWords(extractMainText(input));
}

/** Reading time at 200 words a minute, at least 1 minute. */
export function readingMinutes(words: number): number {
  return Math.max(1, Math.ceil(words / 200));
}
