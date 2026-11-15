/**
 * Default texts of the proactive support messages, in English, Urdu script
 * and Roman Urdu. Admins can edit them in Support settings; these fill any
 * field left empty. Variables: {{owner}} {{agent}} {{shop}} {{products}}
 * {{bills}} {{customers}} {{trialEnd}} {{planLink}} {{days}}.
 *
 * Wording rules: plain everyday words, English business terms as people say
 * them, never "insaan" / "human", never "chhoot", no claims or numbers that do
 * not come from the shop's own data.
 */

import type { SupportLocalized, SupportProactiveKey, SupportProactiveMessage } from './support.types';

const L = (en: string, ur: string, roman: string): SupportLocalized => ({ en, ur, roman });

export const PROACTIVE_DEFAULTS: Record<SupportProactiveKey, SupportProactiveMessage> = {
  welcome: {
    enabled: true,
    template: L(
      "Hi {{owner}}! I'm {{agent}} from the Nafaa team. If you have any question or need help with setup, just message here, we reply quickly.",
      'السلام علیکم {{owner}}! میں {{agent}}، نفع ٹیم سے۔ کوئی بھی چیز پوچھنی ہو یا سیٹ اپ میں مدد چاہیے، یہیں میسج کریں، ہم فوراً جواب دیتے ہیں۔',
      'Assalam o Alaikum {{owner}}! Main {{agent}}, Nafaa team se. Koi bhi cheez poochni ho ya setup mein help chahiye, yahin message karein, hum foran reply karte hain.',
    ),
    chips: [
      L('How do I add products?', 'پروڈکٹس کیسے ایڈ کریں؟', 'Products kaise add karein'),
      L('How do I make my first bill?', 'پہلا بل کیسے بنائیں؟', 'Pehla bill kaise banayein'),
      L('How do I set up an online store?', 'آن لائن اسٹور کیسے بنائیں؟', 'Online store kaise banayein'),
      L('Please call me', 'مجھے کال کریں', 'Mujhe call karein'),
    ],
  },
  day1_no_products: {
    enabled: true,
    template: L(
      "Hi {{owner}}, {{agent}} here. To start selling, add your products first:\n1. Open Products and tap \"New product\"\n2. Enter the name, price and stock (scan the barcode if it has one)\n3. Save, it shows up on the POS right away\nIf you like, we can do it together on a screen share.",
      '{{owner}} صاحب، میں {{agent}}۔ سیل شروع کرنے کے لیے پہلے اپنی پروڈکٹس ڈالیں:\n1. Products کھولیں اور "New product" دبائیں\n2. نام، قیمت اور اسٹاک لکھیں (بارکوڈ ہو تو اسکین کریں)\n3. Save کریں، یہ فوراً POS پر آ جائے گی\nچاہیں تو ہم اسکرین شیئر پر ساتھ کر دیتے ہیں۔',
      '{{owner}}, main {{agent}}. Sale shuru karne ke liye pehle apne products daal lein:\n1. Products kholein aur "New product" dabayein\n2. Naam, price aur stock likhein (barcode ho to scan kar lein)\n3. Save karein, product foran POS par aa jayega\nChahein to hum screen share par saath kar dete hain.',
    ),
    chips: [
      L('Yes, help me on a screen share', 'جی، اسکرین شیئر پر مدد کریں', 'Ji, screen share par help karein'),
      L('I will do it myself', 'میں خود کر لوں گا', 'Main khud kar lunga'),
    ],
  },
  first_sale: {
    enabled: true,
    template: L(
      "Congratulations {{owner}} on your first sale in Nafaa! 🎉 One tip: open Reports to see today's sale and profit in one place. Message here any time you need help.",
      'مبارک ہو {{owner}}، نفع میں آپ کی پہلی سیل ہو گئی! 🎉 ایک ٹپ: Reports کھولیں، آج کی سیل اور پرافٹ ایک جگہ نظر آ جائے گا۔ کوئی مدد چاہیے ہو تو یہیں میسج کریں۔',
      'Mubarak ho {{owner}}, Nafaa mein aap ki pehli sale ho gayi! 🎉 Ek tip: Reports kholein, aaj ki sale aur profit ek jagah nazar aa jayega. Koi help chahiye ho to yahin message karein.',
    ),
    chips: [],
  },
  inactive_3d: {
    enabled: true,
    template: L(
      "Hi {{owner}}, {{agent}} from Nafaa here. We haven't seen you for a few days, did anything get in the way? If something isn't working or isn't clear, tell me here and I'll help.",
      '{{owner}} صاحب، میں {{agent}}، نفع سے۔ کچھ دن سے آپ نظر نہیں آئے، کوئی مسئلہ تو نہیں آیا؟ کوئی چیز کام نہیں کر رہی یا سمجھ نہیں آ رہی تو یہیں بتائیں، میں مدد کرتا ہوں۔',
      '{{owner}}, main {{agent}}, Nafaa se. Kuch din se aap nazar nahi aaye, koi issue to nahi aaya? Koi cheez kaam nahi kar rahi ya samajh nahi aa rahi to yahin batayein, main help karta hoon.',
    ),
    chips: [
      L('Yes, I have an issue', 'جی، ایک مسئلہ ہے', 'Ji, ek issue hai'),
      L('All good, just busy', 'سب ٹھیک ہے، بس مصروف تھا', 'Sab theek hai, bas busy tha'),
    ],
  },
  trial_ending: {
    enabled: true,
    template: L(
      "Hi {{owner}}, your Nafaa trial ends in {{days}} days ({{trialEnd}}). So far you have set up {{products}} products, {{bills}} bills and {{customers}} customers, all of it stays safe. To keep going, choose a plan here: {{planLink}}\nIf you'd like help choosing, I can call you.",
      '{{owner}} صاحب، آپ کا نفع ٹرائل {{days}} دن میں ختم ہو رہا ہے ({{trialEnd}})۔ اب تک آپ نے {{products}} پروڈکٹس، {{bills}} بل اور {{customers}} کسٹمرز بنائے ہیں، یہ سب ڈیٹا محفوظ رہے گا۔ کام جاری رکھنے کے لیے یہاں پلان چنیں: {{planLink}}\nپلان چننے میں مدد چاہیے تو میں کال کر لیتا ہوں۔',
      '{{owner}}, aap ka Nafaa trial {{days}} din mein khatam ho raha hai ({{trialEnd}}). Ab tak aap ne {{products}} products, {{bills}} bills aur {{customers}} customers banaye hain, ye sab data safe rahega. Kaam jari rakhne ke liye yahan plan chunein: {{planLink}}\nPlan chunne mein help chahiye to main call kar leta hoon.',
    ),
    chips: [
      L('Please call me', 'مجھے کال کریں', 'Mujhe call karein'),
      L('Which plan suits me?', 'میرے لیے کون سا پلان ٹھیک ہے؟', 'Mere liye kaunsa plan theek hai?'),
    ],
  },
  trial_ended: {
    enabled: true,
    template: L(
      "Hi {{owner}}, your Nafaa trial has ended. Your data ({{products}} products, {{bills}} bills, {{customers}} customers) is safe. When you're ready, pick a plan here: {{planLink}}, and if anything is holding you back, tell me and I'll help.",
      '{{owner}} صاحب، آپ کا نفع ٹرائل ختم ہو گیا ہے۔ آپ کا ڈیٹا ({{products}} پروڈکٹس، {{bills}} بل، {{customers}} کسٹمرز) محفوظ ہے۔ جب چاہیں یہاں پلان چن لیں: {{planLink}}، اور کوئی بات رکاوٹ بن رہی ہو تو بتائیں، میں مدد کرتا ہوں۔',
      '{{owner}}, aap ka Nafaa trial khatam ho gaya hai. Aap ka data ({{products}} products, {{bills}} bills, {{customers}} customers) safe hai. Jab chahein yahan plan chun lein: {{planLink}}, aur koi baat rukawat ban rahi ho to batayein, main help karta hoon.',
    ),
    chips: [
      L('Please call me', 'مجھے کال کریں', 'Mujhe call karein'),
      L('I have a question about price', 'قیمت کے بارے میں سوال ہے', 'Price ke baare mein sawal hai'),
    ],
  },
};

/** Fills {{name}} variables; unknown ones become empty. */
export function fillTemplate(t: string, vars: Record<string, string | number | null | undefined>): string {
  return t.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (vars[k] == null ? '' : String(vars[k]))).replace(/[ \t]{2,}/g, ' ').trim();
}
