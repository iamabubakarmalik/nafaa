/**
 * Glossary terms, one file per topic. The 19 terms carried over from the old
 * marketing site (apps/marketing glossary.ts) were expanded on 26 Oct 2026
 * and sit in their topic files with `imported: true`; the rest are new.
 * Tax and legal terms cite their official source in the body and in
 * `sources`. Terms are sorted A to Z, which sets their sortOrder.
 */

import type { SeedEntry } from '../../lib/types';
import { term, type TermSpec } from './_term';
import { counterTerms } from './counter';
import { foodHealthTerms } from './food-health';
import { moneyTerms } from './money';
import { paymentTerms } from './payments-online';
import { productTerms } from './products';
import { stockTerms } from './stock';
import { taxTerms } from './tax';

const ALL: TermSpec[] = [...counterTerms, ...productTerms, ...moneyTerms, ...stockTerms, ...foodHealthTerms, ...paymentTerms, ...taxTerms];

const seen = new Set<string>();
for (const t of ALL) {
  if (seen.has(t.slug)) throw new Error(`Duplicate glossary slug: ${t.slug}`);
  seen.add(t.slug);
}

export const glossary: SeedEntry[] = [...ALL]
  .sort((a, b) => a.term.localeCompare(b.term, 'en', { sensitivity: 'base' }))
  .map(term);
