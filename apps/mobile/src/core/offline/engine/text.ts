/**
 * Search text for products and customers, typed in English, Roman Urdu or
 * Urdu script.
 *
 * `fold` makes one comparable form: lower case, Latin accents removed, Urdu
 * diacritics removed and Arabic letter shapes mapped to their Urdu ones
 * (ي → ی, ك → ک, ه/ة → ہ ...), punctuation to spaces.
 *
 * `skeleton` is a looser key for Roman Urdu, where one word is spelled many
 * ways (chawal, chaawal, chawel; gosht, ghosht; doodh, dudh): vowels after
 * the first letter dropped, h after a consonant dropped, w/v and z/j-like
 * pairs merged, doubled letters collapsed. A query matches when its
 * skeleton is inside the name's skeleton.
 */

const URDU_MAP: Record<string, string> = {
  'ي': 'ی', 'ى': 'ی', 'ئ': 'ی', 'ے': 'ی', 'ۓ': 'ی',
  'ك': 'ک', 'ه': 'ہ', 'ة': 'ہ', 'ۀ': 'ہ', 'ھ': 'ہ',
  'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا',
  'ؤ': 'و',
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
};

// Arabic/Urdu diacritics (harakat, superscript alef, tatweel) and Latin combining marks.
const MARKS = new RegExp("[\\u064B-\\u065F\\u0670\\u0640\\u06D6-\\u06ED\\u0300-\\u036F]", "g");
// Anything that is not a Latin letter, digit or Arabic-script letter (explicit ranges: no \p{} in all JS engines).
const PUNCT = /[^a-z0-9\u00C0-\u024F\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]+/g;

export function fold(input: string | null | undefined): string {
  if (!input) return '';
  let s = (typeof input.normalize === 'function' ? input.normalize('NFD') : input).replace(MARKS, '').toLowerCase();
  let out = '';
  for (const ch of s) out += URDU_MAP[ch] ?? ch;
  s = out.replace(PUNCT, ' ').replace(/\s+/g, ' ').trim();
  return s;
}

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u', 'y']);
const MERGE: Record<string, string> = { w: 'v', q: 'k', c: 'k', z: 'j', x: 'k' };

/** Loose Roman Urdu key of one word (Urdu script words pass through folded). */
function skelWord(w: string): string {
  if (!/[a-z]/.test(w)) return w;
  let out = '';
  let prev = '';
  for (let i = 0; i < w.length; i++) {
    let ch = w[i];
    // kh, gh, sh, ch, th, dh, ph inside a word lose the h; a final one keeps it (doodh ~ dudh ~ dh).
    if (ch === 'h' && i > 0 && i < w.length - 1 && !VOWELS.has(w[i - 1])) continue;
    if (i > 0 && VOWELS.has(ch)) continue;
    ch = MERGE[ch] ?? ch;
    if (ch === prev) continue;
    out += ch;
    prev = ch;
  }
  return out;
}

export function skeleton(input: string | null | undefined): string {
  const f = fold(input);
  if (!f) return '';
  return f.split(' ').map(skelWord).filter(Boolean).join(' ');
}

/** Digits only, for phone matching (0300-1234567, +92 300 1234567). */
export function digits(input: string | null | undefined): string {
  if (!input) return '';
  const d = fold(input).replace(/\D+/g, '');
  // Pakistani mobile numbers: +92 3xx → 03xx, so either form matches.
  if (d.startsWith('92') && d.length === 12) return `0${d.slice(2)}`;
  return d;
}

/** Escapes a value for LIKE with ESCAPE '\'. */
export function likeEscape(s: string): string {
  return s.replace(/[\\%_]/g, (m) => `\\${m}`);
}
