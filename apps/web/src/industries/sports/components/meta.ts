/** Sports labels, statuses, query keys and small helpers used across the sports pages. */

export const META_KEY = 'sports-meta';
export const TEAM_KEY = 'sports-team-orders';
export const REPAIR_KEY = 'sports-repairs';
/** Money pages refreshed after a payment, bill or refund. */
export const MONEY_KEYS = ['sales', 'sales-history', 'dashboard', 'khata', 'customers', 'cash-register', 'day-book'];

export const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
export const opt = (v?: string | null) => (v && v.trim() ? v.trim() : undefined);

export function apiError(e: unknown, fallback = 'Kuch ghalat ho gaya') {
  const m = (e as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  return Array.isArray(m) ? String(m[0]) : typeof m === 'string' ? m : fallback;
}

export const dayOnly = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' }) : '—');
export const dayFull = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
/** yyyy-mm-dd in the shop's day, for date inputs. */
export const dateInput = (d?: string | Date | null) => (d ? new Date(d).toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' }) : '');

export const SPORTS = ['Cricket', 'Football', 'Hockey', 'Badminton', 'Tennis', 'Table Tennis', 'Squash', 'Basketball', 'Volleyball', 'Gym / Fitness', 'Boxing', 'Swimming', 'Cycling', 'Other'];

export const SPORT_TYPES: Array<{ value: string; label: string; sport: string }> = [
  { value: 'CRICKET_BAT', label: 'Bat', sport: 'Cricket' }, { value: 'CRICKET_BALL', label: 'Ball (hard / tape)', sport: 'Cricket' },
  { value: 'CRICKET_PADS', label: 'Pads', sport: 'Cricket' }, { value: 'CRICKET_GLOVES', label: 'Gloves', sport: 'Cricket' },
  { value: 'CRICKET_HELMET', label: 'Helmet', sport: 'Cricket' }, { value: 'CRICKET_GUARD', label: 'Guard', sport: 'Cricket' },
  { value: 'CRICKET_KIT_BAG', label: 'Kit bag', sport: 'Cricket' }, { value: 'CRICKET_STUMPS', label: 'Stumps', sport: 'Cricket' },
  { value: 'CRICKET_JERSEY', label: 'Kit / shirt', sport: 'Cricket' }, { value: 'CRICKET_SHOES', label: 'Spikes / shoes', sport: 'Cricket' },
  { value: 'FOOTBALL', label: 'Football', sport: 'Football' }, { value: 'FOOTBALL_JERSEY', label: 'Jersey', sport: 'Football' },
  { value: 'FOOTBALL_KIT', label: 'Poori kit', sport: 'Football' }, { value: 'FOOTBALL_SHOES', label: 'Studs', sport: 'Football' },
  { value: 'SHIN_GUARDS', label: 'Shin guard', sport: 'Football' }, { value: 'GOALKEEPER_GLOVES', label: 'Keeper gloves', sport: 'Football' },
  { value: 'BADMINTON_RACKET', label: 'Racket', sport: 'Badminton' }, { value: 'BADMINTON_SHUTTLECOCK', label: 'Shuttle', sport: 'Badminton' },
  { value: 'TENNIS_RACKET', label: 'Racket', sport: 'Tennis' }, { value: 'TENNIS_BALL', label: 'Ball', sport: 'Tennis' },
  { value: 'TABLE_TENNIS_BAT', label: 'TT bat', sport: 'Table Tennis' }, { value: 'TABLE_TENNIS_BALL', label: 'TT ball', sport: 'Table Tennis' },
  { value: 'SQUASH_RACKET', label: 'Racket', sport: 'Squash' },
  { value: 'BASKETBALL', label: 'Ball', sport: 'Basketball' }, { value: 'BASKETBALL_JERSEY', label: 'Jersey', sport: 'Basketball' },
  { value: 'VOLLEYBALL', label: 'Ball', sport: 'Volleyball' }, { value: 'VOLLEYBALL_NET', label: 'Net', sport: 'Volleyball' },
  { value: 'DUMBBELL', label: 'Dumbbell', sport: 'Gym / Fitness' }, { value: 'WEIGHT_PLATE', label: 'Plates', sport: 'Gym / Fitness' },
  { value: 'BARBELL', label: 'Rod', sport: 'Gym / Fitness' }, { value: 'TREADMILL', label: 'Treadmill', sport: 'Gym / Fitness' },
  { value: 'EXERCISE_BIKE', label: 'Cycle machine', sport: 'Gym / Fitness' }, { value: 'YOGA_MAT', label: 'Mat', sport: 'Gym / Fitness' },
  { value: 'RESISTANCE_BAND', label: 'Band', sport: 'Gym / Fitness' }, { value: 'SKIPPING_ROPE', label: 'Rassi', sport: 'Gym / Fitness' },
  { value: 'PROTEIN_SUPPLEMENT', label: 'Supplement', sport: 'Gym / Fitness' }, { value: 'GYM_ACCESSORY', label: 'Gym saman', sport: 'Gym / Fitness' },
  { value: 'BOXING_GLOVES', label: 'Gloves', sport: 'Boxing' }, { value: 'PUNCHING_BAG', label: 'Punching bag', sport: 'Boxing' },
  { value: 'SWIMSUIT', label: 'Costume', sport: 'Swimming' }, { value: 'SWIMMING_GOGGLES', label: 'Goggles', sport: 'Swimming' },
  { value: 'BICYCLE', label: 'Cycle', sport: 'Cycling' }, { value: 'CYCLING_HELMET', label: 'Helmet', sport: 'Cycling' },
  { value: 'TROPHY', label: 'Trophy', sport: 'Other' }, { value: 'MEDAL', label: 'Medal', sport: 'Other' }, { value: 'WHISTLE', label: 'Seeti', sport: 'Other' },
  { value: 'OTHER', label: 'Doosra', sport: 'Other' },
];
export const typeLabel = (t?: string | null) => SPORT_TYPES.find((x) => x.value === t)?.label ?? (t ? t.replace(/_/g, ' ').toLowerCase() : '—');
/** Kit, jersey and shoes come in sizes. */
export const isApparel = (t?: string | null) => !!t && /JERSEY|KIT$|SHOES|SWIMSUIT/.test(t) && t !== 'CRICKET_KIT_BAG';
export const isBat = (t?: string | null) => t === 'CRICKET_BAT';

export const AGE_GROUPS = [
  { value: 'ADULT', label: 'Bare' }, { value: 'YOUTH', label: 'Larkpan (12-17)' }, { value: 'KIDS', label: 'Bachay' }, { value: 'UNIVERSAL', label: 'Sab' },
] as const;
export const ageLabel = (a?: string | null) => AGE_GROUPS.find((x) => x.value === a)?.label ?? '—';

export const APPAREL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];
export const KIDS_SIZES = ['22', '24', '26', '28', '30', '32', '34'];
export const BAT_SIZES = ['Size 4', 'Size 5', 'Size 6', 'Harrow', 'Short handle (SH)', 'Long handle (LH)'];

export const PAY_METHODS = [
  { value: 'CASH', label: 'Cash' }, { value: 'CARD', label: 'Card' }, { value: 'BANK_TRANSFER', label: 'Bank' },
  { value: 'JAZZCASH', label: 'JazzCash' }, { value: 'EASYPAISA', label: 'Easypaisa' },
] as const;

export const TEAM_STATUS: Record<string, { label: string; tone: string }> = {
  DRAFT: { label: 'Kacha', tone: 'bg-slate-100 text-slate-700' },
  QUOTED: { label: 'Rate diya', tone: 'bg-sky-50 text-sky-700' },
  CONFIRMED: { label: 'Pakka', tone: 'bg-indigo-50 text-indigo-700' },
  IN_PRODUCTION: { label: 'Ban raha / printing', tone: 'bg-violet-50 text-violet-700' },
  READY: { label: 'Tayyar', tone: 'bg-success-50 text-success-700' },
  DELIVERED: { label: 'De diya', tone: 'bg-emerald-600 text-white' },
  CANCELLED: { label: 'Cancel', tone: 'bg-rose-50 text-rose-700' },
};
/** Next step of a team order from each status. */
export const TEAM_NEXT: Record<string, string | undefined> = { DRAFT: 'QUOTED', QUOTED: 'CONFIRMED', CONFIRMED: 'IN_PRODUCTION', IN_PRODUCTION: 'READY' };

export const REPAIR_STATUS: Record<string, { label: string; tone: string }> = {
  RECEIVED: { label: 'Aaya', tone: 'bg-slate-100 text-slate-700' },
  IN_PROGRESS: { label: 'Kaam ho raha', tone: 'bg-violet-50 text-violet-700' },
  ON_HOLD: { label: 'Ruka hua', tone: 'bg-amber-50 text-amber-800' },
  COMPLETED: { label: 'Tayyar', tone: 'bg-success-50 text-success-700' },
  DELIVERED: { label: 'De diya', tone: 'bg-emerald-600 text-white' },
  CANCELLED: { label: 'Cancel', tone: 'bg-rose-50 text-rose-700' },
};
export const REPAIR_TYPES = ['Bat repair', 'Bat grip', 'Bat oiling / knocking', 'Racket stringing', 'Racket grip', 'Ball silai', 'Football bladder', 'Shoe sole / spikes', 'Gym machine', 'Doosra'];
export const ITEM_TYPES = ['Cricket bat', 'Badminton racket', 'Tennis racket', 'Squash racket', 'Football', 'Shoes', 'Gloves / pads', 'Gym machine', 'Doosra'];

/** Phone in international form for WhatsApp links. */
export const waPhone = (p?: string | null) => {
  const d = String(p ?? '').replace(/\D/g, '');
  return d.startsWith('0') ? `92${d.slice(1)}` : d;
};
