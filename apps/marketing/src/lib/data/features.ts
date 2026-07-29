export interface Feature {
  slug: string;
  icon: string;
  nameEn: string;
  nameUr: string;
  taglineEn: string;
  taglineUr: string;
  category: 'core' | 'advanced' | 'intelligence';
  color: string;
}

export const features: Feature[] = [
  { slug: 'pos', icon: 'Zap', nameEn: 'Point of Sale', nameUr: 'پوائنٹ آف سیل', taglineEn: 'Blazing-fast checkout that works offline.', taglineUr: 'برق رفتار چیک آؤٹ جو آف لائن بھی کام کرے۔', category: 'core', color: '#12b76a' },
  { slug: 'inventory', icon: 'Package', nameEn: 'Smart Inventory', nameUr: 'ذہین انوینٹری', taglineEn: 'Multi-unit, batches, expiries, and IMEI in one place.', taglineUr: 'متعدد یونٹ، بیچ، ایکسپائری اور آئی ایم ای آئی، سب ایک جگہ۔', category: 'core', color: '#8b5cf6' },
  { slug: 'khata', icon: 'BookOpen', nameEn: 'Digital Khata', nameUr: 'ڈجیٹل کھاتہ', taglineEn: 'Replace the paper register forever.', taglineUr: 'کاغذی رجسٹر کو ہمیشہ کے لیے بھول جائیں۔', category: 'core', color: '#0284c7' },
  { slug: 'multi-shop', icon: 'Building2', nameEn: 'Multi-Shop', nameUr: 'متعدد دکانیں', taglineEn: 'One dashboard, unlimited locations.', taglineUr: 'ایک ڈیش بورڈ، لامحدود مقامات۔', category: 'core', color: '#f97316' },
  { slug: 'bookings', icon: 'Calendar', nameEn: 'Bookings and Advances', nameUr: 'بکنگ و ایڈوانس', taglineEn: 'Reserve stock, take deposits, convert to sales.', taglineUr: 'اسٹاک محفوظ کریں، ایڈوانس لیں، سیل میں بدلیں۔', category: 'core', color: '#ec4899' },
  { slug: 'loyalty', icon: 'Award', nameEn: 'Loyalty and Rewards', nameUr: 'لائلٹی و انعامات', taglineEn: 'Tiered points and cashback that customers love.', taglineUr: 'درجہ بند پوائنٹس اور کیش بیک جو گاہک پسند کریں۔', category: 'core', color: '#f59e0b' },
  { slug: 'analytics', icon: 'BarChart3', nameEn: 'Business Intelligence', nameUr: 'کاروباری تجزیات', taglineEn: 'Live dashboards and predictive insights.', taglineUr: 'لائیو ڈیش بورڈ اور پیش گوئیاں۔', category: 'advanced', color: '#06b6d4' },
  { slug: 'staff', icon: 'Users', nameEn: 'Staff Management', nameUr: 'اسٹاف مینجمنٹ', taglineEn: 'Attendance, salary, and commissions handled.', taglineUr: 'حاضری، تنخواہ اور کمیشن، سب سنبھالا ہوا۔', category: 'advanced', color: '#a855f7' },
  { slug: 'fbr', icon: 'Landmark', nameEn: 'FBR Integration', nameUr: 'ایف بی آر انضمام', taglineEn: 'Compliant real-time reporting to FBR.', taglineUr: 'ایف بی آر کو لائیو تعمیل شدہ رپورٹنگ۔', category: 'advanced', color: '#01411c' },
  { slug: 'mobile-app', icon: 'Smartphone', nameEn: 'Mobile & Desktop Apps', nameUr: 'موبائل و ڈیسک ٹاپ ایپس', taglineEn: 'iOS, Android, Windows, and macOS — all included.', taglineUr: 'آئی او ایس، اینڈرائیڈ، ونڈوز اور میک، سب شامل۔', category: 'advanced', color: '#5b6785' },
  { slug: 'ai-assistant', icon: 'Sparkles', nameEn: 'AI Business Assistant', nameUr: 'اے آئی معاون', taglineEn: 'Ask anything in plain language and get answers.', taglineUr: 'عام زبان میں سوال کریں، فوری جواب پائیں۔', category: 'intelligence', color: '#8b5cf6' },
  { slug: 'fraud-detection', icon: 'Shield', nameEn: 'Fraud Detection', nameUr: 'فراڈ کا سراغ', taglineEn: 'Risk scoring on every transaction.', taglineUr: 'ہر لین دین پر رِسک اسکورنگ۔', category: 'intelligence', color: '#ef4444' },
  { slug: 'marketplace-selling', icon: 'ShoppingBag', nameEn: 'Marketplace Selling', nameUr: 'بازار میں فروخت', taglineEn: 'List on Nafaa Bazaar and reach millions.', taglineUr: 'نفع بازار پر درج کریں اور لاکھوں تک پہنچیں۔', category: 'core', color: '#ec4899' },
  { slug: 'notifications', icon: 'Bell', nameEn: 'Unified Messaging', nameUr: 'متحد پیغام رسانی', taglineEn: 'SMS, email, WhatsApp, and push from one place.', taglineUr: 'ایس ایم ایس، ای میل، واٹس ایپ اور پش، ایک جگہ سے۔', category: 'advanced', color: '#0284c7' },
  { slug: 'reports', icon: 'FileText', nameEn: 'Reports Library', nameUr: 'رپورٹس لائبریری', taglineEn: 'Sixty-plus reports, exportable in one click.', taglineUr: 'ساٹھ سے زیادہ رپورٹس، ایک کلک میں ایکسپورٹ۔', category: 'core', color: '#059669' },
  { slug: 'api', icon: 'Code', nameEn: 'Developer API', nameUr: 'ڈویلپر اے پی آئی', taglineEn: 'Build anything with our REST API and webhooks.', taglineUr: 'ہماری REST اے پی آئی اور ویب ہکس سے کچھ بھی بنائیں۔', category: 'advanced', color: '#0891b2' },
];

export const featuresByCategory = (cat: Feature['category']) => features.filter((f) => f.category === cat);
export const getFeature = (slug: string) => features.find((f) => f.slug === slug);
