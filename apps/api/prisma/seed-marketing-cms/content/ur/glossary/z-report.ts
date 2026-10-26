/** Urdu: Glossary term Z-report (/ur/glossary/z-report). Translation of content/glossary/counter.ts (z-report). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

export const faqs: SeedFaq[] = [];

export const entry: SeedEntry = {
  type: 'GLOSSARY_TERM',
  locale: 'ur',
  slug: 'z-report',
  title: 'زیڈ رپورٹ (Z-Report)',
  seoTitle: 'زیڈ رپورٹ (Z-Report) کیا ہے؟ مطلب اور مثال',
  summary: 'زیڈ رپورٹ شفٹ یا دن کے آخر کی وہ سمری ہے جو ایک ٹِل کی سیل، ادائیگیوں، ریٹرنز اور کیش کا ٹوٹل بنا کر اسے بند کرتی ہے۔',
  data: {
    term: 'زیڈ رپورٹ (Z-Report)',
    definition: 'زیڈ رپورٹ شفٹ یا دن کے آخر کی وہ سمری ہے جو ایک ٹِل کی سیل، ادائیگیوں، ریٹرنز اور کیش کا ٹوٹل بنا کر اسے بند کرتی ہے۔',
    definitionRomanUrdu: 'Z-report shift ya din ke aakhir ki report hai jo sale, payments, returns aur cash ka hisaab de kar till band karti hai.',
    example: 'رات 11 بجے ایک ریسٹورنٹ زیڈ رپورٹ پرنٹ کرتا ہے: 212 بل، کیش 96,400 روپے، کارڈ 31,000، JazzCash 12,500، دو void اور ایک ریفنڈ۔ مینیجر اس پر دستخط کرتا ہے اور گنے ہوئے کیش کی پرچی اس کے ساتھ لگا دیتا ہے۔',
    alsoKnownAs: ['Z-report', 'ڈے کلوزنگ رپورٹ', 'end of day report', 'day close report', 'shift report', 'closing report'],
  },
  blocks: [
    {
      id: 'bb0f36ed48cd',
      type: 'richText',
      markdown: `## یہ کیسے کام کرتا ہے

یہ نام پرانی کیش رجسٹر مشینوں سے آیا ہے، جن میں X-رپورٹ دن کے بیچ کی ریڈنگ ہوتی تھی اور Z-رپورٹ ٹوٹل کو صفر کر دیتی تھی۔ آج یہ شفٹ بند کرنے کا کاغذ ہے: کیا بکا، ادائیگی کیسے ہوئی، کیا ریفنڈ یا void ہوا، اور دراز میں کتنا کیش ہونا چاہیے۔

مالک اس سے دنوں کا موازنہ کرتے ہیں، غیر معمولی void پکڑتے ہیں، اور دیکھتے ہیں کہ گھر لے جایا گیا کیش بلوں سے ملتا ہے یا نہیں۔ جس دکان میں کئی کاؤنٹر ہوں، وہاں ہر ٹِل کی اپنی زیڈ رپورٹ ہوتی ہے، جس سے آسانی سے پتہ چلتا ہے کہ کس کاؤنٹر پر کیش کم تھا۔

## Nafaa میں

کیش رجسٹر پیج پر شفٹ بند کرتے وقت کیش کی گنتی مانگی جاتی ہے، جتنا کیش ہونا چاہیے وہ اور فرق دکھایا جاتا ہے، پھر اس شفٹ کی زیڈ رپورٹ کھل جاتی ہے۔ ڈے بک پورے کاروباری دن کو سب کاؤنٹرز سمیت دکھاتی ہے، جس میں کیش، سیل اور ہر اسٹاف ممبر کے بل ہوتے ہیں۔`,
    },
  ],
  relations: [
    { ref: 'GLOSSARY_TERM:galla@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:petty-cash@ur', kind: 'RELATED' },
    { ref: 'TEMPLATE:daily-cash-closing-sheet@ur', kind: 'RELATED' },
    { ref: 'BLOG_POST:daily-cash-closing-routine@ur', kind: 'RELATED' },
  ],
  sortOrder: 121,
  origin: 'translation of content/glossary/counter.ts (26 Oct 2026)',
  evidence: [
    'apps/web/src/modules/finance/cash-register/components/CloseShiftModal.tsx',
    'apps/web/src/modules/reports/day-book',
  ],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [],
};
