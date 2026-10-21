// Ad copy (primary text, headlines, descriptions, targeting) per industry.
// Used by preview.cjs for the preview page and kept in step with ADS-GUIDE.md.

const COMMON = {
  cta: 'Send WhatsApp message',
  ctaWeb: 'Sign up',
};

const COPY = {
  kiryana: {
    ru: 'Udhaar register me, hisaab dimagh me? Nafaa se bill banayein, stock dekhein aur har customer ka khata phone pe rakhein. Internet na ho tab bhi chalta hai. 7 din free trial, phir Rs 1,500/mahina se. WhatsApp karein, setup hum karwa denge.',
    en: 'Still keeping udhaar in a register? Nafaa gives your kiryana store fast billing, stock alerts and a digital khata on your phone, even without internet. Free for 7 days, then plans from Rs 1,500 a month. Message us on WhatsApp and we will set it up with you.',
    ur: 'ادھار رجسٹر میں اور حساب ذہن میں؟ نفع سے بل بنائیں، اسٹاک دیکھیں اور ہر گاہک کا کھاتہ فون پر رکھیں۔ انٹرنیٹ نہ ہو تب بھی چلتا ہے۔ 7 دن فری ٹرائل، پھر 1,500 روپے ماہانہ سے۔ واٹس ایپ کریں، سیٹ اپ ہم کروا دیں گے۔',
    headlines: ['Kiryana ka hisaab, ab phone pe', 'Bill, stock aur khata ek app me', '7 din free trial, card nahi chahiye', 'کریانہ کا حساب، اب فون پر'],
    descriptions: ['Rs 1,500/mahina se', 'Internet ke baghair bhi', 'Setup me madad free'],
    interests: 'Grocery store, Supermarket, Convenience store, Retail, Wholesale, FMCG, Small business owners, Business page admins',
    age: '22-55',
  },
  garments: {
    ru: 'Har size, har rang ka stock alag. Nafaa se garments ka bill banayein, kaunsa suit kitna bacha hai foran dekhein, aur exchange pe purana bill ek second me nikalein. 7 din free trial, phir Rs 1,500/mahina se. WhatsApp karein.',
    en: 'Know exactly which size and colour is left. Nafaa gives your clothing shop fast billing, stock by size and colour, and easy exchanges with the old bill one tap away. Free for 7 days, then from Rs 1,500 a month. Message us on WhatsApp.',
    ur: 'ہر سائز اور ہر رنگ کا اسٹاک الگ۔ نفع سے بل بنائیں، کون سا سوٹ کتنا بچا ہے فوراً دیکھیں، اور ایکسچینج پر پرانا بل ایک سیکنڈ میں نکالیں۔ 7 دن فری ٹرائل۔ واٹس ایپ کریں۔',
    headlines: ['Har size, har rang ka hisaab', 'Garments shop ka pura hisaab', '7 din free trial, aaj shuru karein'],
    descriptions: ['Rs 1,500/mahina se', 'Size aur rang ka stock', 'Setup me madad free'],
    interests: 'Clothing, Fashion, Boutique, Fashion design, Textile industry, Tailor, Retail, Small business owners',
    age: '22-50',
  },
  salon: {
    ru: 'Appointment diary me, commission calculator pe? Nafaa me aaj ki bookings, har stylist ka kaam aur commission, aur services ka bill, sab ek jagah. 7 din free trial, phir Rs 1,500/mahina se. WhatsApp karein.',
    en: "Bookings in a diary and commission on a calculator? Nafaa keeps today's appointments, each stylist's work and commission, and every service bill in one place. Free for 7 days, then from Rs 1,500 a month. Message us on WhatsApp.",
    ur: 'اپوائنٹمنٹ ڈائری میں اور کمیشن کیلکولیٹر پر؟ نفع میں آج کی بکنگز، ہر اسٹائلسٹ کا کام اور کمیشن، اور سروسز کا بل، سب ایک جگہ۔ 7 دن فری ٹرائل۔ واٹس ایپ کریں۔',
    headlines: ['Salon ki bookings aur hisaab, asaan', 'Appointments, staff aur Sale ek jagah', '7 din free trial, aaj shuru karein'],
    descriptions: ['Rs 1,500/mahina se', 'Staff commission khud', 'Setup me madad free'],
    interests: 'Beauty salon, Hairdresser, Hair salon, Cosmetology, Bridal makeup, Spa, Nail salon, Barber, Small business owners',
    age: '22-45',
  },
  restaurant: {
    ru: 'Order kitchen tak ghalat, table ka bill late? Nafaa me har table ka live bill, kitchen ko seedha KOT, aur din ke end pe pura cash hisaab. 7 din free trial, phir Rs 1,500/mahina se. WhatsApp karein.',
    en: "Wrong orders in the kitchen and slow table bills? Nafaa gives every table a live bill, sends orders straight to the kitchen as KOT, and closes the day's cash in minutes. Free for 7 days, then from Rs 1,500 a month. Message us on WhatsApp.",
    ur: 'کچن تک غلط آرڈر اور ٹیبل کا بل لیٹ؟ نفع میں ہر ٹیبل کا لائیو بل، کچن کو سیدھا KOT، اور دن کے آخر میں پورا کیش حساب۔ 7 دن فری ٹرائل۔ واٹس ایپ کریں۔',
    headlines: ['Order se bill tak, sab tez', 'Tables, KOT aur bill ek app me', '7 din free trial, aaj shuru karein'],
    descriptions: ['Rs 1,500/mahina se', 'Dine-in, takeaway, delivery', 'Setup me madad free'],
    interests: 'Restaurant, Restaurant management, Food industry, Fast food restaurant, Cafe, Catering, Food truck, Small business owners',
    age: '24-55',
  },
  pharmacy: {
    ru: 'Expiry wali dawai shelf pe reh gayi? Nafaa har batch ki expiry yaad rakhta hai, kam stock pe alert deta hai aur bill foran banata hai. 7 din free trial, phir Rs 1,500/mahina se. WhatsApp karein.',
    en: 'Expired stock still on the shelf? Nafaa tracks every batch and its expiry, warns you before stock runs out, and makes the bill in seconds. Free for 7 days, then from Rs 1,500 a month. Message us on WhatsApp.',
    ur: 'ایکسپائری والی دوا شیلف پر رہ گئی؟ نفع ہر بیچ کی ایکسپائری یاد رکھتا ہے، کم اسٹاک پر الرٹ دیتا ہے اور بل فوراً بناتا ہے۔ 7 دن فری ٹرائل۔ واٹس ایپ کریں۔',
    headlines: ['Expiry se pehle alert, har dawai ka', 'Medical store ka pura hisaab', '7 din free trial, aaj shuru karein'],
    descriptions: ['Rs 1,500/mahina se', 'Batch aur expiry record', 'Setup me madad free'],
    interests: 'Pharmacy, Pharmacist, Pharmaceutical industry, Drug store, Medical store, Healthcare, Small business owners',
    age: '25-55',
  },
  bakery: {
    ru: 'Cake ka order register me gum, advance kitna liya yaad nahi? Nafaa me cake orders delivery date ke saath, advance ka record, aur counter ki har sale ka hisaab. 7 din free trial, phir Rs 1,500/mahina se. WhatsApp karein.',
    en: 'Lost a cake order or forgot the advance? Nafaa keeps cake orders with delivery dates and advances, and every counter sale in one place. Free for 7 days, then from Rs 1,500 a month. Message us on WhatsApp.',
    ur: 'کیک کا آرڈر رجسٹر میں گم اور ایڈوانس کتنا لیا یاد نہیں؟ نفع میں کیک آرڈرز ڈیلیوری تاریخ کے ساتھ، ایڈوانس کا ریکارڈ، اور کاؤنٹر کی ہر سیل کا حساب۔ 7 دن فری ٹرائل۔ واٹس ایپ کریں۔',
    headlines: ['Cake orders aur roz ka hisaab', 'Bakery ka pura hisaab, ek app me', '7 din free trial, aaj shuru karein'],
    descriptions: ['Rs 1,500/mahina se', 'Advance aur delivery date', 'Setup me madad free'],
    interests: 'Bakery, Baking, Cake decorating, Pastry, Confectionery, Sweet shop, Dessert, Small business owners',
    age: '24-55',
  },
  mobile: {
    ru: 'Kaunsa set kis ko becha, IMEI copy me dhoondte hain? Nafaa har phone ka IMEI bill ke saath rakhta hai, accessories ka stock alag dikhata hai aur repair ka hisaab bhi. 7 din free trial, phir Rs 1,500/mahina se. WhatsApp karein.',
    en: "Searching a notebook for an IMEI? Nafaa saves every phone's IMEI with its bill, tracks accessories separately and keeps repair jobs in order. Free for 7 days, then from Rs 1,500 a month. Message us on WhatsApp.",
    ur: 'کون سا سیٹ کس کو بیچا، IMEI کاپی میں ڈھونڈتے ہیں؟ نفع ہر فون کا IMEI بل کے ساتھ رکھتا ہے، ایکسیسریز کا اسٹاک الگ دکھاتا ہے اور ریپیئر کا حساب بھی۔ 7 دن فری ٹرائل۔ واٹس ایپ کریں۔',
    headlines: ['Har phone ka IMEI, har bill ka record', 'Mobile shop ka pura hisaab', '7 din free trial, aaj shuru karein'],
    descriptions: ['Rs 1,500/mahina se', 'IMEI, repair, accessories', 'Setup me madad free'],
    interests: 'Mobile phones, Smartphones, Mobile phone accessories, Mobile phone repair, Telecommunications, Electronics retail, Small business owners',
    age: '20-45',
  },
  wholesale: {
    ru: 'Dukandaron ka udhaar laakhon me, recovery yaad se? Nafaa me har party ka khata, carton aur piece ka rate, aur aaj ki recovery, sab saaf. 7 din free trial, phir Rs 1,500/mahina se. WhatsApp karein.',
    en: "Lakhs owed by retailers and recovery tracked from memory? Nafaa keeps a ledger for every party, carton and piece rates, and today's recovery in one place. Free for 7 days, then from Rs 1,500 a month. Message us on WhatsApp.",
    ur: 'دکانداروں کا ادھار لاکھوں میں اور ریکوری یاد سے؟ نفع میں ہر پارٹی کا کھاتہ، کارٹن اور پیس کا ریٹ، اور آج کی ریکوری، سب صاف۔ 7 دن فری ٹرائل۔ واٹس ایپ کریں۔',
    headlines: ['Har party ka khata, saaf', 'Wholesale ka hisaab, ek app me', '7 din free trial, aaj shuru karein'],
    descriptions: ['Rs 1,500/mahina se', 'Party khata aur recovery', 'Setup me madad free'],
    interests: 'Wholesale, Distribution (business), Supply chain, FMCG, Trade, Import/export, Small business owners, Business page admins',
    age: '25-55',
  },
  ecommerce: {
    ru: 'Orders website, WhatsApp aur dukaan me bikhre hue? Nafaa me website ke orders seedha POS me aate hain, stock ek hi rehta hai aur COD ka hisaab saaf. 7 din free trial, phir Rs 1,500/mahina se. WhatsApp karein.',
    en: 'Orders scattered across your website, WhatsApp and the shop? With Nafaa, website orders land straight in your POS, stock stays in one place and every COD payment is tracked. Free for 7 days, then from Rs 1,500 a month. Message us on WhatsApp.',
    ur: 'آرڈرز ویب سائٹ، واٹس ایپ اور دکان میں بکھرے ہوئے؟ نفع میں ویب سائٹ کے آرڈرز سیدھے POS میں آتے ہیں، اسٹاک ایک ہی رہتا ہے اور COD کا حساب صاف۔ 7 دن فری ٹرائل۔ واٹس ایپ کریں۔',
    headlines: ['Har online order, ek jagah', 'Website orders seedha POS me', '7 din free trial, aaj shuru karein'],
    descriptions: ['Rs 1,500/mahina se', 'Website, dukaan, ek stock', 'Setup me madad free'],
    interests: 'Online shopping, E-commerce, Online store, Shopify, WooCommerce, Dropshipping, Instagram shopping, Small business owners',
    age: '20-40',
  },
  general: {
    ru: 'Copy, calculator aur yaad-dasht se hisaab? Nafaa me bill, stock, khata aur roz ki report, sab ek app me, phone pe bhi. Har qisam ke business ke liye. 7 din free trial, phir Rs 1,500/mahina se. WhatsApp karein.',
    en: 'Running your business from a notebook and a calculator? Nafaa puts billing, stock, khata and daily reports in one app, on your phone too. Built for every kind of shop. Free for 7 days, then from Rs 1,500 a month. Message us on WhatsApp.',
    ur: 'کاپی، کیلکولیٹر اور یادداشت سے حساب؟ نفع میں بل، اسٹاک، کھاتہ اور روز کی رپورٹ، سب ایک ایپ میں، فون پر بھی۔ ہر قسم کے کاروبار کے لیے۔ 7 دن فری ٹرائل۔ واٹس ایپ کریں۔',
    headlines: ['Dukaan ka pura hisaab, ek app me', 'Aapka business, aapke phone pe', '7 din free trial, card nahi chahiye', 'دکان کا پورا حساب، ایک ایپ میں'],
    descriptions: ['Rs 1,500/mahina se', 'Internet ke baghair bhi', 'Setup me madad free'],
    interests: 'Small business, Entrepreneurship, Small business owners, Business page admins, Retail, Point of sale',
    age: '22-55',
  },
};

module.exports = { COPY, COMMON };
