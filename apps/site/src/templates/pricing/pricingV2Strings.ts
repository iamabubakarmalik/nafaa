/**
 * Fixed words around the pricing v2 sections (comparison, add-ons, bill
 * calculator, FAQ). Every price, plan, add-on and feature name comes from the
 * catalog; only the surrounding labels live here. Plain data (no functions)
 * so the calculator island can receive it as a prop.
 */

export interface PricingV2Strings {
  compareKicker: string;
  compareHeading: string;
  compareIntro: string;
  caption: string;
  plan: string;
  limits: string;
  users: string;
  shops: string;
  products: string;
  sales: string;
  unlimited: string;
  included: string;
  notIncluded: string;
  free: string;
  groups: Record<string, string>;
  addOnsKicker: string;
  addOnsHeading: string;
  addOnsIntro: string;
  categories: Record<string, string>;
  perMonth: string;
  perUnit: string;
  oneTime: string;
  comingSoon: string;
  bundleSaves: string;
  bundleIncludes: string;
  calcKicker: string;
  calcHeading: string;
  calcIntro: string;
  stepPlan: string;
  stepPeriod: string;
  stepAddOns: string;
  monthly: string;
  quarterly: string;
  yearly: string;
  save: string;
  quantity: string;
  addOnsNeedPaid: string;
  yourBill: string;
  planLine: string;
  includedInBundle: string;
  oneTimeLine: string;
  yearlySetupNote: string;
  freeLabel: string;
  packagesHeading: string;
  packagesYearly: string;
  packagesYearlyPrice: string;
  perMonthTotal: string;
  periodTotal: string;
  oneTimeTotal: string;
  priceNote: string;
  cta: string;
  ctaFree: string;
  faqKicker: string;
  faqHeading: string;
  faq: { q: string; a: string }[];
  /** "{n}" is replaced with a number. */
  days: string;
}

const en: PricingV2Strings = {
  compareKicker: 'Compare plans',
  compareHeading: 'What each plan includes',
  compareIntro: 'Start free, or try every feature for the first days. Move up when your business needs more.',
  caption: 'Plan comparison: limits and features',
  plan: 'Plan',
  limits: 'Limits',
  users: 'Users',
  shops: 'Shops',
  products: 'Products',
  sales: 'Bills per month',
  unlimited: 'Unlimited',
  included: 'Included',
  notIncluded: 'Not included',
  free: 'Free',
  groups: { Core: 'Core', Business: 'Business', Growth: 'Growth', Advanced: 'Advanced' },
  addOnsKicker: 'Add-ons',
  addOnsHeading: 'Add only what you need',
  addOnsIntro: 'Add-ons work on any paid plan. Switch them on or off any time.',
  categories: {
    integrations: 'Online selling',
    sales: 'Sales',
    operations: 'Operations',
    capacity: 'More shops and users',
    services: 'Services',
    other: 'More',
  },
  perMonth: 'Rs {price} / month',
  perUnit: 'Rs {price} / {unit} / month',
  oneTime: 'Rs {price} one time',
  comingSoon: 'Coming soon',
  bundleSaves: 'Save Rs {amount} a month',
  bundleIncludes: 'Includes {list}',
  calcKicker: 'Bill calculator',
  calcHeading: 'Make your own bill',
  calcIntro: 'Pick a plan and the add-ons you want. See the total before you start.',
  stepPlan: '1. Plan',
  stepPeriod: '2. Billing period',
  stepAddOns: '3. Add-ons',
  monthly: 'Monthly',
  quarterly: '3 months',
  yearly: 'Yearly',
  save: 'Save {pct}%',
  quantity: 'Quantity',
  addOnsNeedPaid: 'Add-ons are for paid plans. Choose Basic, Pro or Enterprise.',
  yourBill: 'Your bill',
  planLine: 'Plan',
  includedInBundle: 'in bundle',
  oneTimeLine: 'Ek dafa',
  yearlySetupNote: 'Saal ke plan ke saath setup muft',
  freeLabel: 'Free',
  packagesHeading: 'Setup packages',
  packagesYearly: 'Free with a yearly plan',
  packagesYearlyPrice: 'Rs {price} with a yearly plan',
  perMonthTotal: 'Per month',
  periodTotal: 'Total for the period',
  oneTimeTotal: 'One-time charges',
  priceNote: 'Prices in PKR. Longer periods get the same discount on add-ons as on the plan.',
  cta: 'Try free for {days} days',
  ctaFree: 'Start free',
  faqKicker: 'FAQ',
  faqHeading: 'Plans, trial and add-ons',
  days: '{n} days',
  faq: [
    {
      q: 'What happens after the {days}-day free trial?',
      a: 'During the trial you can use every plan feature and try every add-on. Before it ends, pick a paid plan, or switch to the Free plan if your shop is small enough. Nothing is charged automatically.',
    },
    { q: 'Can I add an add-on later?', a: 'Yes. Add or remove an add-on at any time from your account. A new add-on starts at once and is billed for the rest of your period.' },
    { q: 'Is my data ever deleted?', a: 'No. If your plan ends or you move to a cheaper plan, your products, bills and customers stay safe. You can use them again as soon as you renew.' },
    {
      q: 'What happens when my plan ends?',
      a: 'You get a few days of grace after the end date. After that the app stops until payment is made. Your data stays safe, and everything works again once you pay.',
    },
    {
      q: 'Is there a plan for a very small shop?',
      a: 'Yes. The Free plan covers one shop and one user with the core counter tools, for small shops that only need to bill and track stock. You can upgrade whenever you grow.',
    },
  ],
};

const ur: PricingV2Strings = {
  compareKicker: 'پلانز کا موازنہ',
  compareHeading: 'ہر پلان میں کیا شامل ہے',
  compareIntro: 'مفت شروع کریں، یا شروع کے دنوں میں ہر فیچر آزمائیں۔ کاروبار بڑھے تو اوپر والے پلان پر جائیں۔',
  caption: 'پلانز کا موازنہ: حدود اور فیچرز',
  plan: 'پلان',
  limits: 'حدود',
  users: 'یوزرز',
  shops: 'دکانیں',
  products: 'پروڈکٹس',
  sales: 'ماہانہ بل',
  unlimited: 'لا محدود',
  included: 'شامل',
  notIncluded: 'شامل نہیں',
  free: 'مفت',
  groups: { Core: 'بنیادی', Business: 'بزنس', Growth: 'گروتھ', Advanced: 'ایڈوانسڈ' },
  addOnsKicker: 'ایڈ آنز',
  addOnsHeading: 'صرف وہی لیں جو ضرورت ہو',
  addOnsIntro: 'ایڈ آنز ہر پیڈ پلان پر چلتے ہیں۔ جب چاہیں آن یا آف کریں۔',
  categories: {
    integrations: 'آن لائن سیلنگ',
    sales: 'سیلز',
    operations: 'آپریشنز',
    capacity: 'مزید دکانیں اور یوزرز',
    services: 'سروسز',
    other: 'مزید',
  },
  perMonth: 'Rs {price} / ماہ',
  perUnit: 'Rs {price} / {unit} / ماہ',
  oneTime: 'Rs {price} ایک بار',
  comingSoon: 'جلد آ رہا ہے',
  bundleSaves: 'ماہانہ Rs {amount} کی بچت',
  bundleIncludes: 'شامل: {list}',
  calcKicker: 'بل کیلکولیٹر',
  calcHeading: 'اپنا بل خود بنائیں',
  calcIntro: 'پلان اور ایڈ آنز چنیں۔ شروع کرنے سے پہلے کل رقم دیکھیں۔',
  stepPlan: '1. پلان',
  stepPeriod: '2. بل کی مدت',
  stepAddOns: '3. ایڈ آنز',
  monthly: 'ماہانہ',
  quarterly: '3 ماہ',
  yearly: 'سالانہ',
  save: '{pct}% بچت',
  quantity: 'تعداد',
  addOnsNeedPaid: 'ایڈ آنز پیڈ پلان کے لیے ہیں۔ Basic، Pro یا Enterprise چنیں۔',
  yourBill: 'آپ کا بل',
  planLine: 'پلان',
  includedInBundle: 'بنڈل میں شامل',
  oneTimeLine: 'ایک دفعہ',
  yearlySetupNote: 'سالانہ پلان کے ساتھ سیٹ اپ مفت',
  freeLabel: 'مفت',
  packagesHeading: 'سیٹ اپ پیکجز',
  packagesYearly: 'سالانہ پلان کے ساتھ مفت',
  packagesYearlyPrice: 'سالانہ پلان کے ساتھ Rs {price}',
  perMonthTotal: 'ہر ماہ',
  periodTotal: 'مدت کا کل',
  oneTimeTotal: 'ایک بار کے چارجز',
  priceNote: 'قیمتیں PKR میں ہیں۔ لمبی مدت پر ایڈ آنز کو بھی پلان جتنی رعایت ملتی ہے۔',
  cta: '{days} دن مفت آزمائیں',
  ctaFree: 'مفت شروع کریں',
  faqKicker: 'سوالات',
  faqHeading: 'پلانز، ٹرائل اور ایڈ آنز',
  days: '{n} دن',
  faq: [
    {
      q: '{days} دن کے مفت ٹرائل کے بعد کیا ہوتا ہے؟',
      a: 'ٹرائل میں آپ ہر پلان فیچر اور ہر ایڈ آن آزما سکتے ہیں۔ ختم ہونے سے پہلے پیڈ پلان چنیں، یا دکان چھوٹی ہو تو Free پلان پر جائیں۔ خود بخود کوئی رقم نہیں کٹتی۔',
    },
    { q: 'کیا ایڈ آن بعد میں لگا سکتا ہوں؟', a: 'جی ہاں۔ اکاؤنٹ سے جب چاہیں ایڈ آن لگائیں یا ہٹائیں۔ نیا ایڈ آن فوراً چلتا ہے اور مدت کے باقی دنوں کا بل بنتا ہے۔' },
    { q: 'کیا میرا ڈیٹا کبھی ڈیلیٹ ہوتا ہے؟', a: 'نہیں۔ پلان ختم ہو یا سستے پلان پر جائیں، آپ کی پروڈکٹس، بل اور کسٹمرز محفوظ رہتے ہیں۔ رینیو کرتے ہی دوبارہ چلنے لگتے ہیں۔' },
    { q: 'پلان ختم ہونے پر کیا ہوتا ہے؟', a: 'آخری تاریخ کے بعد کچھ دن کی مہلت ملتی ہے۔ اس کے بعد ادائیگی تک ایپ رک جاتی ہے۔ ڈیٹا محفوظ رہتا ہے اور ادائیگی کے بعد سب کچھ پھر چلنے لگتا ہے۔' },
    { q: 'کیا بہت چھوٹی دکان کے لیے پلان ہے؟', a: 'جی ہاں۔ Free پلان میں ایک دکان اور ایک یوزر کے ساتھ بنیادی کاؤنٹر ٹولز ہیں، ان چھوٹی دکانوں کے لیے جنہیں صرف بل اور اسٹاک چاہیے۔ بڑھنے پر کبھی بھی اپ گریڈ کریں۔' },
  ],
};

export function pricingV2Strings(locale?: string): PricingV2Strings {
  return locale === 'ur' ? ur : en;
}

/** Replaces `{name}` tokens in a template string. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ''));
}

/**
 * Keyword patterns, one per FAQ item above and in the same order. A CMS FAQ
 * whose question matches a pattern already covers that topic, so the item is
 * not added again.
 */
const FAQ_TOPICS = [/trial|ٹرائل/i, /add-?on|ایڈ ?آن/i, /delet|data|ڈیٹا|ڈیلیٹ/i, /(plan|subscription).*(end|expire)|expire|ختم/i, /free plan|small shop|چھوٹی/i];

/** The v2 FAQ items the CMS list does not already cover, shaped like CMS FAQs. */
export function missingFaqs(existing: { question: string }[], locale: string | undefined, trialDays: number) {
  const t = pricingV2Strings(locale);
  return t.faq.flatMap((item, i) =>
    existing.some((f) => FAQ_TOPICS[i]?.test(f.question))
      ? []
      : [{ id: `pricing-v2-${i}`, question: fill(item.q, { days: trialDays }), answer: item.a, topic: null }],
  );
}
