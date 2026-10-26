/** Urdu: blog category "industry" (/ur/blog/category/industry). Translation of content/blog/index.ts (categories). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

export const faqs: SeedFaq[] = [];

export const entry: SeedEntry = {
  type: 'BLOG_CATEGORY',
  locale: 'ur',
  slug: 'industry',
  title: 'کاروبار کے لحاظ سے گائیڈز',
  summary: 'پاکستان میں خاص کاروباروں کے لیے عملی گائیڈز: کریانہ، فارمیسی، ریسٹورنٹ، بیکری، جیولری، گارمنٹس، موبائل شاپ، ہارڈویئر اسٹور اور بہت کچھ۔',
  data: { icon: 'store' },
  blocks: [{ type: 'richText', markdown: 'پاکستان میں خاص کاروباروں کے لیے عملی گائیڈز: کریانہ، فارمیسی، ریسٹورنٹ، بیکری، جیولری، گارمنٹس، موبائل شاپ، ہارڈویئر اسٹور اور بہت کچھ۔', id: 'b5a9c7fbee2f' }],
  relations: [
    { ref: 'PAGE:industries@ur', kind: 'RELATED' },
    { ref: 'INDUSTRY:kiryana@ur', kind: 'RELATED' },
    { ref: 'INDUSTRY:pharmacy@ur', kind: 'RELATED' },
    { ref: 'INDUSTRY:restaurant@ur', kind: 'RELATED' },
  ],
  sortOrder: 2,
  origin: 'translation of content/blog/index.ts category industry (26 Oct 2026)',
  evidence: [],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English category; no claims.' },
  dropped: [],
  needsOwner: [],
};
