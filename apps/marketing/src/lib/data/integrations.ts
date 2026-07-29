export type IntegrationCategory =
  | 'sales'
  | 'courier'
  | 'payment'
  | 'government'
  | 'accounting'
  | 'messaging';

export interface Integration {
  slug: string;
  name: string;
  nameUr: string;
  category: IntegrationCategory;
  logo: string;
  color: string;
  descriptionEn: string;
  descriptionUr: string;
  featured?: boolean;
  status: 'live' | 'beta' | 'soon';
}

export const integrations: Integration[] = [
  // Sales channels
  { slug: 'foodpanda', name: 'Foodpanda', nameUr: 'فوڈ پانڈا', category: 'sales', logo: '🐼', color: '#d70f64', descriptionEn: 'Sync menu, receive orders, and update statuses automatically.', descriptionUr: 'مینو ہم آہنگ کریں، آرڈرز موصول کریں اور اسٹیٹس خودکار اپ ڈیٹ کریں۔', featured: true, status: 'live' },
  { slug: 'daraz', name: 'Daraz', nameUr: 'دراز', category: 'sales', logo: '🛍️', color: '#f57224', descriptionEn: 'OAuth-based Daraz Seller Center integration for orders and inventory.', descriptionUr: 'آرڈرز اور انوینٹری کے لیے دراز سیلر سینٹر انضمام۔', featured: true, status: 'live' },
  { slug: 'shopify', name: 'Shopify', nameUr: 'شاپیفائی', category: 'sales', logo: '🛒', color: '#96bf48', descriptionEn: 'Two-way sync between Nafaa and your Shopify storefront.', descriptionUr: 'نفع اور آپ کے شاپیفائی اسٹور کے درمیان دو طرفہ ہم آہنگی۔', status: 'live' },
  { slug: 'woocommerce', name: 'WooCommerce', nameUr: 'ووکامرس', category: 'sales', logo: '🌐', color: '#7f54b3', descriptionEn: 'WordPress-powered store integration with real-time stock sync.', descriptionUr: 'ورڈ پریس اسٹور کا لائیو اسٹاک ہم آہنگی کے ساتھ انضمام۔', status: 'live' },
  { slug: 'custom-website', name: 'Custom Website', nameUr: 'کسٹم ویب سائٹ', category: 'sales', logo: '⚙️', color: '#0284c7', descriptionEn: 'Connect any custom website via secure webhook APIs.', descriptionUr: 'کسی بھی ویب سائٹ کو محفوظ ویب ہک اے پی آئی کے ذریعے جوڑیں۔', featured: true, status: 'live' },

  // Couriers
  { slug: 'tcs', name: 'TCS Courier', nameUr: 'ٹی سی ایس کوریئر', category: 'courier', logo: '📦', color: '#ee1c25', descriptionEn: 'Book shipments and track deliveries with TCS across Pakistan.', descriptionUr: 'ٹی سی ایس کے ساتھ پاکستان بھر میں شپمنٹ بک اور ٹریک کریں۔', featured: true, status: 'live' },
  { slug: 'leopards', name: 'Leopards Courier', nameUr: 'لیپرڈز کوریئر', category: 'courier', logo: '🐆', color: '#f7941d', descriptionEn: 'Leopards Courier Services integration for e-commerce.', descriptionUr: 'ای کامرس کے لیے لیپرڈز کوریئر انضمام۔', status: 'live' },
  { slug: 'postex', name: 'PostEx', nameUr: 'پوسٹ ایکس', category: 'courier', logo: '📮', color: '#4f46e5', descriptionEn: 'COD-optimized delivery with PostEx across Pakistan.', descriptionUr: 'پاکستان بھر میں سی او ڈی کے لیے موزوں پوسٹ ایکس ڈیلیوری۔', status: 'live' },
  { slug: 'callcourier', name: 'CallCourier', nameUr: 'کال کوریئر', category: 'courier', logo: '📞', color: '#059669', descriptionEn: 'On-demand courier bookings with CallCourier.', descriptionUr: 'کال کوریئر کے ساتھ آن ڈیمانڈ بکنگ۔', status: 'live' },

  // Payments
  { slug: 'jazzcash', name: 'JazzCash', nameUr: 'جاز کیش', category: 'payment', logo: '💜', color: '#ba0c2f', descriptionEn: 'Accept JazzCash payments — mobile wallet and card.', descriptionUr: 'جاز کیش ادائیگیاں قبول کریں — موبائل والیٹ اور کارڈ۔', featured: true, status: 'live' },
  { slug: 'easypaisa', name: 'Easypaisa', nameUr: 'ایزی پیسہ', category: 'payment', logo: '💚', color: '#00a651', descriptionEn: 'Accept Easypaisa mobile wallet payments seamlessly.', descriptionUr: 'ایزی پیسہ موبائل والیٹ ادائیگیاں قبول کریں۔', featured: true, status: 'live' },
  { slug: 'raast', name: 'Raast', nameUr: 'راست', category: 'payment', logo: '⚡', color: '#0d9488', descriptionEn: 'State Bank Raast instant payments — bank-to-bank in seconds.', descriptionUr: 'اسٹیٹ بینک راست فوری ادائیگیاں — چند سیکنڈوں میں۔', featured: true, status: 'live' },
  { slug: 'nayapay', name: 'NayaPay', nameUr: 'نیا پے', category: 'payment', logo: '🆕', color: '#8b5cf6', descriptionEn: 'NayaPay wallet integration for modern digital payments.', descriptionUr: 'جدید ڈجیٹل ادائیگیوں کے لیے نیا پے والیٹ۔', status: 'live' },
  { slug: 'sadapay', name: 'SadaPay', nameUr: 'سدا پے', category: 'payment', logo: '💳', color: '#0d9488', descriptionEn: 'SadaPay card and wallet payments.', descriptionUr: 'سدا پے کارڈ اور والیٹ ادائیگیاں۔', status: 'live' },
  { slug: 'stripe', name: 'Stripe', nameUr: 'اسٹرائپ', category: 'payment', logo: '💎', color: '#635bff', descriptionEn: 'International card payments with Stripe.', descriptionUr: 'اسٹرائپ کے ذریعے بین الاقوامی کارڈ ادائیگیاں۔', status: 'live' },

  // Government
  { slug: 'fbr', name: 'FBR POS', nameUr: 'ایف بی آر پی او ایس', category: 'government', logo: '🏛️', color: '#01411c', descriptionEn: 'Real-time invoice reporting to Pakistan\'s Federal Board of Revenue.', descriptionUr: 'پاکستان کے ایف بی آر کو براہِ راست انوائس رپورٹنگ۔', featured: true, status: 'live' },
  { slug: 'pra', name: 'Punjab Revenue Authority', nameUr: 'پنجاب ریونیو اتھارٹی', category: 'government', logo: '🌿', color: '#065f46', descriptionEn: 'PRA-compliant reporting for Punjab-based businesses.', descriptionUr: 'پنجاب میں کاروبار کے لیے پی آر اے کے مطابق رپورٹنگ۔', status: 'beta' },
  { slug: 'srb', name: 'Sindh Revenue Board', nameUr: 'سندھ ریونیو بورڈ', category: 'government', logo: '☀️', color: '#78350f', descriptionEn: 'SRB-compliant reporting for Sindh-based businesses.', descriptionUr: 'سندھ میں کاروبار کے لیے ایس آر بی کے مطابق رپورٹنگ۔', status: 'beta' },

  // Messaging
  { slug: 'whatsapp-business', name: 'WhatsApp Business', nameUr: 'واٹس ایپ بزنس', category: 'messaging', logo: '💬', color: '#25d366', descriptionEn: 'Send receipts, reminders, and marketing via WhatsApp Business API.', descriptionUr: 'واٹس ایپ بزنس اے پی آئی سے رسیدیں، یاد دہانیاں اور مارکیٹنگ بھیجیں۔', featured: true, status: 'live' },

  // Accounting
  { slug: 'quickbooks', name: 'QuickBooks', nameUr: 'کوئک بکس', category: 'accounting', logo: '📊', color: '#2ca01c', descriptionEn: 'Sync sales, expenses, and inventory with QuickBooks.', descriptionUr: 'سیلز، اخراجات اور انوینٹری کوئک بکس سے ہم آہنگ کریں۔', status: 'soon' },
];

export const featuredIntegrations = integrations.filter((i) => i.featured);
export const integrationsByCategory = (cat: IntegrationCategory) => integrations.filter((i) => i.category === cat);
export const getIntegration = (slug: string) => integrations.find((i) => i.slug === slug);
