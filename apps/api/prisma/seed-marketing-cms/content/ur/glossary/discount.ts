/** Urdu: Glossary term discount (/ur/glossary/discount). Translation of content/glossary/counter.ts (discount). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

export const faqs: SeedFaq[] = [];

export const entry: SeedEntry = {
  type: 'GLOSSARY_TERM',
  locale: 'ur',
  slug: 'discount',
  title: 'ڈسکاؤنٹ (Discount)',
  seoTitle: 'ڈسکاؤنٹ (Discount) کیا ہے؟ مطلب اور مثال',
  summary:
    'ڈسکاؤنٹ عام سیلنگ پرائس میں کمی ہے، جو کسی ایک چیز یا پورے بل پر مقررہ رقم یا فیصد میں دی جاتی ہے۔',
  data: {
    term: 'ڈسکاؤنٹ (Discount)',
    definition: 'ڈسکاؤنٹ عام سیلنگ پرائس میں کمی ہے، جو کسی ایک چیز یا پورے بل پر مقررہ رقم یا فیصد میں دی جاتی ہے۔',
    definitionRomanUrdu:
      'Discount normal qeemat me kami hai, jo kisi item ya poore bill par fixed raqam ya percentage me di jati hai.',
    example:
      'ایک مستقل گاہک 8,400 روپے کا سودا لیتا ہے۔ مالک بل پر 400 روپے کم کر دیتا ہے۔ 20% مارجن پر یہ ڈسکاؤنٹ اس سیل کے پرافٹ کا تقریباً چوتھائی حصہ لے جاتا ہے۔',
    alsoKnownAs: ['ڈسکاؤنٹ', 'discount', 'آفر', 'offer', 'rebate', 'round-off'],
  },
  blocks: [
    {
      type: 'richText',
      id: 'b5d1107b05da',
      markdown: `## یہ کیسے کام کرتا ہے

پاکستانی ریٹیل میں ڈسکاؤنٹ اکثر اندازے سے دیا جاتا ہے: مستقل گاہک کے لیے رقم گول کر دی، بڑے بل پر بھاؤ تاؤ، عید پر کوئی آفر۔ ہر ایک چھوٹا ہوتا ہے، لیکن سب مل کر عام طور پر قیمتوں کی فہرست اور دکان کی اصل کمائی کے بیچ سب سے بڑا فرق یہی ہوتے ہیں۔

دو اصول انہیں قابو میں رکھتے ہیں۔ پہلا، ایک حد رکھیں، جیسے ہر بل پر زیادہ سے زیادہ فیصد، جس سے اوپر مالک منظوری دے۔ دوسرا، ڈسکاؤنٹ اسٹاف اور وجہ کے حساب سے دیکھیں، تاکہ مالک دیکھ سکے وہ کہاں جا رہے ہیں۔ پہلے سے طے آفرز، جیسے واٹس ایپ پر بھیجا گیا ڈسکاؤنٹ کوڈ، اچانک دیے گئے ڈسکاؤنٹ سے ناپنے میں آسان ہیں۔

## Nafaa میں

Nafaa کاؤنٹر پر F4 بل کا ڈسکاؤنٹ کھولتا ہے۔ دکانیں ڈسکاؤنٹ کی حد رکھ سکتی ہیں؛ اس سے اوپر جانے کے لیے PIN چاہیے، یا وہ فرد جسے مالک نے "حد سے زیادہ ڈسکاؤنٹ" کی اجازت دی ہو۔ ڈسکاؤنٹ کوڈ برانچ، گاہک اور تاریخ کے حساب سے محدود کیے جا سکتے ہیں، اور پرافٹ رپورٹ دکھاتی ہے کہ ڈسکاؤنٹ نے پرافٹ میں سے کتنا لیا۔`,
    },
  ],
  relations: [
    { ref: 'GLOSSARY_TERM:gross-margin@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:loyalty-points@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:markup@ur', kind: 'RELATED' },
    { ref: 'TOOL:discount-calculator@ur', kind: 'RELATED' },
  ],
  sortOrder: 27,
  origin: 'translation of content/glossary/counter.ts, discount (26 Oct 2026)',
  evidence: [
    'apps/web/src/modules/pos/components/PosDiscountModal.tsx',
    'apps/web/src/modules/sales/discounts/pages/DiscountsPage.tsx',
    'apps/web/src/core/lib/permissions.ts',
    'apps/web/src/modules/finance/profit-report',
  ],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [],
};
