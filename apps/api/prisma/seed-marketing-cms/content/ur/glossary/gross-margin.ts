/** Urdu: Glossary term gross margin (/ur/glossary/gross-margin). Translation of content/glossary/money.ts (gross-margin). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

export const faqs: SeedFaq[] = [];

export const entry: SeedEntry = {
  type: 'GLOSSARY_TERM',
  locale: 'ur',
  slug: 'gross-margin',
  title: 'گراس مارجن (Gross Margin)',
  seoTitle: 'گراس مارجن (Gross Margin) کیا ہے؟ مطلب اور مثال',
  summary:
    'گراس مارجن گراس پرافٹ کو سیلنگ پرائس کے فیصد میں دکھاتا ہے: (سیلنگ پرائس منفی کاسٹ) تقسیم سیلنگ پرائس۔',
  data: {
    term: 'گراس مارجن (Gross Margin)',
    definition:
      'گراس مارجن گراس پرافٹ کو سیلنگ پرائس کے فیصد میں دکھاتا ہے: (سیلنگ پرائس منفی کاسٹ) تقسیم سیلنگ پرائس۔',
    definitionRomanUrdu:
      'Gross margin gross profit ko selling price ke percentage me dikhata hai: (qeemat minus cost) taqseem qeemat.',
    example:
      'ایک دکان کوکنگ آئل کی بوتل 520 روپے میں خریدتی ہے اور 580 میں بیچتی ہے۔ گراس پرافٹ 60 روپے ہے، اور گراس مارجن 60 تقسیم 580، یعنی تقریباً 10.3% ہے۔',
    alsoKnownAs: ['گراس مارجن', 'مارجن', 'margin', 'profit margin', 'GP margin', 'gross profit margin'],
  },
  blocks: [
    {
      type: 'richText',
      id: 'b2f67ba12da4',
      markdown: `## یہ کیسے کام کرتا ہے

مارجن اس سوال کا جواب ہے: "کاؤنٹر پر جو ہر 100 روپے آتے ہیں، ان میں سے ایکسپینس سے پہلے میرا کتنا ہے؟" پروڈکٹس اور کیٹیگریز کا موازنہ کرنے کے لیے یہی نمبر دیکھا جاتا ہے۔ پاکستانی ریٹیل میں آٹا، چینی اور تیل جیسی بنیادی چیزوں پر مارجن کم ہوتا ہے، جبکہ کاسمیٹکس، ایکسیسریز اور اسٹیشنری پر عام طور پر زیادہ۔

مارجن اور مارک اپ اکثر آپس میں گڈمڈ ہو جاتے ہیں۔ کاسٹ پر 25% مارک اپ قیمت پر صرف 20% مارجن ہے۔ ڈسکاؤنٹ سیدھا مارجن سے کٹتا ہے: 10% مارجن والی چیز پر 5% ڈسکاؤنٹ آدھا پرافٹ لے جاتا ہے۔ ہر مہینے کیٹیگری کے حساب سے مارجن دیکھیں؛ مارجن گرے تو عام طور پر مطلب ہوتا ہے کاسٹ بڑھ گئی اور سیلنگ پرائس اپ ڈیٹ نہیں ہوئی۔

## Nafaa میں

Nafaa کا پروڈکٹ ایڈیٹر قیمت لکھتے ہی مارجن دکھاتا ہے، اور پرافٹ رپورٹ پروڈکٹ، کیٹیگری، برانڈ اور سپلائر کے حساب سے کمائی دکھاتی ہے، ہر بل لائن پر محفوظ کاسٹ کے مطابق، ڈسکاؤنٹ اور واپسی کے بعد۔`,
    },
  ],
  relations: [
    { ref: 'GLOSSARY_TERM:markup@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:cogs@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:discount@ur', kind: 'RELATED' },
  ],
  sortOrder: 43,
  origin: 'translation of content/glossary/money.ts, gross-margin (26 Oct 2026)',
  evidence: [
    'apps/web/src/modules/inventory/products/components/VariantCard.tsx',
    'apps/web/src/modules/finance/profit-report',
  ],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [],
};
