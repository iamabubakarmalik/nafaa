/** Date and text helpers shared by the S5 templates. Dates show in Asia/Karachi (the server runs in UTC). */

const DATE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Karachi' });
const MONTH = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'Asia/Karachi' });
/** Urdu month names with Western digits ("26 اکتوبر، 2026"). */
const DATE_UR = new Intl.DateTimeFormat('ur-PK', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Karachi', numberingSystem: 'latn' });

function toDate(value: string): Date | null {
  // A bare YYYY-MM-DD is a calendar date; read it at Karachi noon so it never shifts a day.
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00+05:00` : value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "18 Oct 2026" (Urdu month names for `ur`). Empty for a missing or invalid date. */
export function formatDate(value: string | null | undefined, locale?: string): string {
  const date = value ? toDate(value) : null;
  return date ? (locale === 'ur' ? DATE_UR : DATE).format(date) : '';
}

/** "October 2026", for grouping. */
export function formatMonth(value: string | null | undefined): string {
  const date = value ? toDate(value) : null;
  return date ? MONTH.format(date) : '';
}

/** ISO string for <time dateTime>. */
export function isoDate(value: string | null | undefined): string | undefined {
  const date = value ? toDate(value) : null;
  return date ? date.toISOString() : undefined;
}

/** Initials for an avatar placeholder: "Sample Author" → "SA". */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/** First letter used to file a glossary term (digits and symbols go under "#"). */
export function indexLetter(term: string): string {
  const first = term.trim().charAt(0).toUpperCase();
  return /[A-Z]/.test(first) ? first : '#';
}

/** Urdu alphabet for the glossary letter bar on /ur. */
export const URDU_LETTERS = 'ا ب پ ت ٹ ث ج چ ح خ د ڈ ذ ر ڑ ز ژ س ش ص ض ط ظ ع غ ف ق ک گ ل م ن و ہ ی ے'.split(' ');

/** Letters of the glossary index for a locale ("#" files anything else). */
export function glossaryLetters(locale: string): string[] {
  return locale === 'ur' ? [...URDU_LETTERS, '#'] : ['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];
}

/** The index letter of a term in a locale: Urdu terms by their first Urdu letter (آ files under ا). */
export function localeIndexLetter(term: string, locale: string): string {
  if (locale !== 'ur') return indexLetter(term);
  const first = term.trim().charAt(0).replace('آ', 'ا').replace('ھ', 'ہ').replace('ك', 'ک').replace('ي', 'ی');
  return URDU_LETTERS.includes(first) ? first : '#';
}

/** Anchor id of a glossary letter: "letter-a", "letter-other", and "letter-u<n>" for Urdu letters. */
export function letterAnchor(letter: string): string {
  if (letter === '#') return 'letter-other';
  const urdu = URDU_LETTERS.indexOf(letter);
  return urdu >= 0 ? `letter-u${urdu + 1}` : `letter-${letter.toLowerCase()}`;
}

/** Lower-case text used by the list filter island. */
export function filterText(...parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ').toLowerCase();
}
