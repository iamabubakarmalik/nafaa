export interface CaseStudy {
  slug: string;
  businessEn: string; businessUr: string;
  ownerEn: string; ownerUr: string;
  city: string; cityUr: string;
  industry: string;
  emoji: string;
  gradient: string;
  taglineEn: string; taglineUr: string;
  challengeEn: string; challengeUr: string;
  solutionEn: string; solutionUr: string;
  results: Array<{ metricEn: string; metricUr: string; valueEn: string; valueUr: string }>;
  quoteEn: string; quoteUr: string;
  duration: string;
}

export const caseStudies: CaseStudy[] = [
  {
    slug: 'ahmad-bakery-lahore',
    businessEn: 'Ahmad Sweets & Bakery', businessUr: 'احمد سویٹس اینڈ بیکری',
    ownerEn: 'Ahmad Raza', ownerUr: 'احمد رضا',
    city: 'Lahore', cityUr: 'لاہور', industry: 'bakery', emoji: '🍰',
    gradient: 'from-amber-500 to-orange-600',
    taglineEn: 'From paper chaos to 42% revenue growth in 90 days', taglineUr: '۹۰ دن میں ۴۲٪ آمدنی اضافہ',
    challengeEn: 'Ahmad was spending 4 hours nightly reconciling paper registers, missing custom cake orders, and losing Rs 15,000 monthly to expired stock.',
    challengeUr: 'احمد روازانہ ۴ گھنٹے کاغذی حساب میں لگاتے تھے۔',
    solutionEn: 'Deployed Nafaa with custom cake order builder, ingredient inventory with expiry alerts, Foodpanda integration, and WhatsApp receipts.',
    solutionUr: 'نفع نے خصوصی کیک آرڈر سسٹم اور ایکسپائری الرٹس فراہم کیے۔',
    results: [
      { metricEn: 'Revenue growth', metricUr: 'آمدنی اضافہ', valueEn: '+42%', valueUr: '+۴۲٪' },
      { metricEn: 'Expired stock waste', metricUr: 'ایکسپائرڈ نقصان', valueEn: '-65%', valueUr: '-۶۵٪' },
      { metricEn: 'Missed cake orders', metricUr: 'چھوٹے آرڈرز', valueEn: 'Zero', valueUr: 'صفر' },
      { metricEn: 'Daily admin time', metricUr: 'روزانہ وقت', valueEn: '4h → 30min', valueUr: '۴ گھنٹے سے ۳۰ منٹ' },
    ],
    quoteEn: 'Nafaa didn\'t just save me time — it gave me my evenings back with my family. That\'s priceless.',
    quoteUr: 'نفع نے مجھے میری شامیں واپس دلائیں۔',
    duration: '90 days',
  },
  {
    slug: 'zk-pharmacy-karachi',
    businessEn: 'ZK Pharmacy', businessUr: 'زیڈ کے فارمیسی',
    ownerEn: 'Fatima Khan', ownerUr: 'فاطمہ خان',
    city: 'Karachi', cityUr: 'کراچی', industry: 'pharmacy', emoji: '💊',
    gradient: 'from-blue-500 to-cyan-600',
    taglineEn: 'Zero expired stock and full DRAP compliance in 30 days', taglineUr: '۳۰ دن میں صفر ایکسپائرڈ اسٹاک',
    challengeEn: 'Manual batch tracking led to Rs 40,000 monthly expiry losses. DRAP inspections were stressful with paper registers.',
    challengeUr: 'دستی بیچ ٹریکنگ سے ماہانہ ۴۰ ہزار کا نقصان۔',
    solutionEn: 'Implemented batch and expiry tracking with 30/60/90 day alerts, salt-based medicine search, and prescription scanning.',
    solutionUr: 'بیچ اور ایکسپائری ٹریکنگ، سالٹ تلاش، نسخہ اسکیننگ۔',
    results: [
      { metricEn: 'Expired stock', metricUr: 'ایکسپائرڈ اسٹاک', valueEn: 'Zero', valueUr: 'صفر' },
      { metricEn: 'DRAP compliance', metricUr: 'ڈریپ تعمیل', valueEn: '100%', valueUr: '۱۰۰٪' },
      { metricEn: 'Medicine lookup time', metricUr: 'دوا تلاش وقت', valueEn: '2 min → 15 sec', valueUr: '۲ منٹ سے ۱۵ سیکنڈ' },
      { metricEn: 'Monthly profit', metricUr: 'ماہانہ منافع', valueEn: '+35%', valueUr: '+۳۵٪' },
    ],
    quoteEn: 'DRAP inspections used to terrify me. Now I just open Nafaa and everything is right there, audit-ready.',
    quoteUr: 'ڈریپ معائنے اب خوفناک نہیں۔',
    duration: '30 days',
  },
  {
    slug: 'bilal-mobile-3-branches',
    businessEn: 'Bilal Mobile Centre', businessUr: 'بلال موبائل سینٹر',
    ownerEn: 'Muhammad Bilal', ownerUr: 'محمد بلال',
    city: 'Islamabad', cityUr: 'اسلام آباد', industry: 'mobile-shop', emoji: '📱',
    gradient: 'from-violet-500 to-purple-600',
    taglineEn: '3 branches unified into one dashboard — daily management cut from 6 hours to 1',
    taglineUr: '۳ برانچز ایک ڈیش بورڈ میں متحد',
    challengeEn: 'Running 3 branches meant 3 separate inventories, 3 sets of staff, and 6 hours daily just managing instead of selling.',
    challengeUr: '۳ برانچز کا الگ الگ انتظام ۶ گھنٹے روزانہ۔',
    solutionEn: 'Deployed Nafaa Multi-Shop with centralized inventory, IMEI tracking, PTA compliance, and role-based staff access.',
    solutionUr: 'نفع ملٹی شاپ، آئی ایم ای آئی ٹریکنگ، پی ٹی اے تعمیل۔',
    results: [
      { metricEn: 'Branches unified', metricUr: 'برانچز متحد', valueEn: '3 → 1', valueUr: '۳ سے ۱' },
      { metricEn: 'Daily management', metricUr: 'روزانہ انتظام', valueEn: '6h → 1h', valueUr: '۶ گھنٹے سے ۱' },
      { metricEn: 'Lost IMEIs', metricUr: 'کھوئے آئی ایم ای', valueEn: 'Zero', valueUr: 'صفر' },
      { metricEn: 'Repair revenue', metricUr: 'مرمت آمدنی', valueEn: '+45%', valueUr: '+۴۵٪' },
    ],
    quoteEn: 'I used to drive between branches daily. Now I see everything from my phone. Nafaa gave me my life back.',
    quoteUr: 'میں روزانہ برانچز کے درمیان ڈرائیو کرتا تھا۔ اب سب فون پر۔',
    duration: '60 days',
  },
  {
    slug: 'sara-boutique-faisalabad',
    businessEn: 'Sara Boutique', businessUr: 'سارہ بوتیک',
    ownerEn: 'Sara Ahmed', ownerUr: 'سارہ احمد',
    city: 'Faisalabad', cityUr: 'فیصل آباد', industry: 'garments', emoji: '👗',
    gradient: 'from-pink-500 to-rose-600',
    taglineEn: 'From 1 shop to online + offline with 5x faster checkout', taglineUr: 'ایک دکان سے آن لائن + آف لائن',
    challengeEn: 'Size and color chaos, lost customer measurements, and no way to sell online without losing inventory control.',
    challengeUr: 'سائز اور رنگ کا الجھاؤ، کھوئی پیمائشیں۔',
    solutionEn: 'Variant matrix, saved customer measurements, Daraz integration, and Nafaa Bazaar for direct selling.',
    solutionUr: 'تغیر میٹرکس، محفوظ پیمائشیں، دراز انضمام۔',
    results: [
      { metricEn: 'Checkout speed', metricUr: 'چیک آؤٹ رفتار', valueEn: '5x faster', valueUr: '۵ گنا تیز' },
      { metricEn: 'Lost measurements', metricUr: 'کھوئی پیمائشیں', valueEn: 'Zero', valueUr: 'صفر' },
      { metricEn: 'Custom order accuracy', metricUr: 'خصوصی آرڈر درستگی', valueEn: '+58%', valueUr: '+۵۸٪' },
      { metricEn: 'Repeat customers', metricUr: 'دوبارہ گاہک', valueEn: '+40%', valueUr: '+۴۰٪' },
    ],
    quoteEn: 'My customers love that I remember their measurements. Nafaa made me look like a premium brand.',
    quoteUr: 'میرے گاہک پسند کرتے ہیں کہ میں ان کی پیمائشیں یاد رکھتی ہوں۔',
    duration: '45 days',
  },
];

export const getCaseStudy = (slug: string) => caseStudies.find((c) => c.slug === slug);
