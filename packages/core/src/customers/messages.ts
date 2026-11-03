/**
 * Customer-facing WhatsApp texts (khata reminders, thanks, birthday, bill
 * and booking updates). They follow the shop's bill language, not the
 * language of the person using the app: English, Urdu or Roman Urdu.
 */

export type MessageLang = 'en' | 'ur' | 'roman';
export type ReminderTone = 'polite' | 'firm' | 'final';
export type Salutation = 'auto' | 'bhai' | 'baji' | 'uncle' | 'aunty' | 'sir' | 'madam' | 'sahib' | 'none';

const FEMALE_WORDS = ['baji', 'apa', 'aunty', 'madam', 'begum', 'khala', 'phupo', 'mrs', 'ms', 'miss', 'bibi', 'behn'];
const MALE_WORDS = ['bhai', 'chacha', 'mamu', 'uncle', 'sir', 'mr', 'haji', 'sheikh', 'baba'];
const FEMALE_NAMES = new Set([
  'faiza', 'ayesha', 'aisha', 'fatima', 'zainab', 'khadija', 'maryam', 'sana', 'sara', 'hina', 'hira', 'saba', 'nida',
  'sadia', 'rabia', 'sidra', 'saima', 'salma', 'shazia', 'amna', 'asma', 'iqra', 'kiran', 'komal', 'laiba', 'mahira',
  'mahnoor', 'mehak', 'noor', 'rimsha', 'uzma', 'zoya', 'zara', 'nimra', 'areeba', 'kanwal', 'tania', 'urooj',
]);

export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | null | undefined;

/** Guess from a name: 'FEMALE', 'MALE', or null when unsure. */
export function guessGender(name: string): 'MALE' | 'FEMALE' | null {
  const tokens = (name ?? '').toLowerCase().trim().split(/\s+/);
  if (tokens.some((t) => FEMALE_WORDS.includes(t)) || FEMALE_NAMES.has(tokens[0])) return 'FEMALE';
  if (tokens.some((t) => MALE_WORDS.includes(t))) return 'MALE';
  return null;
}

/** "bhai" or "baji" from the saved gender, else guessed from the name; empty when unsure. Only used in Roman Urdu and Urdu texts. */
export function salutationFor(name: string, gender?: Gender, override: Salutation = 'auto'): string {
  if (override === 'none') return '';
  if (override !== 'auto') return override;
  if (gender === 'FEMALE') return 'baji';
  if (gender === 'MALE') return 'bhai';
  const g = guessGender(name);
  return g === 'FEMALE' ? 'baji' : g === 'MALE' ? 'bhai' : '';
}

const URDU_SAL: Record<string, string> = {
  bhai: 'بھائی', baji: 'باجی', uncle: 'انکل', aunty: 'آنٹی', sir: 'سر', madam: 'میڈم', sahib: 'صاحب',
};

/** Tone that suits how long the money has been owed. */
export const toneFor = (days: number | null | undefined): ReminderTone => ((days ?? 0) >= 30 ? 'final' : (days ?? 0) >= 7 ? 'firm' : 'polite');

export interface MessagePerson {
  name: string;
  gender?: Gender;
  phone?: string | null;
}

export interface ReminderInput extends MessagePerson {
  /** Already formatted, for example "Rs 12,500". */
  amount: string;
  dueDays?: number | null;
}

const sal = (lang: MessageLang, p: MessagePerson, override: Salutation) => {
  if (lang === 'en') return '';
  const s = salutationFor(p.name, p.gender, override);
  return s ? ` ${lang === 'ur' ? URDU_SAL[s] ?? s : s}` : '';
};

/** The shop's own wording per tone, with {name} {sal} {shop} {amount} {days} {phone} placeholders. */
export const DEFAULT_REMINDERS: Record<MessageLang, Record<ReminderTone, string>> = {
  roman: {
    polite: `Assalam-o-Alaikum {name}{sal}! 🙏

{shop} ki taraf se yaad-dihani: aap ka *{amount}* ka hisaab baqi hai.

Jab moqa mile, ada kar dein. Shukriya! 😊`,
    firm: `Assalam-o-Alaikum {name}{sal},

{shop} mein aap ka *{amount}* ka hisaab kaafi arsay se pending hai ({days} din).

Baraye meherbani is hafte tak ada kar dein.

Shukriya 🙏`,
    final: `{name}{sal},

⚠️ FINAL REMINDER: {shop}

Aap ka *{amount}* ka hisaab {days} din se baqi hai. Baraye meherbani foran ada karein.

Shukriya.`,
  },
  en: {
    polite: `Hello {name}! 🙏

A friendly reminder from {shop}: you have *{amount}* pending on your account.

Please pay when you can. Thank you! 😊`,
    firm: `Hello {name},

Your account at {shop} has had *{amount}* pending for a while now ({days} days).

Please settle it within this week.

Thank you 🙏`,
    final: `{name},

⚠️ FINAL REMINDER: {shop}

*{amount}* has been pending on your account for {days} days. Please pay it as soon as possible.

Thank you.`,
  },
  ur: {
    polite: `السلام علیکم {name}{sal}! 🙏

{shop} کی طرف سے یاد دہانی: آپ کا *{amount}* کا حساب باقی ہے۔

جب موقع ملے، ادا کر دیں۔ شکریہ! 😊`,
    firm: `السلام علیکم {name}{sal}،

{shop} میں آپ کا *{amount}* کا حساب کافی عرصے سے باقی ہے ({days} دن)۔

براہ مہربانی اسی ہفتے تک ادا کر دیں۔

شکریہ 🙏`,
    final: `{name}{sal}،

⚠️ آخری یاد دہانی: {shop}

آپ کا *{amount}* کا حساب {days} دن سے باقی ہے۔ براہ مہربانی فوراً ادا کریں۔

شکریہ۔`,
  },
};

export function reminderText(
  template: string, c: ReminderInput, shop: string, lang: MessageLang = 'roman', override: Salutation = 'auto',
): string {
  return template
    .replace(/\{name\}/g, c.name)
    .replace(/\{sal\}/g, sal(lang, c, override))
    .replace(/\{shop\}/g, shop)
    .replace(/\{amount\}/g, c.amount)
    .replace(/\{days\}/g, String(c.dueDays ?? 0))
    .replace(/\{phone\}/g, c.phone ?? '');
}

/** The default reminder for the tone that suits the age of the debt. */
export const khataReminder = (c: ReminderInput, shop: string, lang: MessageLang = 'roman', tone: ReminderTone = toneFor(c.dueDays)) =>
  reminderText(DEFAULT_REMINDERS[lang][tone], c, shop, lang);

export function thanksText(c: MessagePerson, shop: string, lang: MessageLang = 'roman'): string {
  const s = sal(lang, c, 'auto');
  if (lang === 'en') return `Hello ${c.name}! 🙏\n\nThank you for shopping at ${shop}. Customers like you are our strength.\n\nPlease visit again! 😊`;
  if (lang === 'ur') return `السلام علیکم ${c.name}${s}! 🙏\n\n${shop} سے خریداری کا شکریہ۔ آپ جیسے گاہک ہماری طاقت ہیں۔\n\nدوبارہ تشریف لائیں! 😊`;
  return `Assalam-o-Alaikum ${c.name}${s}! 🙏\n\n${shop} se khareedari ka shukriya. Aap jaise grahak hamari taqat hain.\n\nDobara tashreef layein! 😊`;
}

export function birthdayText(c: MessagePerson, shop: string, lang: MessageLang = 'roman'): string {
  const s = sal(lang, c, 'auto');
  if (lang === 'en') return `🎂 Happy birthday ${c.name}!\n\nWishing you health and happiness. Warm wishes from ${shop}. 🎉`;
  if (lang === 'ur') return `🎂 سالگرہ مبارک ${c.name}${s}!\n\nاللہ آپ کو خوشیاں اور صحت دے۔ ${shop} کی طرف سے ڈھیر ساری دعائیں۔ 🎉`;
  return `🎂 Salgirah mubarak ${c.name}${s}!\n\nAllah aap ko khushiyan aur sehat de. ${shop} ki taraf se dher saari duaein. 🎉`;
}

export interface StatementLine {
  date: string;
  label: string;
  amount: string;
  balance: string;
}

/** A plain-text khata statement for WhatsApp: totals first, then the latest entries. */
export function statementText(
  input: { name: string; shop: string; balance: string; state: BalanceStateWord; taken: string; paid: string; lines: StatementLine[]; max?: number },
  lang: MessageLang = 'roman',
): string {
  const W = STATEMENT_WORDS[lang];
  const head = `*${W.title}: ${input.name}*\n${input.shop}\n`;
  const state = input.state === 'owes' ? W.owes : input.state === 'advance' ? W.advance : W.clear;
  const totals = `\n${W.taken}: ${input.taken}\n${W.paid}: ${input.paid}\n*${state}: ${input.balance}*\n`;
  const max = input.max ?? 12;
  const lines = input.lines.slice(0, max).map((l) => `• ${l.date}  ${l.label}  ${l.amount}`).join('\n');
  return `${head}${totals}${lines ? `\n${W.latest}\n${lines}\n` : ''}\n${input.state === 'owes' ? W.ask : W.thanks}`;
}

type BalanceStateWord = 'owes' | 'advance' | 'clear';

export const STATEMENT_WORDS: Record<MessageLang, Record<string, string>> = {
  roman: { title: 'Khata', taken: 'Kul udhaar liya', paid: 'Payment di', owes: 'Baqi', advance: 'Advance', clear: 'Hisaab', latest: 'Aakhri entries:', ask: 'Baraye meherbani baqi amount jald ada karein. Shukriya!', thanks: 'Shukriya!' },
  en: { title: 'Statement', taken: 'Total credit taken', paid: 'Paid', owes: 'Balance due', advance: 'Advance', clear: 'Account', latest: 'Latest entries:', ask: 'Please pay the balance soon. Thank you!', thanks: 'Thank you!' },
  ur: { title: 'کھاتہ', taken: 'کل ادھار لیا', paid: 'ادائیگی کی', owes: 'باقی', advance: 'ایڈوانس', clear: 'حساب', latest: 'آخری اندراجات:', ask: 'براہ مہربانی باقی رقم جلد ادا کریں۔ شکریہ!', thanks: 'شکریہ!' },
};

/** Pakistan number to the form wa.me wants (digits only, 92 first), or null. */
export function waNumber(phone: string | null | undefined): string | null {
  const d = (phone ?? '').replace(/\D/g, '');
  if (!d) return null;
  if (d.startsWith('92')) return d;
  if (d.startsWith('0')) return `92${d.slice(1)}`;
  return `92${d}`;
}

export const waLink = (phone: string | null | undefined, text: string): string | null => {
  const n = waNumber(phone);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : null;
};

/** Names of khata entry types on a customer's statement, in the shop's bill language. */
export const LEDGER_WORDS: Record<MessageLang, Record<string, string>> = {
  roman: { SALE_CREDIT: 'Udhaar sale', PAYMENT_RECEIVED: 'Payment aayi', ADJUSTMENT: 'Udhaar / tabdeeli', OPENING_BALANCE: 'Purana khata', REFUND: 'Maal wapas', LOYALTY_REDEEMED: 'Points istemal' },
  en: { SALE_CREDIT: 'Credit sale', PAYMENT_RECEIVED: 'Payment received', ADJUSTMENT: 'Credit / adjustment', OPENING_BALANCE: 'Old balance', REFUND: 'Return', LOYALTY_REDEEMED: 'Points used' },
  ur: { SALE_CREDIT: 'ادھار فروخت', PAYMENT_RECEIVED: 'ادائیگی موصول', ADJUSTMENT: 'ادھار / تبدیلی', OPENING_BALANCE: 'پرانا کھاتہ', REFUND: 'مال واپس', LOYALTY_REDEEMED: 'پوائنٹس استعمال' },
};
