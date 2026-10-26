/** Urdu: Nafaa Bazaar marketplace page (/ur/marketplace). Translation of content/main-pages/pages.ts (marketplace). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';
import { SHOT } from '../../main-pages/_build';

export const faqs: SeedFaq[] = [
  {
    key: 'ur-page-marketplace-what',
    locale: 'ur',
    topic: 'marketplace',
    question: 'Nafaa Bazaar کیا ہے؟',
    answer:
      'Nafaa Bazaar، Nafaa کی مارکیٹ پلیس ہے، جہاں خریدار Nafaa استعمال کرنے والی دکانوں کا سامان دیکھتے اور آرڈر کرتے ہیں۔ آپ خود چنتے ہیں کہ کون سی پروڈکٹس لگانی ہیں، اور ان کی قیمت اور اسٹاک آپ کے Nafaa اکاؤنٹ سے آتے ہیں۔ آرڈر اسی ایپ میں آتے ہیں جس میں آپ کی کاؤنٹر سیل اور آن لائن آرڈر آتے ہیں۔',
    sourceNote: 'apps/marketplace (buyer app); apps/api/src/marketplace (publishing, orders); apps/web/src/marketplace (seller screens).',
    origin: 'translation of faq mp-bazaar-what',
    evidence: [
      'apps/marketplace',
      'apps/api/src/marketplace/publishing',
      'apps/api/src/marketplace/orders',
      'apps/web/src/marketplace/products/MarketplaceProductsPage.tsx',
    ],
  },
  {
    key: 'ur-page-marketplace-delivery',
    locale: 'ur',
    topic: 'marketplace',
    question: 'Nafaa Bazaar کے آرڈر کی ڈیلیوری کون کرتا ہے؟',
    answer:
      'آپ خود، اپنے رائیڈرز کے ساتھ۔ Nafaa میں رائیڈرز شامل کریں، دیکھیں کون فارغ ہے اور کون ڈیلیوری پر نکلا ہوا ہے، آرڈر ان کے حوالے کریں اور راستے میں ان کی خبر رکھیں۔ آرڈر اور اس کی رقم اسی ایپ میں رہتے ہیں جس میں آپ کی کاؤنٹر سیل ہوتی ہے، اس لیے حساب الگ نہیں کرنا پڑتا۔',
    sourceNote: 'MarketplaceDeliveryPage (riders and statuses); RiderTrackingPage.',
    origin: 'translation of faq hub-bazaar-delivery',
    evidence: ['apps/web/src/marketplace/delivery/MarketplaceDeliveryPage.tsx', 'apps/web/src/marketplace/rider-tracking/RiderTrackingPage.tsx'],
  },
  {
    key: 'ur-page-marketplace-who',
    locale: 'ur',
    topic: 'marketplace',
    question: 'کیا کوئی بھی دکان Nafaa Bazaar پر بیچ سکتی ہے؟',
    answer:
      'Nafaa Bazaar ان دکانوں کے لیے ہے جو Nafaa پر چلتی ہیں، کیونکہ لسٹنگ، قیمت اور اسٹاک آپ کے Nafaa اکاؤنٹ سے آتے ہیں۔ فری ٹرائل شروع کریں، اپنی پروڈکٹس ڈالیں، دکان کی پروفائل بھریں اور چنیں کہ کیا لگانا ہے۔ جو پروڈکٹس آپ نہیں لگاتے وہ صرف آپ کے کاؤنٹر تک رہتی ہیں۔',
    sourceNote: 'Marketplace publishing reads the tenant catalogue.',
    origin: 'translation of faq hub-bazaar-who',
    evidence: ['apps/api/src/marketplace/publishing', 'apps/web/src/marketplace/shop-profile/ShopProfilePage.tsx'],
  },
  {
    key: 'ur-page-marketplace-stock',
    locale: 'ur',
    topic: 'solutions',
    question: 'کیا Nafaa Bazaar، میرا آن لائن اسٹور اور دکان ایک ہی اسٹاک استعمال کرتے ہیں؟',
    answer:
      'جی ہاں۔ ویب سائٹ، Shopify، WooCommerce، Daraz اور Nafaa Bazaar کے آرڈر انہی پروڈکٹس سے اسٹاک کم کرتے ہیں جن سے کاؤنٹر کرتا ہے۔ جب دکان میں آخری پیس بکتا ہے تو آن لائن چینل بھی اپ ڈیٹ ہو جاتے ہیں، اس لیے وہ چیز نہیں بکتی جو آپ کے پاس رہی ہی نہیں۔',
    sourceNote: 'stock-push.service and channel-catalog.service; marketplace publishing from Nafaa products.',
    origin: 'translation of faq mp-ecommerce-stock',
    evidence: [
      'apps/api/src/integrations/online-orders/stock-push.service.ts',
      'apps/api/src/integrations/online-orders/channel-catalog.service.ts',
      'apps/api/src/marketplace/publishing',
    ],
  },
  {
    key: 'ur-page-marketplace-sell-online',
    locale: 'ur',
    topic: 'getting-started',
    question: 'Nafaa Bazaar کے علاوہ Nafaa سے آن لائن اور کہاں بیچ سکتا ہوں؟',
    answer:
      'آپ کی اپنی ویب سائٹ، Shopify اسٹور یا WooCommerce اسٹور کے آرڈر Nafaa میں کاؤنٹر کی سیل کے ساتھ ہی آتے ہیں، اور اسٹاک بھی اسی شیلف سے کم ہوتا ہے۔ نئے خریداروں تک پہنچنے کے لیے یہی پروڈکٹس Nafaa Bazaar پر بھی لگائی جا سکتی ہیں، جو Nafaa کی اپنی مارکیٹ پلیس ہے۔',
    sourceNote: 'Online orders (website, Shopify, WooCommerce normaliser) and marketplace publishing.',
    origin: 'translation of faq sell-online',
    evidence: [
      'apps/api/src/integrations/online-orders/order-normalizer.ts',
      'apps/api/src/integrations/channels/custom-website',
      'apps/api/src/marketplace/publishing',
    ],
  },
];

export const entry: SeedEntry = {
  type: 'PAGE',
  locale: 'ur',
  slug: 'marketplace',
  title: 'Nafaa Bazaar',
  seoTitle: 'Nafaa Bazaar: پاکستان میں Nafaa کی مارکیٹ پلیس پر بیچیں',
  seoDescription:
    'اپنے Nafaa اسٹاک سے پروڈکٹس Nafaa Bazaar پر لگائیں، آرڈر اسی ایپ میں لیں، اور ریویوز، پروموشن اور ڈیلیوری سنبھالیں۔ Nafaa استعمال کرنے والی دکانوں کے لیے۔',
  focusKeyword: 'آن لائن مارکیٹ پلیس پاکستان',
  summary:
    'Nafaa Bazaar، Nafaa کی مارکیٹ پلیس ہے۔ Nafaa استعمال کرنے والی دکانیں اپنے اسٹاک سے پروڈکٹس لگاتی ہیں، خریدار دیکھ کر آرڈر کرتے ہیں، اور ہر آرڈر اسی ایپ میں آتا ہے جس میں کاؤنٹر سیل اور آن لائن آرڈر آتے ہیں، ساتھ میں دکان کی پروفائل، ریویوز، پروموشن، خریداروں کے میسج اور ڈیلیوری ایک جگہ۔',
  data: { template: 'default' },
  blocks: [
    {
      type: 'hero',
      eyebrow: 'Nafaa Bazaar مارکیٹ پلیس',
      heading: 'آپ کی دکان، اپنی گلی سے کہیں دور کے خریداروں کے لیے کھلی',
      sub: 'جو اسٹاک آپ پہلے سے Nafaa میں رکھتے ہیں اسی سے پروڈکٹس لگائیں۔ خریدار Nafaa Bazaar پر آپ کی دکان ڈھونڈتے ہیں، آرڈر کاؤنٹر سیل کے ساتھ آتے ہیں، اور قیمت اور اسٹاک خود ملتے رہتے ہیں۔',
      primaryCta: { label: 'بیچنا شروع کریں', href: 'signup', variant: 'primary', trackAs: 'hero_signup' },
      secondaryCta: { label: 'ڈیمو بک کریں', href: 'demo', variant: 'secondary', trackAs: 'hero_demo' },
      badges: ['آپ کے اسٹاک سے لسٹنگ', 'آرڈر اسی ایپ میں'],
      media: {
        kind: 'diagram',
        diagram: {
          kind: 'flow',
          nodes: [
            { id: 'stock', label: 'آپ کا Nafaa اسٹاک', icon: 'boxes' },
            { id: 'list', label: 'Bazaar پر لسٹ', icon: 'store' },
            { id: 'buyer', label: 'خریدار کا آرڈر', icon: 'shopping-cart' },
            { id: 'order', label: 'آرڈر Nafaa میں', icon: 'bell-ring' },
            { id: 'deliver', label: 'ڈیلیور', icon: 'truck' },
          ],
          edges: [
            { from: 'stock', to: 'list' },
            { from: 'list', to: 'buyer' },
            { from: 'buyer', to: 'order' },
            { from: 'order', to: 'deliver' },
          ],
        },
      },
      layout: 'split',
      id: 'b645445c3292',
    },
    {
      type: 'answerBox',
      heading: 'Nafaa Bazaar مختصراً',
      facts: [
        { label: 'یہ کیا ہے', value: 'Nafaa استعمال کرنے والی دکانوں کے لیے Nafaa کی مارکیٹ پلیس' },
        { label: 'لسٹنگ', value: 'اپنے Nafaa اسٹاک سے پروڈکٹس چنیں؛ قیمت اور اسٹاک خود ملتے رہتے ہیں' },
        { label: 'آرڈر', value: 'Nafaa ایپ میں کاؤنٹر سیل اور آن لائن آرڈر کے ساتھ آتے ہیں' },
        { label: 'سنبھالنا', value: 'دکان کی پروفائل، ریویوز، پروموشن، خریداروں کے میسج اور ڈیلیوری' },
      ],
      romanUrdu:
        'Nafaa Bazaar Nafaa ka marketplace hai. Apne stock se products list karein, khareedar order karein, aur order usi app me aaye jahan counter ki Sale hoti hai.',
      id: 'bbf50f1074e2',
    },
    {
      type: 'featuresGrid',
      heading: 'مارکیٹ پلیس پر بیچنے والے کو جو کچھ چاہیے',
      columns: 2,
      items: [
        { icon: 'boxes', title: 'اپنے اسٹاک سے لسٹ کریں', body: 'Nafaa سے پروڈکٹس چنیں؛ قیمت اور اسٹاک آپ کے کاؤنٹر کے ساتھ چلتے ہیں۔' },
        { icon: 'store', title: 'دکان کی پروفائل', body: 'خریداروں کے لیے آپ کی دکان کا نام، تصویریں، اوقات اور تفصیل۔' },
        { icon: 'bell-ring', title: 'سارے آرڈر ایک جگہ', body: 'مارکیٹ پلیس کے آرڈر آپ کے باقی سیل چینلز کے ساتھ آتے ہیں۔' },
        { icon: 'star', title: 'ریویوز', body: 'دیکھیں خریدار آپ کی دکان کے بارے میں کیا کہتے ہیں، اور جواب دیں۔' },
        { icon: 'badge-percent', title: 'پروموشن اور کوپن', body: 'مارکیٹ پلیس کے خریداروں کے لیے آفر چلائیں۔' },
        { icon: 'message-square', title: 'خریداروں کے میسج', body: 'خریداروں کے سوالوں کا جواب Nafaa ایپ سے دیں۔' },
        { icon: 'truck', title: 'ڈیلیوری', body: 'آپ کے اپنے رائیڈرز، ان کی حالت اور ان کے پاس موجود آرڈرز کے ساتھ۔' },
        { icon: 'chart-line', title: 'اینالیٹکس', body: 'مارکیٹ پلیس سے آنے والے ویوز، آرڈر اور سیل۔' },
      ],
      id: 'b05ac522a560',
    },
    {
      type: 'diagram',
      heading: 'دکان، ویب سائٹ اور مارکیٹ پلیس کے لیے ایک ہی اسٹاک',
      caption: 'ہر چینل کے آرڈر Nafaa میں آتے ہیں؛ اسٹاک کی تبدیلی واپس ہر چینل تک جاتی ہے۔',
      diagram: { kind: 'store-sync', animate: true },
      theme: 'muted',
      id: 'bd80e8d7beaa',
    },
    {
      type: 'steps',
      heading: 'چار قدم میں بیچنا شروع کریں',
      items: [
        { title: 'اپنی دکان کے لیے Nafaa چلائیں', body: 'فری ٹرائل شروع کریں اور اپنی پروڈکٹس ڈالیں۔' },
        { title: 'دکان کی پروفائل بنائیں', body: 'نام، تصویریں، علاقہ اور کھلنے کے اوقات۔' },
        { title: 'چنیں کیا لگانا ہے', body: 'وہ پروڈکٹس چنیں جو Nafaa Bazaar پر دکھانی ہیں۔' },
        { title: 'آرڈر لیں', body: 'قبول کریں، پیک کریں اور ڈیلیور کریں؛ اسٹاک خود اپ ڈیٹ ہوتا ہے۔' },
      ],
      id: 'ba23674a6448',
    },
    {
      type: 'comparisonTable',
      heading: 'آپ کا اپنا آن لائن اسٹور اور Nafaa Bazaar',
      caption: 'دونوں ایک ہی Nafaa اسٹاک سے چلتے ہیں اور آرڈر ایک ہی لسٹ میں آتے ہیں۔ زیادہ تر بیچنے والے دونوں چلاتے ہیں: اسٹور ان خریداروں کے لیے جو انہیں پہلے سے جانتے ہیں، اور مارکیٹ پلیس تاکہ نئے خریدار انہیں ڈھونڈ سکیں۔',
      columns: [
        { key: 'own', label: 'آپ کا اپنا اسٹور' },
        { key: 'bazaar', label: 'Nafaa Bazaar', highlight: true },
      ],
      rows: [
        { label: 'آپ تک کون پہنچتا ہے', cells: { own: { value: 'جنہیں آپ خود لاتے ہیں: فالوورز، گاہک، سرچ' }, bazaar: { value: 'مارکیٹ پلیس پر سامان دیکھتے خریدار' } } },
        { label: 'سیٹ اپ', cells: { own: { value: 'ویب سائٹ، Shopify یا WooCommerce جوڑیں، یا Nafaa کا آرڈر لنک شیئر کریں' }, bazaar: { value: 'دکان کی پروفائل بھریں اور پروڈکٹس چنیں' } } },
        { label: 'اسٹاک اور قیمت', cells: { own: { value: 'Nafaa سے' }, bazaar: { value: 'Nafaa سے' } } },
        { label: 'آرڈر', cells: { own: { value: 'Nafaa کے آن لائن آرڈرز میں' }, bazaar: { value: 'Nafaa میں، باقی ہر چینل کے ساتھ' } } },
        { label: 'ڈیلیوری', cells: { own: { value: 'آرڈر سے کوریئر کی بکنگ، یا آپ کے اپنے رائیڈرز' }, bazaar: { value: 'آپ کے اپنے رائیڈرز' } } },
      ],
      id: 'b1edd1fa1b7b',
    },
    {
      type: 'diagram',
      heading: 'مارکیٹ پلیس کا آرڈر کیسے چلتا ہے',
      caption: 'خریدار Nafaa Bazaar پر آپ کی دکان ڈھونڈتے ہیں؛ آرڈر اسی ایپ میں آتا ہے جس میں آپ کی کاؤنٹر سیل ہوتی ہے۔',
      diagram: {
        kind: 'flow',
        nodes: [
          { id: 'list', label: 'پروڈکٹس لسٹ کریں', icon: 'tags', note: 'آپ کے اسٹاک سے' },
          { id: 'browse', label: 'خریدار دیکھتے ہیں', icon: 'search' },
          { id: 'order', label: 'آرڈر Nafaa میں', icon: 'bell-ring' },
          { id: 'deliver', label: 'پیک اور ڈیلیور', icon: 'truck' },
          { id: 'stock', label: 'اسٹاک اپ ڈیٹ', icon: 'boxes' },
        ],
        edges: [
          { from: 'list', to: 'browse' },
          { from: 'browse', to: 'order' },
          { from: 'order', to: 'deliver' },
          { from: 'deliver', to: 'stock' },
        ],
        animate: true,
      },
      id: 'bc23350e776a',
    },
    {
      type: 'screenshot',
      heading: 'ہر چینل کے لیے ایک آرڈر لسٹ',
      body: 'مارکیٹ پلیس کے آرڈر ویب سائٹ اور باقی آن لائن آرڈرز کے ساتھ ہوتے ہیں، ہر ایک اپنی حالت اور خریدار کے ساتھ، اس لیے ایک ہی بندہ کاؤنٹر کی سیل کے بیچ میں یہ سب سنبھال سکتا ہے۔',
      mediaId: SHOT.onlineOrders,
      frame: 'browser',
      url: 'app.nafaa.pk/online-orders',
      layout: 'split-right',
      id: 'b21ab208a801',
    },
    {
      type: 'richText',
      markdown:
        '## کاؤنٹر، آپ کی ویب سائٹ اور مارکیٹ پلیس کے لیے ایک اسٹاک\n\nNafaa Bazaar کوئی الگ سیلر اکاؤنٹ نہیں جسے الگ سے اپ ڈیٹ رکھنا پڑے۔ یہ وہی پروڈکٹس، قیمتیں اور اسٹاک پڑھتا ہے جو آپ کا کاؤنٹر اور آپ کا اپنا آن لائن اسٹور پڑھتے ہیں، اس لیے جو پیس دکان میں بک گیا وہ مارکیٹ پلیس سے بھی ہٹ جاتا ہے۔ مارکیٹ پلیس کے آرڈر ویب سائٹ، Shopify اور WooCommerce کے آرڈرز والی لسٹ میں ہی ہوتے ہیں، اور رقم انہی رپورٹس میں نظر آتی ہے۔\n\n## یہ کس کے لیے ٹھیک ہے\n\nNafaa Bazaar ان دکانوں کے لیے ٹھیک ہے جن کا سامان آسانی سے بھیجا جا سکے اور جن کے خریدار پیدل فاصلے سے باہر ہوں: [کپڑے](/ur/industries/garments)، [کاسمیٹکس](/ur/industries/cosmetics)، [الیکٹرانکس](/ur/industries/electronics)، [کتابیں](/ur/industries/bookstore) اور ایسے ہی کاروبار۔ اگر آپ پہلے سے آن لائن بیچتے ہیں تو [ای کامرس کا صفحہ](/ur/solutions/ecommerce) دکھاتا ہے کہ مارکیٹ پلیس آپ کی ویب سائٹ، کوریئر اور COD کے ساتھ کیسے جڑتی ہے۔',
      id: 'b38a835729b6',
    },
    { type: 'faq', heading: 'عام سوالات', id: 'b2a8ba5b4ec6' },
    {
      type: 'cta',
      heading: 'اپنی دکان مزید خریداروں کے لیے کھولیں',
      body: 'Nafaa سے شروع کریں، پھر جب تیار ہوں تو Nafaa Bazaar پر لسٹ کریں۔',
      primaryCta: { label: 'مفت ٹرائل شروع کریں', href: 'signup', variant: 'primary', trackAs: 'hero_signup' },
      secondaryCta: { label: 'واٹس ایپ پر پوچھیں', href: 'whatsapp', variant: 'ghost', trackAs: 'whatsapp' },
      id: 'be828f3d327c',
    },
  ],
  faqKeys: [
    'ur-page-marketplace-what',
    'ur-page-marketplace-delivery',
    'ur-page-marketplace-who',
    'ur-page-marketplace-stock',
    'ur-page-marketplace-sell-online',
  ],
  relations: [
    { ref: 'SOLUTION:ecommerce@ur', kind: 'RELATED' },
    { ref: 'PRODUCT:online-store@ur', kind: 'RELATED' },
    { ref: 'PRODUCT:inventory@ur', kind: 'RELATED' },
    { ref: 'SERVICE:online-store-setup@ur', kind: 'RELATED' },
  ],
  origin: 'translation of content/main-pages/pages.ts (26 Oct 2026)',
  evidence: [
    'apps/marketplace/package.json',
    'apps/api/src/marketplace/publishing',
    'apps/api/src/marketplace/orders',
    'apps/web/src/marketplace/products/MarketplaceProductsPage.tsx',
    'apps/web/src/marketplace/shop-profile/ShopProfilePage.tsx',
    'apps/web/src/marketplace/reviews/MarketplaceReviewsPage.tsx',
    'apps/web/src/marketplace/promotions/MarketplacePromotionsPage.tsx',
    'apps/web/src/marketplace/messages/MarketplaceMessagesPage.tsx',
    'apps/web/src/marketplace/delivery/MarketplaceDeliveryPage.tsx',
    'apps/web/src/marketplace/rider-tracking/RiderTrackingPage.tsx',
    'apps/web/src/marketplace/analytics/MarketplaceAnalyticsPage.tsx',
    'apps/web/src/integrations/online-orders/public/PublicOrderPage.tsx',
  ],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [
    'No marketplace screenshot yet: the seller screen shows prices as "Rs Rs" and the dashboard shows a "12,000+ Nafaa Bazaar customers" figure that looks made up (apps/web bugs). Capture after those are fixed.',
    'Buyer reach and how buyers find Nafaa Bazaar (app or website URL) are not stated until the owner confirms them.',
  ],
};
