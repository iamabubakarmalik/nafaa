/** Urdu: Glossary term profit and loss statement (/ur/glossary/profit-and-loss). Translation of content/glossary/money.ts (profit-and-loss). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

export const faqs: SeedFaq[] = [];

export const entry: SeedEntry = {
  type: 'GLOSSARY_TERM',
  locale: 'ur',
  slug: 'profit-and-loss',
  title: 'پرافٹ اینڈ لاس اسٹیٹمنٹ (P&L)',
  seoTitle: 'پرافٹ اینڈ لاس اسٹیٹمنٹ (P&L) کیا ہے؟ مطلب اور مثال',
  summary: 'پرافٹ اینڈ لاس اسٹیٹمنٹ کسی مدت کی سیل، کاسٹ اور ایکسپینس کی رپورٹ ہے، جو بتاتی ہے کہ کاروبار نے پرافٹ کمایا یا نقصان اٹھایا۔',
  data: {
    term: 'پرافٹ اینڈ لاس اسٹیٹمنٹ (P&L)',
    definition: 'پرافٹ اینڈ لاس اسٹیٹمنٹ کسی مدت کی سیل، کاسٹ اور ایکسپینس کی رپورٹ ہے، جو بتاتی ہے کہ کاروبار نے پرافٹ کمایا یا نقصان اٹھایا۔',
    definitionRomanUrdu: 'Profit and loss statement ek muddat ki sale, cost aur kharchon ki report hai jo batati hai ke karobar ne munafa kamaya ya nuqsan kiya.',
    example: 'ایک کلینک کا ستمبر کا P&L: فیس اور فارمیسی کی سیل 1,150,000 روپے، بکی ہوئی دواؤں کی کاسٹ 380,000، تنخواہیں 340,000، کرایہ 150,000، بجلی گیس پانی کے بل 60,000۔ نیٹ پرافٹ 220,000 روپے ہے۔',
    alsoKnownAs: ['نفع نقصان', 'nafa nuqsan', 'P&L', 'income statement', 'profit and loss account'],
  },
  blocks: [
    {
      id: 'b6f2858c2fb1',
      type: 'richText',
      markdown: `## یہ کیسے کام کرتا ہے

P&L، جسے انکم اسٹیٹمنٹ بھی کہتے ہیں، ایک طے شدہ ترتیب پر چلتا ہے: سیل میں سے بکے ہوئے مال کی کاسٹ نکالیں تو گراس پرافٹ؛ اس میں سے روزمرہ کے ایکسپینس نکالیں تو آپریٹنگ پرافٹ؛ پھر دوسری آمدنی اور خرچے، اور ٹیکس، تو نیٹ پرافٹ۔ یہ ایک مدت کا حساب ہوتا ہے، عام طور پر ایک مہینہ یا ایک سال، جبکہ بیلنس شیٹ صرف ایک تاریخ کی تصویر دکھاتی ہے۔

دکان جیسے کاروبار کے لیے ماہانہ P&L ان سوالوں کا جواب دیتا ہے جو مالک سب سے زیادہ پوچھتے ہیں: کیا ہم نے پیسہ کمایا، پیسہ کہاں گیا، اور کیا یہ مہینہ پچھلے سے بہتر ہے؟ جب کاروبار فنانس کے لیے درخواست دیتا ہے تو بینک اور سرمایہ کار بھی یہی مانگتے ہیں۔

## Nafaa میں

Nafaa کا P&L پیج کسی بھی مدت کے لیے بلوں، خریداری اور ایکسپینس سے یہ رپورٹ بناتا ہے۔ یہ اسے پچھلی مدت یا پچھلے سال سے ملاتا ہے، دو سال تک مہینہ وار اور برانچ وار دکھاتا ہے، اور A4، PDF یا تھرمل پیپر پر پرنٹ یا CSV میں ایکسپورٹ ہوتا ہے۔`,
    },
  ],
  relations: [
    { ref: 'GLOSSARY_TERM:net-profit@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:cash-flow@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:cogs@ur', kind: 'RELATED' },
    { ref: 'PRODUCT:reports@ur', kind: 'RELATED' },
    { ref: 'TOOL:break-even-calculator@ur', kind: 'RELATED' },
  ],
  sortOrder: 77,
  origin: 'translation of content/glossary/money.ts (26 Oct 2026)',
  evidence: [
    'apps/web/src/modules/reports/pnl',
  ],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [],
};
