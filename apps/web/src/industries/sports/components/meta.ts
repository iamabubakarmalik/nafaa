/** Sports labels, statuses, query keys and small helpers used across the sports pages. */

import { msg, t as tr } from '@core/i18n';
export const META_KEY = 'sports-meta';
export const TEAM_KEY = 'sports-team-orders';
export const REPAIR_KEY = 'sports-repairs';
/** Money pages refreshed after a payment, bill or refund. */
export const MONEY_KEYS = ['sales', 'sales-history', 'dashboard', 'khata', 'customers', 'cash-register', 'day-book'];

export const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
export const opt = (v?: string | null) => (v && v.trim() ? v.trim() : undefined);

export function apiError(e: unknown, fallback = tr('Kuch ghalat ho gaya')) {
  const m = (e as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  return Array.isArray(m) ? String(m[0]) : typeof m === 'string' ? m : fallback;
}

export const dayOnly = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' }) : '—');
export const dayFull = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
/** yyyy-mm-dd in the shop's day, for date inputs. */
export const dateInput = (d?: string | Date | null) => (d ? new Date(d).toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' }) : '');

/** Sport names are stored on products as written here; pages translate them where shown. */
export const SPORTS: string[] = [msg('Cricket'), msg('Football'), msg('Hockey'), msg('Badminton'), msg('Tennis'), msg('Table Tennis'), msg('Squash'), msg('Basketball'), msg('Volleyball'), msg('Gym / Fitness'), msg('Boxing'), msg('Swimming'), msg('Cycling'), msg('Other')];

export const SPORT_TYPES: Array<{ value: string; label: string; sport: string }> = [
  { value: 'CRICKET_BAT', label: tr('Bat'), sport: 'Cricket' }, { value: 'CRICKET_BALL', label: tr('Ball (hard / tape)'), sport: 'Cricket' },
  { value: 'CRICKET_PADS', label: tr('Pads'), sport: 'Cricket' }, { value: 'CRICKET_GLOVES', label: tr('Gloves'), sport: 'Cricket' },
  { value: 'CRICKET_HELMET', label: tr('Helmet'), sport: 'Cricket' }, { value: 'CRICKET_GUARD', label: tr('Guard'), sport: 'Cricket' },
  { value: 'CRICKET_KIT_BAG', label: tr('Kit bag'), sport: 'Cricket' }, { value: 'CRICKET_STUMPS', label: tr('Stumps'), sport: 'Cricket' },
  { value: 'CRICKET_JERSEY', label: tr('Kit / shirt'), sport: 'Cricket' }, { value: 'CRICKET_SHOES', label: tr('Spikes / shoes'), sport: 'Cricket' },
  { value: 'FOOTBALL', label: tr('Football'), sport: 'Football' }, { value: 'FOOTBALL_JERSEY', label: tr('Jersey'), sport: 'Football' },
  { value: 'FOOTBALL_KIT', label: tr('Poori kit'), sport: 'Football' }, { value: 'FOOTBALL_SHOES', label: tr('Studs'), sport: 'Football' },
  { value: 'SHIN_GUARDS', label: tr('Shin guard'), sport: 'Football' }, { value: 'GOALKEEPER_GLOVES', label: tr('Keeper gloves'), sport: 'Football' },
  { value: 'BADMINTON_RACKET', label: tr('Racket'), sport: 'Badminton' }, { value: 'BADMINTON_SHUTTLECOCK', label: tr('Shuttle'), sport: 'Badminton' },
  { value: 'TENNIS_RACKET', label: tr('Racket'), sport: 'Tennis' }, { value: 'TENNIS_BALL', label: tr('Ball'), sport: 'Tennis' },
  { value: 'TABLE_TENNIS_BAT', label: tr('TT bat'), sport: 'Table Tennis' }, { value: 'TABLE_TENNIS_BALL', label: tr('TT ball'), sport: 'Table Tennis' },
  { value: 'SQUASH_RACKET', label: tr('Racket'), sport: 'Squash' },
  { value: 'BASKETBALL', label: tr('Ball'), sport: 'Basketball' }, { value: 'BASKETBALL_JERSEY', label: tr('Jersey'), sport: 'Basketball' },
  { value: 'VOLLEYBALL', label: tr('Ball'), sport: 'Volleyball' }, { value: 'VOLLEYBALL_NET', label: tr('Net'), sport: 'Volleyball' },
  { value: 'DUMBBELL', label: tr('Dumbbell'), sport: 'Gym / Fitness' }, { value: 'WEIGHT_PLATE', label: tr('Plates'), sport: 'Gym / Fitness' },
  { value: 'BARBELL', label: tr('Rod'), sport: 'Gym / Fitness' }, { value: 'TREADMILL', label: tr('Treadmill'), sport: 'Gym / Fitness' },
  { value: 'EXERCISE_BIKE', label: tr('Cycle machine'), sport: 'Gym / Fitness' }, { value: 'YOGA_MAT', label: tr('Mat'), sport: 'Gym / Fitness' },
  { value: 'RESISTANCE_BAND', label: tr('Band'), sport: 'Gym / Fitness' }, { value: 'SKIPPING_ROPE', label: tr('Rassi'), sport: 'Gym / Fitness' },
  { value: 'PROTEIN_SUPPLEMENT', label: tr('Supplement'), sport: 'Gym / Fitness' }, { value: 'GYM_ACCESSORY', label: tr('Gym saman'), sport: 'Gym / Fitness' },
  { value: 'BOXING_GLOVES', label: tr('Gloves'), sport: 'Boxing' }, { value: 'PUNCHING_BAG', label: tr('Punching bag'), sport: 'Boxing' },
  { value: 'SWIMSUIT', label: tr('Costume'), sport: 'Swimming' }, { value: 'SWIMMING_GOGGLES', label: tr('Goggles'), sport: 'Swimming' },
  { value: 'BICYCLE', label: tr('Cycle'), sport: 'Cycling' }, { value: 'CYCLING_HELMET', label: tr('Helmet'), sport: 'Cycling' },
  { value: 'TROPHY', label: tr('Trophy'), sport: 'Other' }, { value: 'MEDAL', label: tr('Medal'), sport: 'Other' }, { value: 'WHISTLE', label: tr('Seeti'), sport: 'Other' },
  { value: 'OTHER', label: tr('Doosra'), sport: 'Other' },
];
export const typeLabel = (t?: string | null) => SPORT_TYPES.find((x) => x.value === t)?.label ?? (t ? t.replace(/_/g, ' ').toLowerCase() : '—');
/** Kit, jersey and shoes come in sizes. */
export const isApparel = (t?: string | null) => !!t && /JERSEY|KIT$|SHOES|SWIMSUIT/.test(t) && t !== 'CRICKET_KIT_BAG';
export const isBat = (t?: string | null) => t === 'CRICKET_BAT';

export const AGE_GROUPS = [
  { value: 'ADULT', label: tr('Bare') }, { value: 'YOUTH', label: tr('Larkpan (12-17)') }, { value: 'KIDS', label: tr('Bachay') }, { value: 'UNIVERSAL', label: tr('Sab') },
] as const;
export const ageLabel = (a?: string | null) => AGE_GROUPS.find((x) => x.value === a)?.label ?? '—';

export const APPAREL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];
export const KIDS_SIZES = ['22', '24', '26', '28', '30', '32', '34'];
export const BAT_SIZES = ['Size 4', 'Size 5', 'Size 6', 'Harrow', 'Short handle (SH)', 'Long handle (LH)'];

export const PAY_METHODS = [
  { value: 'CASH', label: tr('Cash') }, { value: 'CARD', label: tr('Card') }, { value: 'BANK_TRANSFER', label: tr('Bank') },
  { value: 'JAZZCASH', label: tr('JazzCash') }, { value: 'EASYPAISA', label: tr('Easypaisa') },
] as const;

export const TEAM_STATUS: Record<string, { label: string; tone: string }> = {
  DRAFT: { label: tr('Kacha'), tone: 'bg-slate-100 text-slate-700' },
  QUOTED: { label: tr('Rate diya'), tone: 'bg-sky-50 text-sky-700' },
  CONFIRMED: { label: tr('Pakka'), tone: 'bg-indigo-50 text-indigo-700' },
  IN_PRODUCTION: { label: tr('Ban raha / printing'), tone: 'bg-violet-50 text-violet-700' },
  READY: { label: tr('Tayyar'), tone: 'bg-success-50 text-success-700' },
  DELIVERED: { label: tr('De diya'), tone: 'bg-emerald-600 text-white' },
  CANCELLED: { label: tr('Cancel'), tone: 'bg-rose-50 text-rose-700' },
};
/** Next step of a team order from each status. */
export const TEAM_NEXT: Record<string, string | undefined> = { DRAFT: 'QUOTED', QUOTED: 'CONFIRMED', CONFIRMED: 'IN_PRODUCTION', IN_PRODUCTION: 'READY' };

export const REPAIR_STATUS: Record<string, { label: string; tone: string }> = {
  RECEIVED: { label: tr('Aaya'), tone: 'bg-slate-100 text-slate-700' },
  IN_PROGRESS: { label: tr('Kaam ho raha'), tone: 'bg-violet-50 text-violet-700' },
  ON_HOLD: { label: tr('Ruka hua'), tone: 'bg-amber-50 text-amber-800' },
  COMPLETED: { label: tr('Tayyar'), tone: 'bg-success-50 text-success-700' },
  DELIVERED: { label: tr('De diya'), tone: 'bg-emerald-600 text-white' },
  CANCELLED: { label: tr('Cancel'), tone: 'bg-rose-50 text-rose-700' },
};
/** Repair and item types are stored as written; pages translate them where shown. */
export const REPAIR_TYPES: string[] = [msg('Bat repair'), msg('Bat grip'), msg('Bat oiling / knocking'), msg('Racket stringing'), msg('Racket grip'), msg('Ball silai'), msg('Football bladder'), msg('Shoe sole / spikes'), msg('Gym machine'), msg('Doosra')];
export const ITEM_TYPES: string[] = [msg('Cricket bat'), msg('Badminton racket'), msg('Tennis racket'), msg('Squash racket'), msg('Football'), msg('Shoes'), msg('Gloves / pads'), msg('Gym machine'), msg('Doosra')];

/** Phone in international form for WhatsApp links. */
export const waPhone = (p?: string | null) => {
  const d = String(p ?? '').replace(/\D/g, '');
  return d.startsWith('0') ? `92${d.slice(1)}` : d;
};
