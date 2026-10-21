// Copy and screen choices for every industry.
//
// Screens are real captures of local demo shops (brand/ads/source/screens/<screens>/).
// Crop rectangles are [x, y, width, height] in the screenshot's own pixels.
// Headline lines are explicit; *word* is drawn in the accent colour.

const INDUSTRIES = [
  {
    key: 'kiryana',
    name: 'Kiryana & retail',
    pill: 'Kiryana Store',
    screens: 'retail',
    a: {
      headline: ['Register chhorein.', '*Hisaab phone pe.*'],
      old: ['Register', 'Parchi', 'Calculator'],
      phone: 'khata-phone',
      call: { img: 'khata-phone', rect: [40, 524, 744, 140] },
    },
    b: {
      headline: ['Aaj kitna bika?', '*Ek nazar me.*'],
      sub: 'Sale, Profit aur udhaar, har waqt phone pe.',
      phone: 'dashboard-phone',
      call: { img: 'dashboard', rect: [576, 896, 408, 328] },
      call2: { img: 'dashboard', rect: [2742, 896, 408, 328] },
    },
    c: {
      headline: ['Bill. Stock. *Khata.*'],
      sub: 'Kiryana store ka pura hisaab, ek app me.',
      items: [
        { title: 'Fori bill', sub: 'Bill print ya WhatsApp karein', img: '_dev/retail-receipt', rect: [16, 700, 440, 214] },
        { title: 'Stock pe nazar', sub: 'Har cheez ka baqi stock saamne', img: 'pos-phone', rect: [0, 900, 824, 400] },
        { title: 'Digital khata', sub: 'Har customer ka udhaar saaf', img: 'khata-phone', rect: [24, 520, 776, 377] },
      ],
    },
    cover: { headline: ['Kiryana ka hisaab,', '*ab phone pe.*'], sub: 'Bill, stock aur khata. 7 din free trial.', phone: 'dashboard-phone' },
    ur: {
      pill: 'کریانہ اسٹور',
      old: ['رجسٹر', 'پرچی', 'کیلکولیٹر'],
      a: ['رجسٹر چھوڑیں،', '*حساب فون پر۔*'],
      b: ['آج کتنا بکا؟', '*ایک نظر میں۔*'],
      bSub: 'سیل، پرافٹ اور ادھار، ہر وقت فون پر۔',
      c: ['بل، اسٹاک اور *کھاتہ*'],
      cSub: 'کریانہ اسٹور کا پورا حساب، ایک ایپ میں۔',
      cItems: [['فوری بل', 'بل پرنٹ یا واٹس ایپ کریں'], ['اسٹاک پر نظر', 'ہر چیز کا باقی اسٹاک سامنے'], ['ڈیجیٹل کھاتہ', 'ہر گاہک کا ادھار صاف']],
    },
    carousel: [
      { kind: 'hook', headline: ['Dukaan ka hisaab', 'abhi bhi *register* me?'], sub: 'Dekhiye Nafaa se ek din kaisa lagta hai.', visuals: [{ type: 'phone', img: 'dashboard-phone', x: 640, y: 470, w: 500, rotate: -5 }] },
      { kind: 'feature', step: '01', eyebrow: 'BILLING', headline: ['Bill, pal bhar me.'], sub: 'Scan karein, bill print ya WhatsApp karein.', visuals: [{ type: 'phone', img: 'pos-phone', x: 580, y: 440, w: 440 }] },
      { kind: 'feature', step: '02', eyebrow: 'KHATA', headline: ['Udhaar ka pura', 'hisaab, saaf.'], sub: 'Kis ne kitna dena hai, ek tap pe.', visuals: [{ type: 'phone', img: 'khata-phone', x: 580, y: 440, w: 440 }] },
      { kind: 'feature', step: '03', eyebrow: 'STOCK', headline: ['Har cheez ka', 'stock saamne.'], sub: 'Kitna bacha hai, ek nazar me.', visuals: [{ type: 'phone', img: 'pos-phone', x: 580, y: 440, w: 440, scrollY: 440 }] },
      { kind: 'cta', headline: ['7 din *free*', 'trial.'], sub: 'Aaj shuru karein. Setup me madad hum karenge.' },
    ],
  },
];

module.exports = { INDUSTRIES };
