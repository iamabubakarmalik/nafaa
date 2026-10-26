/** Urdu: blog category "guides" (/ur/blog/category/guides). Translation of content/blog/index.ts (categories). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

export const faqs: SeedFaq[] = [];

export const entry: SeedEntry = {
  type: 'BLOG_CATEGORY',
  locale: 'ur',
  slug: 'guides',
  title: 'طریقہ کار گائیڈز',
  summary: 'پاکستان میں دکان چلانے کی قدم بہ قدم گائیڈز: کھاتہ رکھنا، اسٹاک گننا، قیمت لگانا، کاؤنٹر پر بل بنانا اور Nafaa سے کام شروع کرنا۔',
  data: { icon: 'book-open' },
  blocks: [{ type: 'richText', markdown: 'پاکستان میں دکان چلانے کی قدم بہ قدم گائیڈز: کھاتہ رکھنا، اسٹاک گننا، قیمت لگانا، کاؤنٹر پر بل بنانا اور Nafaa سے کام شروع کرنا۔', id: 'b8b16dd2fc7f' }],
  relations: [
    { ref: 'PAGE:tools@ur', kind: 'RELATED' },
    { ref: 'PAGE:templates@ur', kind: 'RELATED' },
    { ref: 'BLOG_POST:stock-taking-guide@ur', kind: 'RELATED' },
  ],
  sortOrder: 1,
  origin: 'translation of content/blog/index.ts category guides (26 Oct 2026)',
  evidence: [],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English category; no claims.' },
  dropped: [],
  needsOwner: [],
};
