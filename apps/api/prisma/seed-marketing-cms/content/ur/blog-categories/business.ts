/** Urdu: blog category "business" (/ur/blog/category/business). Translation of content/blog/index.ts (categories). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

export const faqs: SeedFaq[] = [];

export const entry: SeedEntry = {
  type: 'BLOG_CATEGORY',
  locale: 'ur',
  slug: 'business',
  title: 'کاروبار چلانا',
  summary: 'پاکستان میں چھوٹا یا درمیانہ کاروبار چلانے پر مضامین: گاہک، اسٹاف، کیش، قیمتیں، رمضان اور عید جیسے سیزن، اور نئی برانچ کھولنا۔',
  data: { icon: 'trending-up' },
  blocks: [{ type: 'richText', markdown: 'پاکستان میں چھوٹا یا درمیانہ کاروبار چلانے پر مضامین: گاہک، اسٹاف، کیش، قیمتیں، رمضان اور عید جیسے سیزن، اور نئی برانچ کھولنا۔', id: 'b4101dbfebf2' }],
  relations: [
    { ref: 'PAGE:tools@ur', kind: 'RELATED' },
    { ref: 'PRODUCT:khata@ur', kind: 'RELATED' },
    { ref: 'BLOG_POST:how-to-reduce-udhaar@ur', kind: 'RELATED' },
  ],
  sortOrder: 4,
  origin: 'translation of content/blog/index.ts category business (26 Oct 2026)',
  evidence: [],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English category; no claims.' },
  dropped: [],
  needsOwner: [],
};
