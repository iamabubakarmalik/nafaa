/**
 * Words for the product tour (/tour and /ur/tour): the page around the
 * player and one title, body and hotspot label per step. Steps are matched
 * to their screenshots by `id` in templates/tour/steps.ts. Plain data, so
 * the player island can take it as a prop.
 */

export type TourStepId =
  | 'bill'
  | 'scan'
  | 'payment'
  | 'udhaar'
  | 'khata'
  | 'reminder'
  | 'stock'
  | 'reorder'
  | 'day'
  | 'profit'
  | 'phone';

export interface TourStepText {
  title: string;
  body: string;
  /** Short tag on the highlighted part of the screen. */
  label: string;
}

export interface TourStrings {
  metaTitle: string;
  metaDescription: string;
  kicker: string;
  heading: string;
  intro: string;
  /** "{n}" is the number of steps. */
  meta: string;
  carousel: string;
  slide: string;
  /** "{n}" and "{total}". */
  stepOf: string;
  step: string;
  back: string;
  next: string;
  restart: string;
  zoomOut: string;
  zoomIn: string;
  keysHint: string;
  goToStep: string;
  startTrial: string;
  bookDemo: string;
  finishNote: string;
  listHeading: string;
  listIntro: string;
  showStep: string;
  ctaHeading: string;
  ctaBody: string;
  /** "{days}" is the trial length. */
  ctaTrial: string;
  seePricing: string;
  steps: Record<TourStepId, TourStepText>;
}

const en: TourStrings = {
  metaTitle: 'Nafaa Product Tour: See the App Step by Step',
  metaDescription:
    'Click through 11 real Nafaa screens: billing at the counter, payments, udhaar and khata, WhatsApp reminders, stock, day report, profit and the phone app.',
  kicker: 'Product tour',
  heading: 'See Nafaa at work, one screen at a time',
  intro:
    'Real screens from a demo grocery store, in the order a working day runs: from the first bill to the profit at closing time. Use Next and Back, the arrow keys, or swipe on a phone.',
  meta: '{n} steps · about 2 minutes',
  carousel: 'Nafaa product tour',
  slide: 'step',
  stepOf: 'Step {n} of {total}',
  step: 'Step',
  back: 'Back',
  next: 'Next',
  restart: 'Start again',
  zoomOut: 'Full screen view',
  zoomIn: 'Zoom in',
  keysHint: 'Tip: use the ← → keys',
  goToStep: 'Go to step {n}',
  startTrial: 'Start free trial',
  bookDemo: 'Book a demo',
  finishNote: 'That is a day in Nafaa. Try it with your own products.',
  listHeading: 'Every step of the tour',
  listIntro: 'The same steps in short, if you prefer to read.',
  showStep: 'Show this step',
  ctaHeading: 'Try it with your own shop',
  ctaBody: 'Add your products, make your first bill and see your own day report.',
  ctaTrial: 'Free for {days} days, every feature open.',
  seePricing: 'See plans and prices',
  steps: {
    bill: {
      title: 'Make a bill at the counter',
      body: 'Tap a product or search for it. Each item lands on the bill with its price, and the total updates as you go.',
      label: 'The bill',
    },
    scan: {
      title: 'Scan a barcode or type a name',
      body: 'Scan with a barcode scanner or the camera, or type a few letters of the name. Change the quantity with + and − on each line.',
      label: 'Search and scan',
    },
    payment: {
      title: 'Take payment the way the customer pays',
      body: 'Cash, JazzCash, Easypaisa, card or bank. The keypad works out the change, and split payment handles a bill paid two ways.',
      label: 'Payment method',
    },
    udhaar: {
      title: 'Sell on udhaar in one tap',
      body: 'Pick the customer and choose Udhaar. The whole bill goes to their khata, and the receipt prints the old and the new balance.',
      label: 'Udhaar',
    },
    khata: {
      title: 'See who owes you, and since when',
      body: 'The khata shows the total to collect, split by age: under 7 days, 7 to 30, 30 to 90 and over 90 days. Record a payment from the same list.',
      label: 'Total to collect',
    },
    reminder: {
      title: 'Send a polite reminder on WhatsApp',
      body: 'Choose a soft, firm or final tone. Nafaa writes the message with the amount due and opens WhatsApp so you can send it.',
      label: 'WhatsApp message',
    },
    stock: {
      title: 'Know what is running low',
      body: 'Every sale takes stock down. Each product shows its price, cost, margin and how many are left, and low items are flagged at the top.',
      label: 'Low stock',
    },
    reorder: {
      title: 'Reorder before you run out',
      body: 'The low stock list shows how fast each item sells, how many days it will last and how much to order from which supplier.',
      label: 'What to order',
    },
    day: {
      title: 'Close the day with the full picture',
      body: 'The day report shows net sale, money received, profit, the cash that should be in the drawer, discounts, returns and udhaar given.',
      label: 'Day summary',
    },
    profit: {
      title: 'See the real profit on every item',
      body: 'Profit by product lists sale, cost, profit and margin for each item, with gross profit and net profit after expenses.',
      label: 'Gross and net profit',
    },
    phone: {
      title: 'Check your business from your phone',
      body: 'See today’s sale, bills and udhaar given from anywhere. Nafaa has apps for Android and iPhone.',
      label: 'Today’s sale',
    },
  },
};

const ur: TourStrings = {
  metaTitle: 'Nafaa پروڈکٹ ٹور: ایپ قدم بہ قدم دیکھیں',
  metaDescription:
    'Nafaa کی 11 اصل اسکرینیں ایک ایک کر کے دیکھیں: کاؤنٹر پر بل، پیمنٹ، ادھار اور کھاتہ، واٹس ایپ یاد دہانی، اسٹاک، دن کی رپورٹ، پرافٹ اور فون ایپ۔',
  kicker: 'پروڈکٹ ٹور',
  heading: 'Nafaa کو کام کرتے دیکھیں، ایک اسکرین کے بعد دوسری',
  intro:
    'ایک ڈیمو کریانہ اسٹور کی اصل اسکرینیں، اسی ترتیب میں جیسے دن گزرتا ہے: پہلے بل سے دکان بند ہونے کے وقت کے پرافٹ تک۔ آگے اور پیچھے کے بٹن، کی بورڈ کے تیر، یا فون پر سوائپ استعمال کریں۔',
  meta: '{n} قدم · تقریباً 2 منٹ',
  carousel: 'Nafaa پروڈکٹ ٹور',
  slide: 'قدم',
  stepOf: 'قدم {n} از {total}',
  step: 'قدم',
  back: 'پیچھے',
  next: 'آگے',
  restart: 'دوبارہ شروع کریں',
  zoomOut: 'پوری اسکرین دیکھیں',
  zoomIn: 'قریب سے دیکھیں',
  keysHint: 'کی بورڈ کے ← → تیر بھی چلتے ہیں',
  goToStep: 'قدم {n} پر جائیں',
  startTrial: 'مفت ٹرائل شروع کریں',
  bookDemo: 'ڈیمو بک کریں',
  finishNote: 'یہ تھا Nafaa میں ایک دن۔ اب اپنی پروڈکٹس کے ساتھ آزمائیں۔',
  listHeading: 'ٹور کے سارے قدم',
  listIntro: 'یہی قدم مختصر لکھے ہوئے، اگر آپ پڑھنا پسند کریں۔',
  showStep: 'یہ قدم دیکھیں',
  ctaHeading: 'اپنی دکان کے ساتھ آزمائیں',
  ctaBody: 'اپنی پروڈکٹس ڈالیں، پہلا بل بنائیں اور اپنی دن کی رپورٹ دیکھیں۔',
  ctaTrial: '{days} دن مفت، ہر فیچر کھلا۔',
  seePricing: 'پلان اور قیمتیں دیکھیں',
  steps: {
    bill: {
      title: 'کاؤنٹر پر بل بنائیں',
      body: 'پروڈکٹ پر ٹیپ کریں یا اسے ڈھونڈیں۔ ہر چیز اپنی قیمت کے ساتھ بل میں آ جاتی ہے، اور ٹوٹل ساتھ ساتھ بنتا جاتا ہے۔',
      label: 'بل',
    },
    scan: {
      title: 'بارکوڈ اسکین کریں یا نام لکھیں',
      body: 'بارکوڈ اسکینر یا کیمرے سے اسکین کریں، یا نام کے چند حروف لکھیں۔ ہر لائن پر + اور − سے تعداد بدلیں۔',
      label: 'سرچ اور اسکین',
    },
    payment: {
      title: 'گاہک جیسے دے، ویسے پیسے لیں',
      body: 'کیش، JazzCash، Easypaisa، کارڈ یا بینک۔ کی پیڈ بقایا خود نکالتا ہے، اور اسپلٹ پیمنٹ سے ایک بل دو طریقوں سے ادا ہو سکتا ہے۔',
      label: 'پیمنٹ کا طریقہ',
    },
    udhaar: {
      title: 'ایک ٹیپ میں ادھار پر بیچیں',
      body: 'گاہک چنیں اور ادھار دبائیں۔ پورا بل اس کے کھاتے میں چلا جاتا ہے، اور رسید پر پچھلا اور نیا بقایا دونوں چھپتے ہیں۔',
      label: 'ادھار',
    },
    khata: {
      title: 'کس سے کتنا لینا ہے، اور کب سے',
      body: 'کھاتے میں کل لینے والی رقم نظر آتی ہے، پرانے پن کے حساب سے: 7 دن سے کم، 7 سے 30، 30 سے 90 اور 90 دن سے زیادہ۔ اسی لسٹ سے پیمنٹ درج کریں۔',
      label: 'کل لینا ہے',
    },
    reminder: {
      title: 'واٹس ایپ پر نرمی سے یاد دہانی',
      body: 'نرم، سخت یا آخری لہجہ چنیں۔ Nafaa بقایا رقم کے ساتھ میسج لکھ دیتا ہے اور بھیجنے کے لیے واٹس ایپ کھول دیتا ہے۔',
      label: 'واٹس ایپ میسج',
    },
    stock: {
      title: 'پتا رہے کیا ختم ہو رہا ہے',
      body: 'ہر سیل سے اسٹاک خود کم ہوتا ہے۔ ہر پروڈکٹ کی قیمت، کاسٹ، مارجن اور باقی تعداد نظر آتی ہے، اور کم والی چیزیں اوپر الگ دکھتی ہیں۔',
      label: 'کم اسٹاک',
    },
    reorder: {
      title: 'ختم ہونے سے پہلے منگوائیں',
      body: 'کم اسٹاک کی لسٹ بتاتی ہے کہ ہر چیز کتنی تیزی سے بکتی ہے، کتنے دن چلے گی، اور کس سپلائر سے کتنی منگوانی ہے۔',
      label: 'کتنا منگوانا ہے',
    },
    day: {
      title: 'دن پورے حساب کے ساتھ بند کریں',
      body: 'دن کی رپورٹ میں نیٹ سیل، آیا ہوا پیسہ، پرافٹ، گلے میں کتنا ہونا چاہیے، ڈسکاؤنٹ، ریٹرن اور دیا گیا ادھار، سب ایک جگہ ہے۔',
      label: 'دن کا خلاصہ',
    },
    profit: {
      title: 'ہر چیز کا اصل پرافٹ دیکھیں',
      body: 'پرافٹ رپورٹ میں ہر چیز کی سیل، کاسٹ، پرافٹ اور مارجن ہے، اور ساتھ گراس پرافٹ اور خرچوں کے بعد نیٹ پرافٹ۔',
      label: 'گراس اور نیٹ پرافٹ',
    },
    phone: {
      title: 'فون سے اپنا کاروبار دیکھیں',
      body: 'کہیں سے بھی آج کی سیل، بل اور دیا گیا ادھار دیکھیں۔ Nafaa کی ایپ Android اور iPhone دونوں پر ہے۔',
      label: 'آج کی سیل',
    },
  },
};

export function tourStrings(locale: string | undefined): TourStrings {
  return locale === 'ur' ? ur : en;
}
