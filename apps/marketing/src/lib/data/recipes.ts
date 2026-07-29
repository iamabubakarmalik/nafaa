export interface Recipe {
  slug: string;
  titleEn: string; titleUr: string;
  descEn: string; descUr: string;
  emoji: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  setupTime: string;
  integrations: string[];
  steps: Array<{ titleEn: string; titleUr: string }>;
  color: string;
}

export const recipes: Recipe[] = [
  {
    slug: 'bakery-starter-pack',
    titleEn: 'Bakery Starter Pack', titleUr: 'بیکری اسٹارٹر پیک',
    descEn: 'Nafaa + Foodpanda + WhatsApp + JazzCash — everything a bakery needs to start selling online in 30 minutes.',
    descUr: 'نفع + فوڈ پانڈا + واٹس ایپ + جاز کیش — بیکری کے لیے سب کچھ۔',
    emoji: '🍰', difficulty: 'beginner', setupTime: '30 min',
    integrations: ['foodpanda', 'whatsapp-business', 'jazzcash', 'fbr'],
    color: '#f97316',
    steps: [
      { titleEn: 'Connect Foodpanda', titleUr: 'فوڈ پانڈا جوڑیں' },
      { titleEn: 'Set up WhatsApp receipts', titleUr: 'واٹس ایپ رسیدیں' },
      { titleEn: 'Enable JazzCash payments', titleUr: 'جاز کیش فعال' },
      { titleEn: 'Activate FBR compliance', titleUr: 'ایف بی آر تعمیل' },
    ],
  },
  {
    slug: 'restaurant-delivery-machine',
    titleEn: 'Restaurant Delivery Machine', titleUr: 'ریسٹورنٹ ڈیلیوری مشین',
    descEn: 'Nafaa + Foodpanda + TCS + Raast — turn your restaurant into a delivery powerhouse.',
    descUr: 'نفع + فوڈ پانڈا + ٹی سی ایس + راست۔',
    emoji: '🍽️', difficulty: 'intermediate', setupTime: '45 min',
    integrations: ['foodpanda', 'tcs', 'raast', 'whatsapp-business'],
    color: '#dc2626',
    steps: [
      { titleEn: 'Connect Foodpanda for orders', titleUr: 'فوڈ پانڈا آرڈرز' },
      { titleEn: 'Set up TCS delivery dispatch', titleUr: 'ٹی سی ایس ڈیلیوری' },
      { titleEn: 'Enable Raast zero-fee payments', titleUr: 'راست مفت ادائیگیاں' },
      { titleEn: 'Automate WhatsApp order updates', titleUr: 'واٹس ایپ اپ ڈیٹس' },
    ],
  },
  {
    slug: 'ecommerce-full-stack',
    titleEn: 'E-commerce Full Stack', titleUr: 'ای کامرس فل اسٹیک',
    descEn: 'Nafaa + Daraz + Shopify + Leopards + JazzCash — sell everywhere from one inventory.',
    descUr: 'نفع + دراز + شاپیفائی + لیوپارڈز + جاز کیش۔',
    emoji: '🛒', difficulty: 'advanced', setupTime: '90 min',
    integrations: ['daraz', 'shopify', 'leopards', 'jazzcash', 'easypaisa'],
    color: '#8b5cf6',
    steps: [
      { titleEn: 'Connect Daraz Seller Center', titleUr: 'دراز سیلر سینٹر' },
      { titleEn: 'Sync Shopify store', titleUr: 'شاپیفائی ہم آہنگی' },
      { titleEn: 'Set up Leopards courier', titleUr: 'لیوپارڈز کوریئر' },
      { titleEn: 'Unify all payment methods', titleUr: 'تمام ادائیگیاں متحد' },
    ],
  },
  {
    slug: 'kiryana-digital-upgrade',
    titleEn: 'Kiryana Digital Upgrade', titleUr: 'کریانہ ڈجیٹل اپ گریڈ',
    descEn: 'Nafaa + WhatsApp + JazzCash — the simplest digital upgrade for any kiryana store.',
    descUr: 'نفع + واٹس ایپ + جاز کیش — کریانہ کے لیے آسان اپ گریڈ۔',
    emoji: '🏪', difficulty: 'beginner', setupTime: '15 min',
    integrations: ['whatsapp-business', 'jazzcash', 'easypaisa'],
    color: '#12b76a',
    steps: [
      { titleEn: 'Import products from Excel', titleUr: 'ایکسل سے امپورٹ' },
      { titleEn: 'Set up WhatsApp khata reminders', titleUr: 'واٹس ایپ یاد دہانیاں' },
      { titleEn: 'Accept JazzCash + Easypaisa', titleUr: 'جاز کیش + ایزی پیسہ' },
    ],
  },
  {
    slug: 'pharmacy-compliance-suite',
    titleEn: 'Pharmacy Compliance Suite', titleUr: 'فارمیسی تعمیل سوٹ',
    descEn: 'Nafaa + FBR + WhatsApp + Raast — full DRAP and FBR compliance for modern pharmacies.',
    descUr: 'نفع + ایف بی آر + واٹس ایپ + راست۔',
    emoji: '💊', difficulty: 'intermediate', setupTime: '60 min',
    integrations: ['fbr', 'whatsapp-business', 'raast', 'jazzcash'],
    color: '#0891b2',
    steps: [
      { titleEn: 'Activate FBR POS integration', titleUr: 'ایف بی آر پی او ایس' },
      { titleEn: 'Set up batch & expiry tracking', titleUr: 'بیچ اور ایکسپائری' },
      { titleEn: 'Enable prescription WhatsApp alerts', titleUr: 'نسخہ الرٹس' },
      { titleEn: 'Accept Raast payments', titleUr: 'راست ادائیگیاں' },
    ],
  },
  {
    slug: 'garments-omnichannel',
    titleEn: 'Garments Omnichannel', titleUr: 'گارمنٹس آمنی چینل',
    descEn: 'Nafaa + Daraz + WhatsApp + TCS — sell in-store and online with unified inventory.',
    descUr: 'نفع + دراز + واٹس ایپ + ٹی سی ایس۔',
    emoji: '👗', difficulty: 'intermediate', setupTime: '50 min',
    integrations: ['daraz', 'whatsapp-business', 'tcs', 'jazzcash'],
    color: '#ec4899',
    steps: [
      { titleEn: 'Set up size & color variants', titleUr: 'سائز اور رنگ' },
      { titleEn: 'Connect Daraz for online sales', titleUr: 'دراز آن لائن' },
      { titleEn: 'Enable WhatsApp catalog sharing', titleUr: 'واٹس ایپ کیٹلاگ' },
      { titleEn: 'Set up TCS for nationwide shipping', titleUr: 'ٹی سی ایس شپنگ' },
    ],
  },
];

export const getRecipe = (slug: string) => recipes.find((r) => r.slug === slug);
