/** Urdu: Glossary term barcode (/ur/glossary/barcode). Translation of content/glossary/products.ts (barcode). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

export const faqs: SeedFaq[] = [];

export const entry: SeedEntry = {
  type: 'GLOSSARY_TERM',
  locale: 'ur',
  slug: 'barcode',
  title: 'بارکوڈ (Barcode)',
  seoTitle: 'بارکوڈ (Barcode) کیا ہے؟ مطلب اور مثال',
  summary:
    'بارکوڈ لکیروں یا چھوٹے خانوں کا ایک نمونہ ہے جو پروڈکٹ یا لیبل پر چھپا ہوتا ہے، اور اسکینر اسے پڑھ کر چیز پہچانتا ہے۔',
  data: {
    term: 'بارکوڈ (Barcode)',
    definition:
      'بارکوڈ لکیروں یا چھوٹے خانوں کا ایک نمونہ ہے جو پروڈکٹ یا لیبل پر چھپا ہوتا ہے، اور اسکینر اسے پڑھ کر چیز پہچانتا ہے۔',
    definitionRomanUrdu:
      'Barcode product ya label par chhapi lakeeron ya dabbon ka pattern hai jise scanner parh kar item pehchanta hai.',
    example:
      'گروسری اسٹور چائے کے پیک کا بارکوڈ اسکین کرتا ہے اور صحیح چیز اور قیمت بل پر آ جاتی ہے۔ کھلے چاول جو دکان خود پیک کرتی ہے، ان کے لیے دکان اپنے بارکوڈ لیبل پرنٹ کرتی ہے۔',
    alsoKnownAs: ['بارکوڈ', 'bar code', 'barcode', 'پروڈکٹ کوڈ', 'scan code'],
  },
  blocks: [
    {
      type: 'richText',
      id: 'bdb51890493f',
      markdown: `## یہ کیسے کام کرتا ہے

بارکوڈ اسکین کرنا نام سے تلاش کرنے سے کہیں تیز اور زیادہ درست ہے، اسی لیے رش والے کاؤنٹر پر، جہاں ملتی جلتی چیزیں بہت ہوں، بارکوڈ سب سے زیادہ کام آتے ہیں۔ پاکستان میں زیادہ تر برانڈ والی چیزوں پر پہلے سے لکیروں والا بارکوڈ ہوتا ہے، عام طور پر EAN-13۔ جو چیزیں دکان خود پیک کرتی ہے، کپڑے اور کھلا سامان، ان کے لیبل دکان میں پرنٹ کرنے پڑتے ہیں، عام طور پر Code 128 فارمیٹ میں، جس میں حروف اور نمبر دونوں آ سکتے ہیں۔

مسئلہ تب ہوتا ہے جب ایک بارکوڈ دو پروڈکٹس سے جڑ جائے، یا ایک پروڈکٹ کے کئی بارکوڈ ہوں اور صرف ایک درج ہو۔ نیا اسٹاک آئے تو شیلف پر رکھنے سے پہلے ایک پیس اسکین کر کے دیکھیں کہ سسٹم اسے پہچانتا ہے۔

## Nafaa میں

Nafaa کاؤنٹر پر USB اسکینر یا ڈیوائس کے کیمرے سے بارکوڈ اسکین کرتا ہے۔ بارکوڈ لیبل کا صفحہ Code 128، EAN-13 یا QR میں لیبل ڈیزائن اور پرنٹ کرتا ہے، اور کسی قسم (variant) کا اپنا بارکوڈ وہی خاص قسم بل میں ڈال دیتا ہے۔`,
    },
  ],
  relations: [
    { ref: 'GLOSSARY_TERM:sku@ur', kind: 'RELATED' },
    { ref: 'TOOL:barcode-generator@ur', kind: 'RELATED' },
    { ref: 'PRODUCT:inventory@ur', kind: 'RELATED' },
  ],
  sortOrder: 6,
  origin: 'translation of content/glossary/products.ts, barcode (26 Oct 2026)',
  evidence: [
    'apps/web/src/modules/inventory/barcodes/components/LabelDesigner.tsx',
    'apps/web/src/modules/inventory/barcodes/components/renderLabels.ts',
    'apps/web/src/core/components/barcode/BarcodeScanner.tsx',
  ],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [],
};
