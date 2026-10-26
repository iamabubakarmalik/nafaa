/** Urdu: Glossary term net profit (/ur/glossary/net-profit). Translation of content/glossary/money.ts (net-profit). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

export const faqs: SeedFaq[] = [];

export const entry: SeedEntry = {
  type: 'GLOSSARY_TERM',
  locale: 'ur',
  slug: 'net-profit',
  title: 'نیٹ پرافٹ (Net Profit)',
  seoTitle: 'نیٹ پرافٹ (Net Profit) کیا ہے؟ مطلب اور مثال',
  summary: 'نیٹ پرافٹ وہ ہے جو سیل میں سے سامان کی کاسٹ اور کاروبار کے سارے ایکسپینس نکالنے کے بعد بچتا ہے۔',
  seoDescription:
    'نیٹ پرافٹ وہ ہے جو سیل میں سے سامان کی کاسٹ اور کاروبار کے سارے ایکسپینس نکالنے کے بعد بچتا ہے۔ جانیں پاکستان میں دکان اسے کیسے نکالتی ہے۔',
  data: {
    term: 'نیٹ پرافٹ (Net Profit)',
    definition: 'نیٹ پرافٹ وہ ہے جو سیل میں سے سامان کی کاسٹ اور کاروبار کے سارے ایکسپینس نکالنے کے بعد بچتا ہے۔',
    definitionRomanUrdu:
      'Net profit woh hai jo sale me se saman ki cost aur karobar ke tamam kharchay nikalne ke baad bachta hai.',
    example:
      'ایک دکان کا مہینے کا گراس پرافٹ 310,000 روپے ہے۔ کرایہ، دو تنخواہیں، بجلی، انٹرنیٹ اور بینک چارجز مل کر 205,000 بنتے ہیں۔ ٹیکس سے پہلے نیٹ پرافٹ 105,000 روپے ہے۔',
    alsoKnownAs: ['نیٹ پرافٹ', 'اصل منافع', 'asal munafa', 'net income', 'bottom line'],
  },
  blocks: [
    {
      type: 'richText',
      id: 'b5cd128999ee',
      markdown: `## یہ کیسے کام کرتا ہے

نیٹ پرافٹ کاروبار کی اصل کمائی ہے۔ پاکستان میں بہت سے مالک مہینے کو اس کیش سے پرکھتے ہیں جو گھر لے گئے، جس میں ادھار کی وصولی، خریدا گیا اسٹاک اور ذاتی خرچ سب ملے ہوتے ہیں۔ نیٹ پرافٹ انہیں الگ کرتا ہے: سیل منفی سامان کی کاسٹ، منفی ایکسپینس، منفی وہ اسٹاک جو خراب یا ایکسپائر ہو کر ضائع ہوا۔

مالک جو اپنے لیے نکالتا ہے وہ ایکسپینس نہیں؛ وہ پرافٹ میں سے نکلتا ہے۔ گلے سے گھر کے بل ادا کیے جائیں اور لکھے نہ جائیں تو نیٹ پرافٹ ناپنا ناممکن ہو جاتا ہے۔ اسے ہر مہینے دیکھیں اور پچھلے سال کے اسی مہینے سے ملائیں، کیونکہ بہت سے کاروباروں کے مضبوط سیزن ہوتے ہیں، جیسے رمضان، عید اور اسکول کھلنے کا وقت۔

## Nafaa میں

Nafaa کا P&L صفحہ کسی بھی مدت کا پرافٹ پچھلی مدت یا پچھلے سال کی انہی تاریخوں کے مقابلے میں دکھاتا ہے، مہینے وار اور برانچ وار، ایکسپینس اور ضائع شدہ اسٹاک کے بعد نیٹ پرافٹ کے ساتھ۔`,
    },
  ],
  relations: [
    { ref: 'GLOSSARY_TERM:profit-and-loss@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:gross-margin@ur', kind: 'RELATED' },
    { ref: 'TOOL:break-even-calculator@ur', kind: 'RELATED' },
    { ref: 'BLOG_POST:how-to-calculate-profit-margin@ur', kind: 'RELATED' },
  ],
  sortOrder: 65,
  origin: 'translation of content/glossary/money.ts, net-profit (26 Oct 2026)',
  evidence: ['apps/web/src/modules/reports/pnl', 'apps/web/src/modules/finance/profit-report'],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [],
};
