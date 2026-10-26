/**
 * Shared shape and builder for compliance pages (/compliance/{slug}). Each
 * page lives in `pages/` and exports a ComplianceSpec.
 *
 * Every rule on these pages points to the official document it comes from,
 * opened on CHECKED_ON and listed in the page's sources block. Rates and
 * penalty amounts are stated only where an official document gives them.
 * COMPLIANCE is a fact-check type: the API blocks publishing
 * (NOT_FACT_CHECKED) until the owner stamps the page in the admin.
 */

import type { DraftBlock, Source } from '../../../../src/admin-marketing/cms/contract/cms-contract';
import { withIds, writerNotes } from '../../lib/blocks';
import type { EntryRef, SeedEntry, SeedFaq } from '../../lib/types';

export type Block = Omit<DraftBlock, 'id'>;

/** Date the rules and links on these pages were last checked. */
export const CHECKED_ON = '2026-10-26';
export const CHECKED_ON_TEXT = '26 October 2026';

export function src(title: string, url: string, publisher: string): Source {
  return { title, url, publisher, accessedAt: CHECKED_ON };
}

/** The "rules change" warning every compliance page carries near the top. */
export function checkRules(body: string): Block {
  return { type: 'callout', tone: 'warning', title: `Check the current rules (checked on ${CHECKED_ON_TEXT})`, body } as Block;
}

/** Code behind the "How Nafaa handles it" sections of the tax pages. */
export const TAX_EVIDENCE = [
  'apps/api/src/integrations/tax-authority/adapters.ts',
  'apps/api/src/integrations/tax-authority/tax-authority.service.ts',
  'apps/api/src/integrations/tax-authority/tax-reports.ts',
  'apps/api/src/integrations/tax-authority/tax-setup.ts',
  'apps/web/src/modules/tax/TaxPage.tsx',
  'apps/web/src/modules/tax/components/SettingsView.tsx',
  'apps/web/src/modules/tax/components/InvoicesView.tsx',
  'apps/web/src/modules/tax/components/MonthlyReportView.tsx',
  'apps/web/src/modules/tax/components/TaxGuide.tsx',
  'apps/web/src/core/receipt/print.ts',
];

export type ComplianceAuthority = 'FBR' | 'PRA' | 'SRB' | 'KPRA' | 'DRAP';

export interface ComplianceSpec {
  slug: string;
  title: string;
  authority: ComplianceAuthority;
  summary: string;
  sroRefs: string[];
  effectiveDate?: string;
  penaltySummary?: string;
  /** Page body in reading order, hero first. The FAQ and sources blocks are added at the end. */
  blocks: Block[];
  /** Questions answered only on this page: [question, answer]. */
  faqs: [string, string][];
  relations: { ref: EntryRef; kind: 'TAG' | 'RELATED' }[];
  sources: Source[];
  evidence: string[];
  factNote: string;
  needsOwner: string[];
  seoTitle?: string;
  seoDescription?: string;
  focusKeyword?: string;
}

function faqKey(slug: string, i: number): string {
  return `cmp-${slug}-${i + 1}`;
}

export function complianceFaqs(p: ComplianceSpec): SeedFaq[] {
  return p.faqs.map(([question, answer], i) => ({
    key: faqKey(p.slug, i),
    topic: 'compliance',
    question,
    answer,
    sourceNote: `Official sources on /compliance/${p.slug}, checked ${CHECKED_ON}.`,
    origin: 'new',
    evidence: p.evidence.slice(0, 2),
  }));
}

export function compliancePage(p: ComplianceSpec, index: number): SeedEntry {
  const key = `COMPLIANCE:${p.slug}`;
  return {
    type: 'COMPLIANCE',
    slug: p.slug,
    title: p.title,
    summary: p.summary,
    data: {
      authority: p.authority,
      sroRefs: p.sroRefs,
      ...(p.effectiveDate ? { effectiveDate: p.effectiveDate } : {}),
      ...(p.penaltySummary ? { penaltySummary: p.penaltySummary } : {}),
    },
    blocks: withIds(key, [
      ...p.blocks,
      { type: 'faq', heading: 'Common questions' } as Block,
      { type: 'sources', heading: 'Official sources', items: p.sources } as Block,
      writerNotes(
        [
          `Every rule on this page was read in the official document listed under sources on ${CHECKED_ON}.`,
          'Before publishing: a tax adviser (or pharmacist, for DRAP) reads the page against the current law, then the owner stamps fact-check in the admin.',
        ].join('\n\n'),
      ),
    ]),
    faqKeys: p.faqs.map((_, i) => faqKey(p.slug, i)),
    relations: p.relations,
    ...(p.seoTitle ? { seoTitle: p.seoTitle } : {}),
    ...(p.seoDescription ? { seoDescription: p.seoDescription } : {}),
    ...(p.focusKeyword ? { focusKeyword: p.focusKeyword } : {}),
    sortOrder: index + 1,
    origin: 'new (compliance pages, 26 Oct 2026)',
    evidence: p.evidence,
    sources: p.sources,
    factCheck: { checkedOn: CHECKED_ON, note: p.factNote },
    dropped: [],
    needsOwner: ['Fact-check stamp in the admin (NOT_FACT_CHECKED blocks publish until then).', ...p.needsOwner],
  };
}
