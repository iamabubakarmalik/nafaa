/**
 * WhatsApp messages for customers: salutation, khata reminders in three
 * tones (editable, saved on this device), thanks and birthday wishes.
 * Templates keep the storage key of the old khata page, so a shop's own
 * wording carries over.
 */

export type Tone = 'polite' | 'firm' | 'final';
export type Salutation = 'auto' | 'bhai' | 'baji' | 'uncle' | 'aunty' | 'sir' | 'madam' | 'sahib' | 'none';

const TEMPLATE_KEY = 'nafaa.khata.reminder-templates';

const FEMALE_WORDS = ['baji', 'apa', 'aunty', 'madam', 'begum', 'khala', 'phupo', 'mrs', 'ms', 'miss', 'bibi', 'behn'];
const MALE_WORDS = ['bhai', 'chacha', 'mamu', 'uncle', 'sir', 'mr', 'haji', 'sheikh', 'baba'];
const FEMALE_NAMES = new Set([
  'faiza', 'ayesha', 'aisha', 'fatima', 'zainab', 'khadija', 'maryam', 'sana', 'sara', 'hina', 'hira', 'saba', 'nida',
  'sadia', 'rabia', 'sidra', 'saima', 'salma', 'shazia', 'amna', 'asma', 'iqra', 'kiran', 'komal', 'laiba', 'mahira',
  'mahnoor', 'mehak', 'noor', 'rimsha', 'uzma', 'zoya', 'zara', 'nimra', 'areeba', 'kanwal', 'tania', 'urooj',
]);

/** "bhai" / "baji" from the saved gender, else guessed from the name; empty when unsure. */
export function salutationFor(name: string, gender?: string | null, override: Salutation = 'auto'): string {
  if (override === 'none') return '';
  if (override !== 'auto') return override;
  if (gender === 'FEMALE') return 'baji';
  if (gender === 'MALE') return 'bhai';
  const tokens = (name ?? '').toLowerCase().trim().split(/\s+/);
  if (tokens.some((t) => FEMALE_WORDS.includes(t)) || FEMALE_NAMES.has(tokens[0])) return 'baji';
  if (tokens.some((t) => MALE_WORDS.includes(t))) return 'bhai';
  return '';
}

export const DEFAULT_TEMPLATES: Record<Tone, string> = {
  polite: `{greeting} {name}{sal}! 🙏

{shop} ki taraf se yaad-dihani — {aap} ka *{amount}* ka hisaab baqi hai.

Jab moqa mile, ada kar dein. Shukriya! 😊`,
  firm: `{greeting} {name}{sal},

{shop} mein {aap} ka *{amount}* ka hisaab kaafi arsay se pending hai ({days} din).

Baraye meherbani is hafte tak ada kar dein.

Shukriya 🙏`,
  final: `{name}{sal},

⚠️ FINAL REMINDER — {shop}

{aap} ka *{amount}* ka hisaab {days} din se baqi hai. Baraye meherbani foran ada karein.

💳 Payment options:
• Cash
• Bank Transfer
• JazzCash / EasyPaisa

Shukriya.`,
};

export function loadTemplates(): Record<Tone, string> {
  try { const raw = localStorage.getItem(TEMPLATE_KEY); if (raw) return { ...DEFAULT_TEMPLATES, ...JSON.parse(raw) }; } catch { /* storage blocked */ }
  return { ...DEFAULT_TEMPLATES };
}

export function saveTemplates(t: Record<Tone, string>) {
  try { localStorage.setItem(TEMPLATE_KEY, JSON.stringify(t)); } catch { /* storage blocked */ }
}

/** Tone that suits how long the money has been owed. */
export const toneFor = (days: number | null): Tone => ((days ?? 0) >= 30 ? 'final' : (days ?? 0) >= 7 ? 'firm' : 'polite');

export function reminderText(template: string, c: { name: string; gender?: string | null; phone?: string | null; balance: number; dueDays?: number | null }, shop: string, sal: Salutation = 'auto') {
  const s = salutationFor(c.name, c.gender, sal);
  return template
    .replace(/\{greeting\}/g, 'Assalam-o-Alaikum')
    .replace(/\{name\}/g, c.name)
    .replace(/\{sal\}/g, s ? ` ${s}` : '')
    .replace(/\{shop\}/g, shop)
    .replace(/\{amount\}/g, `Rs ${Math.round(c.balance).toLocaleString('en-PK')}`)
    .replace(/\{days\}/g, String(c.dueDays ?? 0))
    .replace(/\{aap\}/g, 'aap')
    .replace(/\{phone\}/g, c.phone ?? '');
}

export function thanksText(c: { name: string; gender?: string | null }, shop: string) {
  const s = salutationFor(c.name, c.gender);
  return `Assalam-o-Alaikum ${c.name}${s ? ` ${s}` : ''}! 🙏\n\n${shop} se khareedari ka shukriya. Aap jaise grahak hamari taqat hain.\n\nDobara tashreef layein! 😊`;
}

export function birthdayText(c: { name: string; gender?: string | null }, shop: string) {
  const s = salutationFor(c.name, c.gender);
  return `🎂 Salgirah mubarak ${c.name}${s ? ` ${s}` : ''}!\n\nAllah aap ko khushiyan aur sehat de. ${shop} ki taraf se dher saari duaein. 🎉`;
}

export const waLink = (phone: string | null | undefined, text: string) => {
  const d = (phone ?? '').replace(/\D/g, '');
  if (!d) return null;
  const num = d.startsWith('92') ? d : d.startsWith('0') ? `92${d.slice(1)}` : `92${d}`;
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
};
