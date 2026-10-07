import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '@modules/organization/settings/api/settings.api';

/* ═════════════════════════════════════════════════════════════
   KAROBARI DIN — browser ki taraf
   ─────────────────────────────────────────────────────────────
   Dhaba raat 2 baje band hota hai. Us ke liye raat 1:30 ki bikri
   "aaj" ki hai. Dashboard ye baat server se seekh chuka hai, magar
   Sales history apna hisab khud lagati hai — is liye wahan din ab
   bhi raat 12 baje badalta tha, aur do safhe do alag jawab dete.

   Ab dono ek hi `businessDayStartHour` par chalte hain. 0 (default)
   par hisab bilkul wohi rehta hai jo pehle tha.
   ═════════════════════════════════════════════════════════════ */

/** 0–23 ke beech rakho — kharab value poora hisab ulat deti hai */
export const safeDayStart = (h?: number | null) => {
  const n = Math.trunc(Number(h ?? 0));
  return Number.isFinite(n) && n >= 0 && n <= 23 ? n : 0;
};

/** Karobari din ki shuruaat */
export function startOfBusinessDay(d: Date, startHour = 0): Date {
  const h = safeDayStart(startHour);
  const x = new Date(d);
  /* Abhi din ka ghanta aane se pehle hai — matlab kal ka din chal raha */
  if (x.getHours() < h) x.setDate(x.getDate() - 1);
  x.setHours(h, 0, 0, 0);
  return x;
}

/** Karobari din ka ikhtitam — agle din ki shuruaat se ek pal pehle */
export function endOfBusinessDay(d: Date, startHour = 0): Date {
  return new Date(startOfBusinessDay(d, startHour).getTime() + 86_400_000 - 1);
}

/** Karobari mahine ki shuruaat — mahina bhi usi ghante par palatta hai */
export function startOfBusinessMonth(d: Date, startHour = 0): Date {
  const day = startOfBusinessDay(d, startHour);
  const x = new Date(day.getFullYear(), day.getMonth(), 1);
  x.setHours(safeDayStart(startHour), 0, 0, 0);
  return x;
}

/**
 * `d.setHours(0,0,0,0)` ki jagah — magar dukaan ke din ke hisab se.
 *
 * Purana code jagah jagah Date ko wahin badal deta hai. In do
 * function ki shakal bhi wohi hai, taake badalna seedha rahe aur
 * koi logic ulat na jaye.
 *
 * DHYAN: ye sirf us jagah lagta hai jahan "din" ka matlab KAROBARI
 * din ho — bikri, hisab, kharcha. Appointment ki tareekh ya maal
 * ki expiry calendar ki tareekh hoti hai, us ko haath nahi lagana.
 */
export function setToDayStart(d: Date, startHour = 0): Date {
  const h = safeDayStart(startHour);
  if (d.getHours() < h) d.setDate(d.getDate() - 1);
  d.setHours(h, 0, 0, 0);
  return d;
}

export function setToDayEnd(d: Date, startHour = 0): Date {
  setToDayStart(d, startHour);
  d.setTime(d.getTime() + 86_400_000 - 1);
  return d;
}

/** "2026-10-07" — kis karobari din me girta hai */
export function businessDayKey(d: Date, startHour = 0): string {
  const x = startOfBusinessDay(d, startHour);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

/**
 * Is dukaan ka karobari din kis ghante shuru hota hai.
 *
 * Settings har safhe par pehle se cache hoti hain, is liye ye
 * alag call nahi banata.
 */
export function useBusinessDayStart(): number {
  const { data } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get(),
    staleTime: 5 * 60_000,
  });
  const h = safeDayStart((data as any)?.settings?.businessDayStartHour);
  /* Yaad rakh lete hain, taake offline wale hisab bhi isi ghante par
     chalein. Wo React ke bahar chalte hain, is liye hook nahi pukar
     sakte — un ke liye `cachedDayStartHour()` hai. */
  if (data) {
    try { localStorage.setItem(CACHE_KEY, String(h)); } catch { /* private window */ }
  }
  return h;
}

const CACHE_KEY = 'nafaa.businessDayStartHour';

/**
 * Dukaan ka ghanta — React ke bahar ke liye.
 *
 * Offline par hisab local data se banta hai aur wahan hook nahi
 * chalta. Aakhri dafa jo maloom tha wohi istemal hota hai; kabhi
 * maloom hi na ho to 0 (raat 12), jo purana hisab hai.
 */
export function cachedDayStartHour(): number {
  try { return safeDayStart(Number(localStorage.getItem(CACHE_KEY))); } catch { return 0; }
}

/** Din ki haddein — sath me wo ghanta jis par din palatta hai */
export function useBusinessDay() {
  const startHour = useBusinessDayStart();
  return {
    startHour,
    dayStart: (d: Date) => startOfBusinessDay(d, startHour),
    dayEnd: (d: Date) => endOfBusinessDay(d, startHour),
    monthStart: (d: Date) => startOfBusinessMonth(d, startHour),
    dayKey: (d: Date) => businessDayKey(d, startHour),
  };
}
