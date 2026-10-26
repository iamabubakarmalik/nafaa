/** Urdu: Glossary term expiry management (/ur/glossary/expiry-management). Translation of content/glossary/stock.ts (expiry-management). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

export const faqs: SeedFaq[] = [];

export const entry: SeedEntry = {
  type: 'GLOSSARY_TERM',
  locale: 'ur',
  slug: 'expiry-management',
  title: 'ایکسپائری مینجمنٹ (Expiry Management)',
  seoTitle: 'ایکسپائری مینجمنٹ (Expiry Management) کیا ہے؟ مطلب اور مثال',
  summary: 'ایکسپائری مینجمنٹ وہ معمول ہے جس میں ایکسپائری کی تاریخوں پر نظر رکھی جاتی ہے، جس مال کی ایکسپائری قریب ہو اسے وقت پر بیچا جاتا ہے، اور ایکسپائر مال گاہک تک پہنچنے سے پہلے ہٹا یا واپس کر دیا جاتا ہے۔',
  seoDescription: 'ایکسپائری مینجمنٹ کا مطلب ہے ایکسپائری کی تاریخوں پر نظر رکھنا، قریب ایکسپائری والا مال وقت پر بیچنا اور ایکسپائر مال گاہک تک پہنچنے سے پہلے ہٹانا۔',
  data: {
    term: 'ایکسپائری مینجمنٹ (Expiry Management)',
    definition: 'ایکسپائری مینجمنٹ وہ معمول ہے جس میں ایکسپائری کی تاریخوں پر نظر رکھی جاتی ہے، جس مال کی ایکسپائری قریب ہو اسے وقت پر بیچا جاتا ہے، اور ایکسپائر مال گاہک تک پہنچنے سے پہلے ہٹا یا واپس کر دیا جاتا ہے۔',
    definitionRomanUrdu: 'Expiry management matlab expiry dates par nazar rakhna, qareeb-ul-expiry maal waqt par bechna, aur expire hone wala maal gahak tak pohanchne se pehle hatana ya wapas karna.',
    example: 'ایک منی مارٹ ہر پیر کو ان چیزوں کی لسٹ نکالتا ہے جن کی ایکسپائری اگلے 60 دن میں ہے۔ اگلے مہینے ایکسپائر ہونے والے جوس آگے والے شیلف پر ایک معمولی سی آفر کے ساتھ رکھے جاتے ہیں، اور دہی کے دو کارٹن جن کی تاریخ گزر چکی ہے، ہٹا کر رائٹ آف درج کر دیے جاتے ہیں۔',
    alsoKnownAs: ['ایکسپائری ٹریکنگ', 'expiry tracking', 'near expiry', 'short expiry', 'expiry date management'],
  },
  blocks: [
    {
      id: 'bd44a9843986',
      type: 'richText',
      markdown: `## یہ کیسے کام کرتا ہے

ایکسپائر مال سیدھا نقصان ہے۔ اسے بیچنے سے گاہک کا بھروسہ ٹوٹتا ہے اور یہ قانون کی خلاف ورزی بھی ہو سکتی ہے، خاص طور پر دواؤں میں۔ اچھی ایکسپائری مینجمنٹ کے چار قدم ہیں: مال وصول کرتے وقت ایکسپائری درج کریں، ایک مقررہ دن قریب ایکسپائری والی لسٹ دیکھیں، جلدی قدم اٹھائیں (مال آگے رکھیں، آفر لگائیں، یا ریٹرن کی مدت باقی ہو تو سپلائر کو واپس کریں)، اور جو مال رائٹ آف ہو اسے درج کریں۔

پاکستان میں بہت سے ڈسٹری بیوٹر قریب ایکسپائری مال صرف تاریخ سے پہلے کی ایک مقررہ مدت کے اندر واپس لیتے ہیں۔ اس لیے یہ جاننا کہ اگلے دو تین مہینوں میں کیا ایکسپائر ہو رہا ہے، اس سے زیادہ اہم ہے کہ کیا پہلے ہی ایکسپائر ہو چکا ہے۔

## Nafaa میں

Nafaa کا لو اسٹاک پیج ہر برانچ میں قریب ایکسپائری والا اسٹاک دکھاتا ہے، اور سیٹنگ میں آپ طے کرتے ہیں کہ کتنے دن پہلے خبردار کیا جائے۔ فارمیسی پیک میں ایکسپائرنگ پیج بھی ہے، جہاں سے مال سپلائر کو واپس یا رائٹ آف کیا جا سکتا ہے۔ خراب یا ایکسپائر مال ڈیمج پیج سے مینیجر کی منظوری کے ساتھ نکلتا ہے۔`,
    },
  ],
  relations: [
    { ref: 'GLOSSARY_TERM:fifo@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:dead-stock@ur', kind: 'RELATED' },
    { ref: 'INDUSTRY:pharmacy@ur', kind: 'RELATED' },
    { ref: 'PRODUCT:inventory@ur', kind: 'RELATED' },
  ],
  sortOrder: 34,
  origin: 'translation of content/glossary/stock.ts (26 Oct 2026)',
  evidence: [
    'apps/web/src/modules/inventory/low-stock/pages/LowStockPage.tsx',
    'apps/web/src/modules/inventory/low-stock/components/SettingsModal.tsx',
    'apps/web/src/industries/pharmacy/pages/ExpiringPage.tsx',
    'apps/web/src/modules/inventory/damage/pages/DamagePage.tsx',
  ],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [],
};
