export interface CaseStudy {
  industrySlug: string;
  businessNameEn: string;
  businessNameUr: string;
  city: string;
  cityUr: string;
  ownerEn: string;
  ownerUr: string;
  founded: string;
  shopCount: number;
  yearsWithNafaa: number;

  challenge: { en: string; ur: string };
  solution: { en: string; ur: string };

  beforeMetrics: Array<{ labelEn: string; labelUr: string; value: string }>;
  afterMetrics: Array<{ labelEn: string; labelUr: string; value: string }>;

  quote: { en: string; ur: string };
  headline: { en: string; ur: string };

  timeline: Array<{ month: string; monthUr: string; event: { en: string; ur: string }; impact: string }>;
}

export const caseStudies: CaseStudy[] = [
  {
    industrySlug: 'kiryana',
    businessNameEn: 'Malik General Store',
    businessNameUr: 'ملک جنرل اسٹور',
    city: 'Faisalabad',
    cityUr: 'فیصل آباد',
    ownerEn: 'Malik Tanveer Ahmed',
    ownerUr: 'ملک تنویر احمد',
    founded: '2008',
    shopCount: 3,
    yearsWithNafaa: 2,
    challenge: {
      en: 'Running three kiryana shops with paper khata across Faisalabad meant Malik Sahib was losing PKR 80,000+ monthly to forgotten udhar, expired stock, and lost receipts. His son Ahmed had to physically visit each shop daily.',
      ur: 'فیصل آباد میں تین کریانہ دکانیں کاغذی کھاتے پر چلانے کا مطلب تھا ماہانہ 80,000+ روپے کا نقصان — بھولے ہوئے ادھار، ختم شدہ اسٹاک، اور گمشدہ رسیدیں۔ ان کے بیٹے احمد کو روزانہ ہر دکان جانا پڑتا تھا۔',
    },
    solution: {
      en: 'Deployed Nafaa on 3 tablets with WhatsApp-based digital khata. Every udhar entry now sends automatic WhatsApp reminders. Multi-shop dashboard lets Ahmed monitor all 3 shops from his phone.',
      ur: 'تین ٹیبلٹس پر نفع اور WhatsApp ڈیجیٹل کھاتہ لگایا۔ ہر ادھار انٹری خودکار WhatsApp یاد دہانی بھیجتی ہے۔ ملٹی-شاپ ڈیش بورڈ سے احمد فون سے تینوں دکانیں مانیٹر کرتا ہے۔',
    },
    beforeMetrics: [
      { labelEn: 'Monthly udhar loss', labelUr: 'ماہانہ ادھار نقصان', value: '₨ 80K' },
      { labelEn: 'Inventory count time', labelUr: 'اسٹاک گنتی', value: '2 days' },
      { labelEn: 'Daily reconciliation', labelUr: 'روزانہ ملان', value: '3 hrs' },
      { labelEn: 'Shops visited/day', labelUr: 'روزانہ دکانیں', value: '3' },
    ],
    afterMetrics: [
      { labelEn: 'Monthly udhar loss', labelUr: 'ماہانہ ادھار نقصان', value: '₨ 8K' },
      { labelEn: 'Inventory count time', labelUr: 'اسٹاک گنتی', value: '20 min' },
      { labelEn: 'Daily reconciliation', labelUr: 'روزانہ ملان', value: '5 min' },
      { labelEn: 'Shops visited/day', labelUr: 'روزانہ دکانیں', value: '0' },
    ],
    quote: {
      en: '"Meri zindagi asaan ho gayi. Pehle ratein soch soch ke guzarti thi ke kis ne kitna udhar liya. Ab har cheez phone mein."',
      ur: '"میری زندگی آسان ہو گئی۔ پہلے راتیں سوچ سوچ کے گزرتی تھیں کہ کس نے کتنا ادھار لیا۔ اب ہر چیز فون میں۔"',
    },
    headline: {
      en: 'Recovered PKR 72K/month in udhar. Manages 3 shops from his phone.',
      ur: 'ادھار میں ماہانہ 72 ہزار روپے کی وصولی۔ تین دکانیں فون سے۔',
    },
    timeline: [
      { month: 'Day 1', monthUr: 'پہلا دن', event: { en: 'Onboarded, POS live on all 3 shops', ur: 'تینوں دکانوں پر پی او ایس فعال' }, impact: '3 shops digital' },
      { month: 'Week 2', monthUr: 'دو ہفتے', event: { en: 'First WhatsApp reminder batch sent', ur: 'پہلی WhatsApp یاد دہانی' }, impact: '₨ 42K recovered' },
      { month: 'Month 3', monthUr: 'تیسرا مہینہ', event: { en: 'Multi-shop sync + inventory alerts', ur: 'ملٹی-شاپ سنک اور انتباہ' }, impact: '90% less waste' },
      { month: 'Year 1', monthUr: 'پہلا سال', event: { en: 'Opened 4th shop with confidence', ur: 'چوتھی دکان کھولی' }, impact: '₨ 8.6L saved' },
    ],
  },

  {
    industrySlug: 'jewelry',
    businessNameEn: 'Zeenat Jewellers',
    businessNameUr: 'زینت جیولرز',
    city: 'Karachi',
    cityUr: 'کراچی',
    ownerEn: 'Nazia Zeenat',
    ownerUr: 'نازیہ زینت',
    founded: '2015',
    shopCount: 2,
    yearsWithNafaa: 3,
    challenge: {
      en: 'Bridal jewelry pricing was manual chaos — daily rate lookups, calculator for making charges, GST math errors on 30% of invoices. FBR audit in 2023 flagged inconsistencies.',
      ur: 'دلہن زیورات کی قیمتیں ہاتھ سے — روزانہ ریٹ دیکھنا، کیلکولیٹر پر مزدوری، 30% بلوں میں جی ایس ٹی کی غلطیاں۔ 2023 میں ایف بی آر آڈٹ میں مسائل۔',
    },
    solution: {
      en: 'Live gold rate integration via Nafaa API. Every invoice auto-calculates 24k/22k/21k value + making charges + GST. FBR e-invoicing integrated directly.',
      ur: 'براہ راست سونے کی شرح API۔ ہر بل خودکار حساب — کیریٹ، مزدوری، جی ایس ٹی۔ ایف بی آر ای-انوائسنگ شامل۔',
    },
    beforeMetrics: [
      { labelEn: 'Invoice errors', labelUr: 'بل کی غلطیاں', value: '30%' },
      { labelEn: 'Time per invoice', labelUr: 'بل کا وقت', value: '12 min' },
      { labelEn: 'FBR compliance', labelUr: 'ایف بی آر تعمیل', value: '60%' },
      { labelEn: 'Monthly revenue', labelUr: 'ماہانہ آمدنی', value: '₨ 42L' },
    ],
    afterMetrics: [
      { labelEn: 'Invoice errors', labelUr: 'بل کی غلطیاں', value: '0%' },
      { labelEn: 'Time per invoice', labelUr: 'بل کا وقت', value: '90 sec' },
      { labelEn: 'FBR compliance', labelUr: 'ایف بی آر تعمیل', value: '100%' },
      { labelEn: 'Monthly revenue', labelUr: 'ماہانہ آمدنی', value: '₨ 68L' },
    ],
    quote: {
      en: '"Rate changes har ghante — Nafaa auto pick karta hai. Customer trust bhi barha kyunke wo dekhtay hain ke rate live hai."',
      ur: '"ریٹ ہر گھنٹے بدلتا ہے — نفع خودکار پک کرتا ہے۔ گاہکوں کا اعتماد بڑھا کہ ریٹ لائیو ہے۔"',
    },
    headline: {
      en: 'Zero invoice errors. 62% revenue growth in 2 years. Full FBR compliance.',
      ur: 'صفر بل کی غلطیاں۔ دو سال میں 62% آمدنی۔ مکمل ایف بی آر تعمیل۔',
    },
    timeline: [
      { month: 'Week 1', monthUr: 'پہلا ہفتہ', event: { en: 'Gold rate API + POS live', ur: 'گولڈ ریٹ API اور پی او ایس' }, impact: 'Instant pricing' },
      { month: 'Month 2', monthUr: 'دوسرا مہینہ', event: { en: 'FBR integration complete', ur: 'ایف بی آر تعمیل مکمل' }, impact: '100% compliant' },
      { month: 'Year 1', monthUr: 'پہلا سال', event: { en: 'Bridal package builder launched', ur: 'دلہن پیکج فیچر' }, impact: '+35% revenue' },
      { month: 'Year 2', monthUr: 'دوسرا سال', event: { en: '2nd shop opened in DHA', ur: 'ڈی ایچ اے میں دوسری دکان' }, impact: '2 locations' },
    ],
  },

  {
    industrySlug: 'pharmacy',
    businessNameEn: 'City Care Pharmacy',
    businessNameUr: 'سٹی کیئر فارمیسی',
    city: 'Lahore',
    cityUr: 'لاہور',
    ownerEn: 'Dr. Faisal Rehman',
    ownerUr: 'ڈاکٹر فیصل رحمان',
    founded: '2011',
    shopCount: 4,
    yearsWithNafaa: 2,
    challenge: {
      en: 'Managing 8,000+ SKUs across 4 branches with batch/expiry tracking on paper meant PKR 350K/month in expired medicine losses. DRAP audits were nightmare-inducing.',
      ur: '8,000+ ادویات، 4 برانچز، کاغذی بیچ ٹریکنگ = ماہانہ 3.5 لاکھ کا نقصان۔ ڈریپ آڈٹ ڈراؤنے۔',
    },
    solution: {
      en: 'Every medicine batch scanned at intake. Auto-alerts 60/30/7 days before expiry. DRAP reports generated in one click. Prescription upload with OCR.',
      ur: 'ہر بیچ اسکین۔ خودکار انتباہ 60/30/7 دن پہلے۔ ایک کلک ڈریپ رپورٹ۔ نسخہ اپلوڈ + OCR۔',
    },
    beforeMetrics: [
      { labelEn: 'Expired stock loss', labelUr: 'ختم شدہ اسٹاک', value: '₨ 350K' },
      { labelEn: 'DRAP audit time', labelUr: 'ڈریپ آڈٹ وقت', value: '2 weeks' },
      { labelEn: 'Prescription lookup', labelUr: 'نسخہ تلاش', value: '10 min' },
      { labelEn: 'Stock accuracy', labelUr: 'اسٹاک درستگی', value: '78%' },
    ],
    afterMetrics: [
      { labelEn: 'Expired stock loss', labelUr: 'ختم شدہ اسٹاک', value: '₨ 12K' },
      { labelEn: 'DRAP audit time', labelUr: 'ڈریپ آڈٹ وقت', value: '2 hours' },
      { labelEn: 'Prescription lookup', labelUr: 'نسخہ تلاش', value: '5 sec' },
      { labelEn: 'Stock accuracy', labelUr: 'اسٹاک درستگی', value: '99.7%' },
    ],
    quote: {
      en: '"DRAP inspector aya, humne 2 ghante mein saara data show kar diya. Pehle 2 hafte lagtay thay. Sar mein dard nahi hota ab."',
      ur: '"ڈریپ انسپکٹر آیا، 2 گھنٹے میں سارا ڈیٹا۔ پہلے دو ہفتے لگتے تھے۔ اب سر میں درد نہیں۔"',
    },
    headline: {
      en: 'Cut expired stock loss by 96%. DRAP audits from 2 weeks → 2 hours.',
      ur: '96% کم نقصان۔ ڈریپ آڈٹ دو ہفتے سے دو گھنٹے۔',
    },
    timeline: [
      { month: 'Month 1', monthUr: 'پہلا مہینہ', event: { en: 'Batch scanning across 4 branches', ur: 'چاروں برانچز پر بیچ اسکیننگ' }, impact: '8K SKUs digital' },
      { month: 'Month 3', monthUr: 'تیسرا مہینہ', event: { en: 'First DRAP audit — passed clean', ur: 'پہلا ڈریپ آڈٹ کامیاب' }, impact: '100% compliant' },
      { month: 'Month 6', monthUr: 'چھٹا مہینہ', event: { en: 'Expiry loss down 90%', ur: '90% کم نقصان' }, impact: '₨ 2.1M saved' },
      { month: 'Year 2', monthUr: 'دوسرا سال', event: { en: 'Opened 5th branch in Gulberg', ur: 'گلبرگ میں 5ویں برانچ' }, impact: '5 locations' },
    ],
  },
];

export function getCaseStudyForIndustry(slug: string): CaseStudy | null {
  return caseStudies.find((c) => c.industrySlug === slug) ?? null;
}
