/** Urdu: Glossary term petty cash (/ur/glossary/petty-cash). Translation of content/glossary/money.ts (petty-cash). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

export const faqs: SeedFaq[] = [];

export const entry: SeedEntry = {
  type: 'GLOSSARY_TERM',
  locale: 'ur',
  slug: 'petty-cash',
  title: 'پیٹی کیش (Petty Cash)',
  seoTitle: 'پیٹی کیش (Petty Cash) کیا ہے؟ مطلب اور مثال',
  summary: 'پیٹی کیش وہ تھوڑا سا کیش ہے جو کاروبار کے معمولی خرچوں کے لیے رکھا جاتا ہے، جیسے چائے، آنے جانے کا کرایہ، صفائی اور معمولی مرمت۔',
  data: {
    term: 'پیٹی کیش (Petty Cash)',
    definition: 'پیٹی کیش وہ تھوڑا سا کیش ہے جو کاروبار کے معمولی خرچوں کے لیے رکھا جاتا ہے، جیسے چائے، آنے جانے کا کرایہ، صفائی اور معمولی مرمت۔',
    definitionRomanUrdu: 'Petty cash thora sa cash hai jo chhote kharchon ke liye rakha jata hai, jaise chai, kiraya, safai aur chhoti marammat.',
    example: 'ایک دفتر 10,000 روپے پیٹی کیش رکھتا ہے۔ دو ہفتوں میں چائے، کورئیر اور پلمبر پر 9,200 خرچ ہوتے ہیں، اور ہر خرچ کی پرچی رکھی جاتی ہے۔ مالک پرچیاں دیکھ کر رقم دوبارہ 10,000 تک پوری کر دیتا ہے۔',
    alsoKnownAs: ['معمولی خرچے', 'chhote kharchay', 'petty expenses', 'imprest'],
  },
  blocks: [
    {
      id: 'b9fd86635e07',
      type: 'richText',
      markdown: `## یہ کیسے کام کرتا ہے

بہت سی دکانوں میں معمولی خرچے سیدھے گلے سے نکلتے ہیں، اسی لیے رات کی گنتی کم ہی پوری ملتی ہے۔ حل آسان ہے: یا تو پیٹی کیش کا الگ ڈبہ ایک مقررہ رقم کے ساتھ رکھیں، یا دراز سے نکلنے والی ہر رقم اسی وقت وجہ کے ساتھ درج کریں۔

پرانا طریقہ امپریسٹ سسٹم (imprest system) ہے: ایک مقررہ رقم سے شروع کریں، پرچیوں کے ساتھ خرچ کریں، پھر جتنا خرچ ہوا ٹھیک اتنا ہی دوبارہ ڈالیں۔ کسی بھی وقت کیش اور پرچیاں مل کر مقررہ رقم کے برابر ہونی چاہییں۔ ہر مہینے خرچوں کی قسمیں دیکھیں، کیونکہ چائے اور پیٹرول جیسی معمولی چیزیں سال بھر میں بڑی رقم بن جاتی ہیں۔

## Nafaa میں

Nafaa میں کھلے ٹِل سے نکالا گیا کیش وجہ کے ساتھ درج ہوتا ہے، اور کیش ایکسپینس کھلی شفٹ سے نکلتے ہیں، اس لیے دراز میں جتنا کیش ہونا چاہیے وہ حساب ٹھیک رہتا ہے۔ دکانیں دراز اور ایک الگ کیش اکاؤنٹ کے درمیان پیسے بھی منتقل کر سکتی ہیں۔`,
    },
  ],
  relations: [
    { ref: 'GLOSSARY_TERM:galla@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:z-report@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:cash-flow@ur', kind: 'RELATED' },
    { ref: 'TEMPLATE:daily-cash-closing-sheet@ur', kind: 'RELATED' },
  ],
  sortOrder: 73,
  origin: 'translation of content/glossary/money.ts (26 Oct 2026)',
  evidence: [
    'apps/web/src/modules/finance/cash-register/components/CashMoveModal.tsx',
    'apps/web/src/modules/finance/expenses',
    'apps/web/src/modules/finance/money',
  ],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [],
};
