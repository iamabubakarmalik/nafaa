/** Urdu: Glossary term COGS (/ur/glossary/cogs). Translation of content/glossary/money.ts (cogs). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

export const faqs: SeedFaq[] = [];

export const entry: SeedEntry = {
  type: 'GLOSSARY_TERM',
  locale: 'ur',
  slug: 'cogs',
  title: 'COGS (بکے ہوئے مال کی کاسٹ)',
  seoTitle: 'COGS (بکے ہوئے مال کی کاسٹ) کیا ہے؟ مطلب اور مثال',
  summary: 'COGS یعنی بکے ہوئے مال کی کاسٹ، کسی مدت میں اصل میں بکنے والی چیزوں کی خریداری کی کاسٹ ہے، جسے سیل میں سے نکال کر گراس پرافٹ نکالا جاتا ہے۔',
  data: {
    term: 'COGS (بکے ہوئے مال کی کاسٹ)',
    definition: 'COGS یعنی بکے ہوئے مال کی کاسٹ، کسی مدت میں اصل میں بکنے والی چیزوں کی خریداری کی کاسٹ ہے، جسے سیل میں سے نکال کر گراس پرافٹ نکالا جاتا ہے۔',
    definitionRomanUrdu: 'COGS kisi muddat me bikne wale saman ki khareed ki qeemat hai, jo sale me se nikal kar gross profit nikalta hai.',
    example: 'اکتوبر میں ایک دکان نے 900,000 روپے کا مال بیچا۔ انہی چیزوں کی کاسٹ 720,000 روپے تھی۔ COGS 720,000 ہے اور گراس پرافٹ 180,000، چاہے اکتوبر میں کتنا ہی اسٹاک خریدا گیا ہو۔',
    alsoKnownAs: ['بکے ہوئے مال کی کاسٹ', 'cost of goods sold', 'cost of sales', 'COS'],
  },
  blocks: [
    {
      id: 'b329181f3a50',
      type: 'richText',
      markdown: `## یہ کیسے کام کرتا ہے

ایک عام غلطی یہ ہے کہ خریداری کو ہی کاسٹ سمجھ لیا جائے: "اس مہینے 800,000 کا مال خریدا اور 900,000 کا بیچا، تو 100,000 کمائے"۔ خریداری سے اسٹاک بنتا ہے؛ صرف جو بکتا ہے وہ COGS بنتا ہے۔ پرانا فارمولا یہ ہے: شروع کا اسٹاک، جمع خریداری، منفی آخر کا اسٹاک۔

POS میں آسان طریقہ یہ ہے کہ سیل کے وقت ہر بل لائن پر کاسٹ محفوظ کر لی جائے، پھر انہیں جمع کر لیا جائے۔ کاسٹ میں کرایہ بھاڑا اور مال دکان تک لانے کے باقی خرچے بھی شامل ہونے چاہییں، ورنہ پرافٹ اصل سے زیادہ نظر آتا ہے۔ خراب، ایکسپائر اور چوری ہونے والا مال عام طور پر الگ سے رائٹ آف اسٹاک کے طور پر دکھایا جاتا ہے، تاکہ مالک اسے دیکھ سکے۔

## Nafaa میں

Nafaa سیل ہوتے ہی ہر بل لائن پر کاسٹ محفوظ کرتا ہے، اور یہ خریداری سے آنے والی لینڈڈ کاسٹ (landed cost) ہوتی ہے۔ پرافٹ اور P&L رپورٹس یہی نمبر استعمال کرتی ہیں، اور رائٹ آف اسٹاک الگ لائن میں دکھتا ہے۔`,
    },
  ],
  relations: [
    { ref: 'GLOSSARY_TERM:profit-and-loss@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:gross-margin@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:net-profit@ur', kind: 'RELATED' },
    { ref: 'TOOL:profit-margin-calculator@ur', kind: 'RELATED' },
  ],
  sortOrder: 17,
  origin: 'translation of content/glossary/money.ts (26 Oct 2026)',
  evidence: [
    'apps/web/src/modules/finance/profit-report',
    'apps/web/src/modules/reports/pnl',
    'apps/api/src/modules/purchasing/purchases/purchases.service.ts',
  ],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [],
};
