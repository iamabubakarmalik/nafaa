export interface Testimonial {
  id: string;
  nameEn: string;
  nameUr: string;
  roleEn: string;
  roleUr: string;
  businessEn: string;
  businessUr: string;
  city: string;
  cityUr: string;
  industry: string;
  quoteEn: string;
  quoteUr: string;
  rating: number;
  avatar: string;
  metric?: {
    valueEn: string;
    valueUr: string;
    labelEn: string;
    labelUr: string;
  };
  featured?: boolean;
}

export const testimonials: Testimonial[] = [
  {
    id: 't1',
    nameEn: 'Ahmad Raza',
    nameUr: 'احمد رضا',
    roleEn: 'Owner',
    roleUr: 'مالک',
    businessEn: 'Ahmad Sweets & Bakery',
    businessUr: 'احمد سویٹس اینڈ بیکری',
    city: 'Lahore',
    cityUr: 'لاہور',
    industry: 'bakery',
    quoteEn: 'Nafaa completely transformed our bakery. Custom cake orders never get missed, expiry alerts save us thousands weekly, and our daily production planning takes just fifteen minutes now.',
    quoteUr: 'نفع نے ہماری بیکری کو مکمل طور پر بدل دیا۔ خصوصی کیک آرڈرز کبھی نہیں چھوٹتے، ایکسپائری الرٹس ہفتہ وار ہزاروں بچاتے ہیں، اور روزانہ پیداواری منصوبہ بندی اب صرف پندرہ منٹ میں مکمل۔',
    rating: 5,
    avatar: '👨‍🍳',
    metric: { valueEn: '+42%', valueUr: '+۴۲٪', labelEn: 'monthly revenue', labelUr: 'ماہانہ آمدنی' },
    featured: true,
  },
  {
    id: 't2',
    nameEn: 'Fatima Khan',
    nameUr: 'فاطمہ خان',
    roleEn: 'Manager',
    roleUr: 'منتظم',
    businessEn: 'ZK Pharmacy',
    businessUr: 'زیڈ کے فارمیسی',
    city: 'Karachi',
    cityUr: 'کراچی',
    industry: 'pharmacy',
    quoteEn: 'Batch tracking and DRAP compliance are flawless. Prescription scanning saves us hours, and we no longer worry about expired medicines. This platform pays for itself in a week.',
    quoteUr: 'بیچ ٹریکنگ اور ڈریپ تعمیل بے مثال ہیں۔ نسخہ اسکیننگ گھنٹے بچاتی ہے، اور ہم اب ایکسپائر شدہ دوائیوں کی فکر نہیں کرتے۔ یہ پلیٹ فارم ایک ہفتے میں اپنی قیمت پوری کرتا ہے۔',
    rating: 5,
    avatar: '👩‍⚕️',
    metric: { valueEn: 'Zero', valueUr: 'صفر', labelEn: 'expired stock', labelUr: 'ایکسپائرڈ اسٹاک' },
    featured: true,
  },
  {
    id: 't3',
    nameEn: 'Muhammad Bilal',
    nameUr: 'محمد بلال',
    roleEn: 'Owner',
    roleUr: 'مالک',
    businessEn: 'Bilal Mobile Centre',
    businessUr: 'بلال موبائل سینٹر',
    city: 'Islamabad',
    cityUr: 'اسلام آباد',
    industry: 'mobile-shop',
    quoteEn: 'IMEI tracking with PTA compliance is exactly what Pakistani mobile shops need. Managing three branches from one dashboard used to be a nightmare — now it takes an hour a day.',
    quoteUr: 'پی ٹی اے تعمیل کے ساتھ آئی ایم ای آئی ٹریکنگ بالکل وہی ہے جو پاکستانی موبائل شاپس کو چاہیے۔ تین برانچز کا انتظام اب صرف ایک گھنٹے میں۔',
    rating: 5,
    avatar: '👨‍💼',
    metric: { valueEn: '3 branches', valueUr: '۳ برانچز', labelEn: 'unified in one', labelUr: 'ایک ڈیش بورڈ' },
    featured: true,
  },
  {
    id: 't4',
    nameEn: 'Sara Ahmed',
    nameUr: 'سارہ احمد',
    roleEn: 'Founder',
    roleUr: 'بانی',
    businessEn: 'Sara Boutique',
    businessUr: 'سارہ بوتیک',
    city: 'Faisalabad',
    cityUr: 'فیصل آباد',
    industry: 'garments',
    quoteEn: 'Size and color variants, seasonal collections, tailoring orders, and layaway plans — every feature I dreamed of, plus WhatsApp integration my customers love.',
    quoteUr: 'سائز اور رنگ کی اقسام، موسمی کلیکشنز، سلائی آرڈرز اور قسطی منصوبے — ہر خصوصیت جو میں چاہتی تھی۔',
    rating: 5,
    avatar: '👩‍💼',
    metric: { valueEn: '5x', valueUr: '۵ گنا', labelEn: 'faster checkout', labelUr: 'تیز چیک آؤٹ' },
    featured: true,
  },
  {
    id: 't5',
    nameEn: 'Imran Hussain',
    nameUr: 'عمران حسین',
    roleEn: 'Owner',
    roleUr: 'مالک',
    businessEn: 'Imran Kiryana Store',
    businessUr: 'عمران کریانہ اسٹور',
    city: 'Multan',
    cityUr: 'ملتان',
    industry: 'kiryana',
    quoteEn: 'Digital khata replaced my paper register completely. WhatsApp reminders bring udhaar customers back automatically. Recovered rupees eighty thousand in the first month alone.',
    quoteUr: 'ڈجیٹل کھاتہ نے میرا کاغذی رجسٹر مکمل طور پر بدل دیا۔ واٹس ایپ یاد دہانیاں ادھار گاہکوں کو خود بخود واپس لاتی ہیں۔',
    rating: 5,
    avatar: '👨',
    metric: { valueEn: 'Rs 80K', valueUr: '۸۰ ہزار', labelEn: 'udhaar recovered', labelUr: 'ادھار وصولی' },
  },
  {
    id: 't6',
    nameEn: 'Ayesha Tariq',
    nameUr: 'عائشہ طارق',
    roleEn: 'Owner',
    roleUr: 'مالکہ',
    businessEn: 'Ayesha Salon & Spa',
    businessUr: 'عائشہ سیلون اینڈ اسپا',
    city: 'Rawalpindi',
    cityUr: 'راولپنڈی',
    industry: 'salon',
    quoteEn: 'The loyalty points system brings customers back weekly. Online appointment booking cut our phone calls in half. My staff commissions are now automated — no arguments, ever.',
    quoteUr: 'لائلٹی پوائنٹس سسٹم گاہکوں کو ہفتہ وار واپس لاتا ہے۔ آن لائن اپائنٹمنٹ بکنگ نے فون کالز آدھی کر دیں۔',
    rating: 5,
    avatar: '👩',
    metric: { valueEn: '+68%', valueUr: '+۶۸٪', labelEn: 'repeat customers', labelUr: 'دوبارہ آنے والے' },
  },
];

export const featuredTestimonials = testimonials.filter((t) => t.featured);
