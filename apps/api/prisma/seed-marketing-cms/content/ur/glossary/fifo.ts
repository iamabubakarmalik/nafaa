/** Urdu: Glossary term FIFO (/ur/glossary/fifo). Translation of content/glossary/stock.ts (fifo). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

export const faqs: SeedFaq[] = [];

export const entry: SeedEntry = {
  type: 'GLOSSARY_TERM',
  locale: 'ur',
  slug: 'fifo',
  title: 'FIFO (پہلے آیا، پہلے گیا)',
  seoTitle: 'FIFO (پہلے آیا، پہلے گیا) کیا ہے؟ مطلب اور مثال',
  summary: 'FIFO اسٹاک کا وہ اصول ہے جس میں سب سے پرانا مال سب سے پہلے بیچا جاتا ہے۔',
  seoDescription: 'FIFO (First In, First Out) اسٹاک کا اصول ہے کہ پرانا مال پہلے بکے۔ دکان میں یہ شیلف کی ترتیب، اسٹاک کی ویلیو اور پرافٹ پر کیسے اثر ڈالتا ہے، یہاں پڑھیں۔',
  data: {
    term: 'FIFO (پہلے آیا، پہلے گیا)',
    definition: 'FIFO اسٹاک کا وہ اصول ہے جس میں سب سے پرانا مال سب سے پہلے بیچا جاتا ہے۔',
    definitionRomanUrdu: 'FIFO ka matlab hai jo maal pehle aaya woh pehle bike.',
    example: 'ایک کریانہ اسٹور پر چائے کا نیا کارٹن آتا ہے، جبکہ پچھلے مہینے کا آدھا کارٹن ابھی شیلف پر ہے۔ اسٹاف نئے پیکٹ پرانوں کے پیچھے رکھتا ہے، تاکہ پرانا اسٹاک پہلے بکے۔',
    alsoKnownAs: ['پہلے آیا پہلے گیا', 'first in first out', 'pehle aaya pehle gaya'],
  },
  blocks: [
    {
      id: 'bd39a77a4b5d',
      type: 'richText',
      markdown: `## یہ کیسے کام کرتا ہے

FIFO شیلف کی عادت بھی ہے اور حساب کا طریقہ بھی۔ شیلف پر اس کا مطلب ہے کہ پرانا اسٹاک آگے رکھا جائے، تاکہ کوئی چیز پڑی پڑی خراب یا بے رنگ نہ ہو جائے۔ حساب میں اس کا مطلب ہے کہ ہر سیل کی کاسٹ اسٹاک میں موجود سب سے پرانی خریداری سے لی جائے۔ یہ تب بہت اہم ہو جاتا ہے جب سپلائر کے ریٹ بڑھتے رہیں، جیسا کہ پاکستان میں اکثر ہوتا ہے۔

جن چیزوں پر ایکسپائری کی تاریخ ہو، ان کے لیے عام طور پر ایک سخت اصول بہتر رہتا ہے: FEFO، یعنی جس کی ایکسپائری پہلے ہو وہ پہلے نکلے۔ وجہ یہ ہے کہ کبھی کبھی نئی ڈیلیوری پرانے اسٹاک سے پہلے ایکسپائر ہو جاتی ہے۔ جو چیزیں پرانی تو ہوتی ہیں مگر ان پر ایکسپائری چھپی نہیں ہوتی، جیسے کپڑے، جوتے، ہارڈویئر اور اسٹیشنری، ان کے لیے FIFO ٹھیک طریقہ ہے۔

## Nafaa میں

Nafaa سیل کے وقت ہر بل لائن پر اس کی کاسٹ محفوظ کرتا ہے۔ جن پروڈکٹس کا بیچ (batch) ٹریک ہوتا ہے، ان میں Nafaa اسٹاک اس بیچ سے نکالتا ہے جس کی ایکسپائری سب سے پہلے ہو، یعنی FEFO۔`,
    },
  ],
  relations: [
    { ref: 'GLOSSARY_TERM:expiry-management@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:cogs@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:dead-stock@ur', kind: 'RELATED' },
    { ref: 'PRODUCT:inventory@ur', kind: 'RELATED' },
  ],
  sortOrder: 37,
  origin: 'translation of content/glossary/stock.ts (26 Oct 2026)',
  evidence: [
    'apps/web/src/modules/finance/profit-report',
    'apps/web/src/industries/pharmacy/pos/config.ts',
  ],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [],
};
