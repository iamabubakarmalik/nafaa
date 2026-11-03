/**
 * Sports labels, statuses, query keys and helpers (mirror of the web sports
 * components/meta.ts). Labels are source keys marked with msg() and
 * translated where shown. Rules are in @nafaa/core/industries/sports.
 */

import { msg, t } from '@/core/i18n';
import { queryClient } from '@/core/query/client';
import type { StatusTone } from '@/design';
import { formatDate } from '@/core/format';

export const META_KEY = 'sports-meta';
export const TEAM_KEY = 'sports-team-orders';
export const REPAIR_KEY = 'sports-repairs';
export const DASH_KEY = 'sports-dashboard-overview';
/** Money pages refreshed after a payment, bill or refund. */
const MONEY_KEYS = ['sales-history', 'customers-directory', 'customer', 'customer-ledger', 'inv', 'offline', 'cash-register', 'dashboard'];

/** Refreshes sports screens (and sales, stock and khata after a bill or payment). */
export function refreshSports(keys: string[], money = false) {
  [...keys, DASH_KEY, 'sports-team-summary', 'sports-repair-summary', ...(money ? MONEY_KEYS : [])].forEach((k) => void queryClient.invalidateQueries({ queryKey: [k] }));
}

export const day = (d?: string | null) => (d ? formatDate(d) : '—');
export const dayFull = (d?: string | null) => (d ? formatDate(d, { year: true }) : '—');

/** Sport names are stored on products as written here; screens translate them where shown. */
export const SPORTS: string[] = [msg('Cricket'), msg('Football'), msg('Hockey'), msg('Badminton'), msg('Tennis'), msg('Table Tennis'), msg('Squash'), msg('Basketball'), msg('Volleyball'), msg('Gym / Fitness'), msg('Boxing'), msg('Swimming'), msg('Cycling'), msg('Other')];

export const SPORT_TYPES: Array<{ value: string; label: string; sport: string }> = [
  { value: 'CRICKET_BAT', label: msg('Bat'), sport: 'Cricket' }, { value: 'CRICKET_BALL', label: msg('Ball (hard / tape)'), sport: 'Cricket' }, { value: 'CRICKET_PADS', label: msg('Pads'), sport: 'Cricket' },
  { value: 'CRICKET_GLOVES', label: msg('Gloves'), sport: 'Cricket' }, { value: 'CRICKET_HELMET', label: msg('Helmet'), sport: 'Cricket' }, { value: 'CRICKET_GUARD', label: msg('Guard'), sport: 'Cricket' },
  { value: 'CRICKET_KIT_BAG', label: msg('Kit bag'), sport: 'Cricket' }, { value: 'CRICKET_STUMPS', label: msg('Stumps'), sport: 'Cricket' }, { value: 'CRICKET_JERSEY', label: msg('Kit / shirt'), sport: 'Cricket' },
  { value: 'CRICKET_SHOES', label: msg('Spikes / shoes'), sport: 'Cricket' }, { value: 'FOOTBALL', label: msg('Football'), sport: 'Football' }, { value: 'FOOTBALL_JERSEY', label: msg('Jersey'), sport: 'Football' },
  { value: 'FOOTBALL_KIT', label: msg('Poori kit'), sport: 'Football' }, { value: 'FOOTBALL_SHOES', label: msg('Studs'), sport: 'Football' }, { value: 'SHIN_GUARDS', label: msg('Shin guard'), sport: 'Football' },
  { value: 'GOALKEEPER_GLOVES', label: msg('Keeper gloves'), sport: 'Football' }, { value: 'BADMINTON_RACKET', label: msg('Racket'), sport: 'Badminton' }, { value: 'BADMINTON_SHUTTLECOCK', label: msg('Shuttle'), sport: 'Badminton' },
  { value: 'TENNIS_RACKET', label: msg('Racket'), sport: 'Tennis' }, { value: 'TENNIS_BALL', label: msg('Ball'), sport: 'Tennis' }, { value: 'TABLE_TENNIS_BAT', label: msg('TT bat'), sport: 'Table Tennis' },
  { value: 'TABLE_TENNIS_BALL', label: msg('TT ball'), sport: 'Table Tennis' }, { value: 'SQUASH_RACKET', label: msg('Racket'), sport: 'Squash' }, { value: 'BASKETBALL', label: msg('Ball'), sport: 'Basketball' },
  { value: 'BASKETBALL_JERSEY', label: msg('Jersey'), sport: 'Basketball' }, { value: 'VOLLEYBALL', label: msg('Ball'), sport: 'Volleyball' }, { value: 'VOLLEYBALL_NET', label: msg('Net'), sport: 'Volleyball' },
  { value: 'DUMBBELL', label: msg('Dumbbell'), sport: 'Gym / Fitness' }, { value: 'WEIGHT_PLATE', label: msg('Plates'), sport: 'Gym / Fitness' }, { value: 'BARBELL', label: msg('Rod'), sport: 'Gym / Fitness' },
  { value: 'TREADMILL', label: msg('Treadmill'), sport: 'Gym / Fitness' }, { value: 'EXERCISE_BIKE', label: msg('Cycle machine'), sport: 'Gym / Fitness' }, { value: 'YOGA_MAT', label: msg('Mat'), sport: 'Gym / Fitness' },
  { value: 'RESISTANCE_BAND', label: msg('Band'), sport: 'Gym / Fitness' }, { value: 'SKIPPING_ROPE', label: msg('Rassi'), sport: 'Gym / Fitness' }, { value: 'PROTEIN_SUPPLEMENT', label: msg('Supplement'), sport: 'Gym / Fitness' },
  { value: 'GYM_ACCESSORY', label: msg('Gym saman'), sport: 'Gym / Fitness' }, { value: 'BOXING_GLOVES', label: msg('Gloves'), sport: 'Boxing' }, { value: 'PUNCHING_BAG', label: msg('Punching bag'), sport: 'Boxing' },
  { value: 'SWIMSUIT', label: msg('Costume'), sport: 'Swimming' }, { value: 'SWIMMING_GOGGLES', label: msg('Goggles'), sport: 'Swimming' }, { value: 'BICYCLE', label: msg('Cycle'), sport: 'Cycling' },
  { value: 'CYCLING_HELMET', label: msg('Helmet'), sport: 'Cycling' }, { value: 'TROPHY', label: msg('Trophy'), sport: 'Other' }, { value: 'MEDAL', label: msg('Medal'), sport: 'Other' },
  { value: 'WHISTLE', label: msg('Seeti'), sport: 'Other' }, { value: 'OTHER', label: msg('Doosra'), sport: 'Other' },
];
export const typeLabel = (v?: string | null) => { const x = SPORT_TYPES.find((s) => s.value === v); return x ? t(x.label) : v ? v.replace(/_/g, ' ').toLowerCase() : '—'; };

export const AGE_GROUPS = [{ value: 'ADULT', label: msg('Bare') }, { value: 'YOUTH', label: msg('Larkpan (12-17)') }, { value: 'KIDS', label: msg('Bachay') }, { value: 'UNIVERSAL', label: msg('Sab') }];
export const APPAREL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];
export const KIDS_SIZES = ['22', '24', '26', '28', '30', '32', '34'];
export const BAT_SIZES = ['Size 4', 'Size 5', 'Size 6', 'Harrow', 'Short handle (SH)', 'Long handle (LH)'];

interface Status { label: string; tone: StatusTone }
export const TEAM_STATUS: Record<string, Status> = {
  DRAFT: { label: msg('Kacha'), tone: 'neutral' }, QUOTED: { label: msg('Rate diya'), tone: 'info' }, CONFIRMED: { label: msg('Pakka'), tone: 'brand' },
  IN_PRODUCTION: { label: msg('Ban raha / printing'), tone: 'accent' }, READY: { label: msg('Tayyar'), tone: 'success' }, DELIVERED: { label: msg('De diya'), tone: 'success' }, CANCELLED: { label: msg('Cancel'), tone: 'danger' },
};
export const REPAIR_STATUS: Record<string, Status> = {
  RECEIVED: { label: msg('Aaya'), tone: 'neutral' }, IN_PROGRESS: { label: msg('Kaam ho raha'), tone: 'accent' }, ON_HOLD: { label: msg('Ruka hua'), tone: 'warning' },
  COMPLETED: { label: msg('Tayyar'), tone: 'success' }, DELIVERED: { label: msg('De diya'), tone: 'success' }, CANCELLED: { label: msg('Cancel'), tone: 'danger' },
};

/** Repair and item types are stored as written; screens translate them where shown. */
export const REPAIR_TYPES: string[] = [msg('Bat repair'), msg('Bat grip'), msg('Bat oiling / knocking'), msg('Racket stringing'), msg('Racket grip'), msg('Ball silai'), msg('Football bladder'), msg('Shoe sole / spikes'), msg('Gym machine'), msg('Doosra')];
export const ITEM_TYPES: string[] = [msg('Cricket bat'), msg('Badminton racket'), msg('Tennis racket'), msg('Squash racket'), msg('Football'), msg('Shoes'), msg('Gloves / pads'), msg('Gym machine'), msg('Doosra')];
