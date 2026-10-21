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
    screens: '_dev',
    a: {
      headline: ['Register chhorein.', '*Hisaab phone pe.*'],
      old: ['Register', 'Parchi', 'Calculator'],
      phone: 'retail-khata-phone',
      call: { img: 'retail-khata-phone', rect: [40, 524, 744, 140] },
    },
    b: {
      headline: ['Aaj kitna bika?', '*Ek nazar me.*'],
      sub: 'Sale, Profit aur udhaar, har waqt phone pe.',
      phone: 'retail-dashboard-phone',
      call: { img: 'retail-dashboard', rect: [576, 896, 408, 328] },
      call2: { img: 'retail-dashboard', rect: [2742, 896, 408, 328] },
    },
    c: {
      headline: ['Bill. Stock. *Khata.*'],
      sub: 'Kiryana store ka pura hisaab, ek app me.',
      items: [
        { title: 'Fori bill', sub: 'Bill print ya WhatsApp karein', img: 'retail-receipt', rect: [16, 700, 440, 214] },
        { title: 'Stock alert', sub: 'Khatam hone se pehle pata', img: 'retail-low-stock', rect: [690, 1130, 1000, 486] },
        { title: 'Digital khata', sub: 'Har customer ka udhaar saaf', img: 'retail-khata-phone', rect: [24, 520, 776, 377] },
      ],
    },
    cover: { headline: ['Kiryana ka hisaab,', '*ab phone pe.*'], sub: 'Bill, stock aur khata. 7 din free trial.', phone: 'retail-dashboard-phone' },
    ur: {
      pill: 'کریانہ اسٹور',
      old: ['رجسٹر', 'پرچی', 'کیلکولیٹر'],
      a: ['رجسٹر چھوڑیں،', '*حساب فون پر۔*'],
      b: ['آج کتنا بکا؟', '*ایک نظر میں۔*'],
      bSub: 'سیل، پرافٹ اور ادھار، ہر وقت فون پر۔',
      c: ['بل، اسٹاک اور *کھاتہ*'],
      cSub: 'کریانہ اسٹور کا پورا حساب، ایک ایپ میں۔',
      cItems: [['فوری بل', 'بل پرنٹ یا واٹس ایپ کریں'], ['اسٹاک الرٹ', 'ختم ہونے سے پہلے پتا'], ['ڈیجیٹل کھاتہ', 'ہر گاہک کا ادھار صاف']],
    },
    carousel: [
      { kind: 'hook', headline: ['Dukaan ka hisaab', 'abhi bhi *register* me?'], sub: 'Dekhiye Nafaa se ek din kaisa lagta hai.', visuals: [{ type: 'phone', img: 'retail-dashboard-phone', x: 640, y: 470, w: 500, rotate: -5 }] },
      { kind: 'feature', step: '01', eyebrow: 'BILLING', headline: ['Bill sekondon me.'], sub: 'Scan karein, bill print ya WhatsApp karein.', visuals: [{ type: 'phone', img: 'retail-pos-phone', x: 560, y: 360, w: 460 }] },
      { kind: 'feature', step: '02', eyebrow: 'KHATA', headline: ['Udhaar ka pura', 'hisaab, saaf.'], sub: 'Kis ne kitna dena hai, ek tap pe.', visuals: [{ type: 'phone', img: 'retail-khata-phone', x: 560, y: 360, w: 460 }] },
      { kind: 'feature', step: '03', eyebrow: 'STOCK', headline: ['Khatam hone se', 'pehle alert.'], sub: 'Kam stock ki list khud ban jati hai.', visuals: [{ type: 'laptop', img: 'retail-low-stock', x: 300, y: 560, w: 860 }] },
      { kind: 'cta', headline: ['7 din *free*', 'trial.'], sub: 'Aaj shuru karein. Setup me madad hum karenge.' },
    ],
  },
];

module.exports = { INDUSTRIES };
