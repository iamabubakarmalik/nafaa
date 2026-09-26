/**
 * Dukaan ke waqt ka hisaab — server ke waqt ka nahi.
 *
 * Server Railway par chalta hai, aur wahan ka waqt UTC hota hai.
 * `startOfDay(new Date())` UTC ki raat 12 baje se din shuru karta
 * tha — Pakistan me us waqt subah ke 5 baj rahe hote hain. Nateeja:
 * raat 8 baje ki sale "3 baje" dikhti thi, aur subah 5 baje se pehle
 * ki sari sales "kal" me chali jati thin.
 *
 * Yahan har hisaab dukaan ke apne timezone me hota hai. Koi nayi
 * package nahi — `Intl` har Node me pehle se mojood hai.
 */

/** Pakistan — baaqi codebase (crons, emails) bhi yahi istemal karta hai. */
export const DEFAULT_TZ = process.env.BUSINESS_TZ || 'Asia/Karachi';

interface TzParts {
  year: number; month: number; day: number;
  hour: number; minute: number; second: number;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatterFor(tz: string): Intl.DateTimeFormat {
  let f = formatterCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    formatterCache.set(tz, f);
  }
  return f;
}

/** Diye gaye lamhe ko dukaan ke timezone me tor kar dekhna. */
export function tzParts(date: Date, tz: string = DEFAULT_TZ): TzParts {
  const bag: Record<string, string> = {};
  for (const part of formatterFor(tz).formatToParts(date)) {
    if (part.type !== 'literal') bag[part.type] = part.value;
  }
  return {
    year: Number(bag.year),
    month: Number(bag.month),
    day: Number(bag.day),
    // `hour12: false` kuch Node builds par aadhi raat ko "24" deta hai
    hour: Number(bag.hour) % 24,
    minute: Number(bag.minute),
    second: Number(bag.second),
  };
}

/** Us lamhe par timezone UTC se kitna aage hai (milliseconds). */
function offsetMs(date: Date, tz: string): number {
  const p = tzParts(date, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/**
 * Dukaan ke timezone ka "deewar par laga hua" waqt → asli UTC lamha.
 *
 * Do dafa hisaab: pehla andaza galat ho sakta hai agar us din offset
 * badla ho (DST). Pakistan me DST nahi, magar kal ko koi aur mulk
 * add ho to ye khud sambhal lega.
 */
export function zonedToUtc(
  year: number, month: number, day: number,
  hour = 0, minute = 0, second = 0,
  tz: string = DEFAULT_TZ,
): Date {
  const wall = Date.UTC(year, month - 1, day, hour, minute, second);
  const firstGuess = wall - offsetMs(new Date(wall), tz);
  const corrected = wall - offsetMs(new Date(firstGuess), tz);
  return new Date(corrected);
}

/** Dukaan ke din ki shuruaat (raat 12:00 local) — UTC Date ke tor par. */
export function startOfDayTz(date: Date = new Date(), tz: string = DEFAULT_TZ): Date {
  const p = tzParts(date, tz);
  return zonedToUtc(p.year, p.month, p.day, 0, 0, 0, tz);
}

/** Dukaan ke din ka aakhri lamha (23:59:59.999 local). */
export function endOfDayTz(date: Date = new Date(), tz: string = DEFAULT_TZ): Date {
  return new Date(startOfDayTz(addDaysTz(date, 1, tz), tz).getTime() - 1);
}

/** Mahine ki pehli tareekh, local. */
export function startOfMonthTz(date: Date = new Date(), tz: string = DEFAULT_TZ): Date {
  const p = tzParts(date, tz);
  return zonedToUtc(p.year, p.month, 1, 0, 0, 0, tz);
}

/**
 * Din jorna/ghatana — calendar ke hisaab se, 24 ghante ke hisaab se
 * nahi. Is se DST wale din bhi theek rehte hain.
 */
export function addDaysTz(date: Date, days: number, tz: string = DEFAULT_TZ): Date {
  const p = tzParts(date, tz);
  return zonedToUtc(p.year, p.month, p.day + days, p.hour, p.minute, p.second, tz);
}

export function subDaysTz(date: Date, days: number, tz: string = DEFAULT_TZ): Date {
  return addDaysTz(date, -days, tz);
}

export function subMonthsTz(date: Date, months: number, tz: string = DEFAULT_TZ): Date {
  const p = tzParts(date, tz);
  return zonedToUtc(p.year, p.month - months, p.day, p.hour, p.minute, p.second, tz);
}

/** Dukaan ke waqt ke hisaab se ghanta (0–23). Chart ka X-axis isi par. */
export function hourInTz(date: Date, tz: string = DEFAULT_TZ): number {
  return tzParts(date, tz).hour;
}

/** Hafte ka din — 0 = Itwaar. */
export function weekdayInTz(date: Date, tz: string = DEFAULT_TZ): number {
  const p = tzParts(date, tz);
  return new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
}

/** `yyyy-MM-dd` dukaan ke timezone me — trend buckets ki chaabi. */
export function dateKeyTz(date: Date, tz: string = DEFAULT_TZ): string {
  const p = tzParts(date, tz);
  const mm = String(p.month).padStart(2, '0');
  const dd = String(p.day).padStart(2, '0');
  return `${p.year}-${mm}-${dd}`;
}
