/**
 * Local quality-gate report for the seed content: main-content words against
 * the type's gate, plus 5-gram similarity for city pages. Mirrors what the
 * API computes on publish, so thin pages can be found before seeding.
 *
 *   npx ts-node --transpile-only --project prisma/tsconfig.seed.json prisma/seed-marketing-cms/check-gates.ts [TYPE]
 */
import { entries, faqs } from './content';
import { countMainWords, extractMainText } from '../../src/admin-marketing/cms/content/word-count';
import { DEFAULT_QUALITY_GATES } from '../../src/admin-marketing/cms/contract/cms-contract';
import { maxSimilarity } from '../../src/admin-marketing/cms/seo/seo-rules';
import type { SeedEntry } from './lib/types';

const onlyType = process.argv[2];
const faqUse = new Map<string, number>();
for (const e of entries) for (const k of e.faqKeys ?? []) faqUse.set(k, (faqUse.get(k) ?? 0) + 1);

function input(e: SeedEntry) {
  const ownFaqs = (e.faqKeys ?? [])
    .filter((k) => faqUse.get(k) === 1)
    .map((k) => faqs.find((f) => f.key === k))
    .filter((f): f is NonNullable<typeof f> => Boolean(f));
  return { type: e.type, summary: e.summary, blocks: e.blocks, data: e.data, ownFaqs };
}

const texts = entries.map((e) => ({ e, text: extractMainText(input(e)) }));
const rows: string[] = [];
for (const { e, text } of texts) {
  if (onlyType && e.type !== onlyType) continue;
  const gate = DEFAULT_QUALITY_GATES[e.type];
  const words = countMainWords(input(e));
  let sim = '';
  let simOk = true;
  if (gate?.similarityMax !== undefined) {
    const others = texts.filter((t) => t.e !== e && t.e.type === e.type).map((t) => ({ id: t.e.slug, title: t.e.slug, text: t.text }));
    const s = maxSimilarity(text, others);
    simOk = s.value <= gate.similarityMax;
    sim = `\tsim ${s.value.toFixed(2)} vs ${s.closest?.id ?? '-'}`;
  }
  const ok = words >= (gate?.minWords ?? 0) && simOk;
  rows.push(`${ok ? 'OK  ' : 'THIN'}\t${e.type}\t${e.slug}\t${words}/${gate?.minWords ?? 0}${sim}`);
}
console.log(rows.sort().join('\n'));
