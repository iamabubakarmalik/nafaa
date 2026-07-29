export interface Plan {
  slug: string;
  nameEn: string;
  nameUr: string;
  taglineEn: string;
  taglineUr: string;
  monthly: number;
  yearly: number; // total yearly price
  color: string;
  popular?: boolean;
  limits: {
    shops: string;
    users: string;
    products: string;
    salesPerMonth: string;
  };
  features: Array<{ en: string; ur: string; included: boolean }>;
}

export const plans: Plan[] = [
  {
    slug: 'starter',
    nameEn: 'Starter', nameUr: 'اسٹارٹر',
    taglineEn: 'Perfect for testing the waters',
    taglineUr: 'آزمانے کے لیے بہترین',
    monthly: 0, yearly: 0,
    color: '#5b6785',
    limits: { shops: '1', users: '2', products: '100', salesPerMonth: '500' },
    features: [
      { en: 'Point of Sale', ur: 'پوائنٹ آف سیل', included: true },
      { en: 'Digital Khata', ur: 'ڈجیٹل کھاتہ', included: true },
      { en: 'Basic inventory', ur: 'بنیادی انوینٹری', included: true },
      { en: 'WhatsApp receipts', ur: 'واٹس ایپ رسیدیں', included: true },
      { en: 'Offline mode', ur: 'آف لائن موڈ', included: true },
      { en: 'Multi-shop', ur: 'متعدد دکانیں', included: false },
      { en: 'FBR integration', ur: 'ایف بی آر انضمام', included: false },
      { en: 'AI Assistant', ur: 'اے آئی معاون', included: false },
      { en: 'Marketplace selling', ur: 'بازار میں فروخت', included: false },
      { en: '24/7 priority support', ur: '۲۴/۷ سپورٹ', included: false },
    ],
  },
  {
    slug: 'growth',
    nameEn: 'Growth', nameUr: 'گروتھ',
    taglineEn: 'For shops ready to scale',
    taglineUr: 'بڑھنے کی تیاری والی دکانوں کے لیے',
    monthly: 2500, yearly: 24000,
    color: '#0284c7',
    limits: { shops: '1', users: '5', products: '2,500', salesPerMonth: '5,000' },
    features: [
      { en: 'Everything in Starter', ur: 'اسٹارٹر کی ہر چیز', included: true },
      { en: 'Advanced inventory (batches, expiry)', ur: 'ایڈوانسڈ انوینٹری', included: true },
      { en: 'Loyalty and rewards', ur: 'لائلٹی و انعامات', included: true },
      { en: 'Reports library (60+)', ur: 'رپورٹس لائبریری', included: true },
      { en: 'Excel/PDF exports', ur: 'ایکسل/پی ڈی ایف', included: true },
      { en: 'JazzCash + Easypaisa + Raast', ur: 'جاز کیش + ایزی پیسہ + راست', included: true },
      { en: 'Multi-shop', ur: 'متعدد دکانیں', included: false },
      { en: 'FBR integration', ur: 'ایف بی آر انضمام', included: false },
      { en: 'AI Assistant', ur: 'اے آئی معاون', included: false },
      { en: 'API access', ur: 'اے پی آئی رسائی', included: false },
    ],
  },
  {
    slug: 'pro',
    nameEn: 'Pro', nameUr: 'پرو',
    taglineEn: 'The complete business operating system',
    taglineUr: 'مکمل بزنس آپریٹنگ سسٹم',
    monthly: 5500, yearly: 52800,
    color: '#12b76a',
    popular: true,
    limits: { shops: '3', users: '15', products: '25,000', salesPerMonth: 'Unlimited' },
    features: [
      { en: 'Everything in Growth', ur: 'گروتھ کی ہر چیز', included: true },
      { en: 'Multi-shop (3 branches)', ur: 'متعدد دکانیں (۳ برانچز)', included: true },
      { en: 'FBR integration', ur: 'ایف بی آر انضمام', included: true },
      { en: 'AI Assistant', ur: 'اے آئی معاون', included: true },
      { en: 'Marketplace selling (Bazaar)', ur: 'بازار میں فروخت', included: true },
      { en: 'Foodpanda + Daraz sync', ur: 'فوڈ پانڈا + دراز', included: true },
      { en: 'Staff management', ur: 'اسٹاف مینجمنٹ', included: true },
      { en: 'Bookings and advances', ur: 'بکنگ و ایڈوانس', included: true },
      { en: 'WhatsApp Business API', ur: 'واٹس ایپ بزنس اے پی آئی', included: true },
      { en: '24/7 priority support', ur: '۲۴/۷ سپورٹ', included: true },
    ],
  },
  {
    slug: 'enterprise',
    nameEn: 'Enterprise', nameUr: 'انٹرپرائز',
    taglineEn: 'Unlimited everything, dedicated team',
    taglineUr: 'لامحدود سب کچھ، وقف ٹیم',
    monthly: 15000, yearly: 144000,
    color: '#f59e0b',
    limits: { shops: 'Unlimited', users: 'Unlimited', products: 'Unlimited', salesPerMonth: 'Unlimited' },
    features: [
      { en: 'Everything in Pro', ur: 'پرو کی ہر چیز', included: true },
      { en: 'Unlimited shops and users', ur: 'لامحدود دکانیں و صارفین', included: true },
      { en: 'Full API access', ur: 'مکمل اے پی آئی', included: true },
      { en: 'Custom integrations', ur: 'کسٹم انضمام', included: true },
      { en: 'Dedicated success manager', ur: 'وقف کامیابی منیجر', included: true },
      { en: 'On-premise option', ur: 'آن پریم آپشن', included: true },
      { en: 'SSO and audit logs', ur: 'ایس ایس او و آڈٹ لاگز', included: true },
      { en: 'Custom SLA (99.99%)', ur: 'کسٹم ایس ایل اے', included: true },
      { en: 'White-label receipts', ur: 'وائیٹ لیبل رسیدیں', included: true },
      { en: 'Fraud detection suite', ur: 'فراڈ ڈیٹیکشن سوٹ', included: true },
    ],
  },
];
