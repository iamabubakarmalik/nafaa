/**
 * Toy store labels, query keys and small helpers shared by the screens, the
 * editor and the counter (mirror of the web toystore lib/meta.ts). Labels are
 * source keys marked with msg() and translated where shown.
 */

import { ageShape, birthdayMessage, type AgeFacts } from '@nafaa/core/industries/toystore';
import type { MessageLang } from '@nafaa/core/customers';
import { businessDayKey, formatDate } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { queryClient } from '@/core/query/client';
import type { StatusTone } from '@/design';
import type { SafetyRow, ToyBirthdayReminder } from './api';

export const KEYS = {
  facts: 'toy-facts', packs: 'toy-gift-packs', posPacks: 'toy-gift-packs-pos', birthdays: 'toy-birthdays', safety: 'toy-safety-review', detail: 'toy-product-detail',
  overview: 'toystore-dashboard-overview', wrap: 'toy-gift-wrap',
} as const;

export const refreshToy = (keys: string[]) => keys.forEach((k) => void queryClient.invalidateQueries({ queryKey: [k] }));

export const AGE_GROUPS: Array<[string, string]> = [
  ['NEWBORN_0_6M', msg('0-6 mahine')], ['INFANT_6_12M', msg('6-12 mahine')], ['TODDLER_1_2Y', msg('1-2 saal')], ['TODDLER_2_3Y', msg('2-3 saal')],
  ['PRESCHOOL_3_5Y', msg('3-5 saal')], ['KIDS_5_8Y', msg('5-8 saal')], ['KIDS_8_12Y', msg('8-12 saal')], ['TWEEN_12_14Y', msg('12-14 saal')],
  ['TEEN_14_PLUS', msg('14+ saal')], ['ALL_AGES', msg('Har umar')],
];

export const GENDERS: Array<[string, string]> = [['UNISEX', msg('Sab ke liye')], ['BOYS', msg('Larkon ke liye')], ['GIRLS', msg('Larkiyon ke liye')]];

export const CATEGORY_GROUPS: Array<{ group: string; items: Array<[string, string]> }> = [
  { group: msg('Blocks aur puzzle'), items: [['BUILDING_BLOCKS', msg('Blocks')], ['LEGO', 'LEGO'], ['PUZZLE', msg('Puzzle')], ['ROBOTICS_KIT', msg('Robot kit')], ['CODING_TOY', msg('Coding')]] },
  { group: msg('Gurya aur figure'), items: [['DOLL', msg('Gurya')], ['ACTION_FIGURE', msg('Action figure')], ['PLUSH_TOY', msg('Soft toy')], ['STUFFED_ANIMAL', msg('Teddy')], ['CHARACTER_TOY', msg('Cartoon character')], ['COLLECTIBLE', msg('Collectible')]] },
  { group: msg('Seekhne wale'), items: [['EDUCATIONAL_TOY', msg('Educational')], ['STEM_TOY', 'STEM'], ['MONTESSORI', msg('Montessori')], ['SCIENCE_KIT', msg('Science kit')], ['ART_CRAFT', msg('Art aur craft')]] },
  { group: msg('Gaari aur remote'), items: [['RC_CAR', msg('Remote car')], ['RC_DRONE', msg('Drone')], ['RC_HELICOPTER', msg('Helicopter')], ['DIE_CAST_CAR', msg('Metal car')], ['TRAIN_SET', msg('Train set')]] },
  { group: msg('Games'), items: [['BOARD_GAME', msg('Board game')], ['CARD_GAME', msg('Card game')], ['TRADING_CARDS', msg('Cards')], ['MAGIC_TRICKS', msg('Jadoo')]] },
  { group: msg('Ghar ghar'), items: [['DOLL_HOUSE', msg('Doll house')], ['KITCHEN_SET', msg('Kitchen set')], ['PRETEND_PLAY', msg('Pretend play')], ['COSTUMES', msg('Costume')], ['MUSICAL_INSTRUMENT', msg('Baaja')]] },
  { group: msg('Bahar khelne wale'), items: [['OUTDOOR_TOY', msg('Outdoor')], ['RIDE_ON', msg('Ride-on')], ['BIKE_TRIKE', msg('Cycle')], ['BALL_SPORTS', msg('Ball')], ['WATER_TOY', msg('Pani wale')]] },
  { group: msg('Bachon ke'), items: [['BABY_TOY', msg('Baby toy')], ['RATTLE', msg('Jhunjhuna')], ['TEETHER', msg('Teether')], ['STACKING_TOY', msg('Stacking')]] },
  { group: msg('Aur'), items: [['PARTY_SUPPLIES', msg('Party saman')], ['BUBBLE_TOY', msg('Bubbles')], ['SLIME_PUTTY', msg('Slime')], ['FIDGET_TOY', msg('Fidget')], ['OTHER', msg('Other')]] },
];
export const CATEGORIES: Array<[string, string]> = CATEGORY_GROUPS.flatMap((g) => g.items);

export const CERTIFICATIONS: Array<[string, string]> = [['CE', 'CE'], ['EN71', 'EN71'], ['ASTM', 'ASTM'], ['ISO_8124', 'ISO 8124'], ['CPSC', 'CPSC'], ['PSA', 'PSA'], ['BIS', 'BIS'], ['OTHER', msg('Other')]];
export const BATTERIES = ['AA', 'AAA', 'C', 'D', '9V', 'Button cell', 'Rechargeable'];
export const OCCASIONS: Array<[string, string]> = [['BIRTHDAY', msg('Saalgirah')], ['EID', msg('Eid')], ['AQIQAH', msg('Aqiqah')], ['RESULT', msg('Result / pass')], ['NEW_BABY', msg('Naya baby')], ['OTHER', msg('Other')]];

/** Label of a code in one of the lists above, translated; unknown codes read as plain words. */
export const labelOf = (list: Array<[string, string]>, v?: string | null): string => (v ? t(list.find(([k]) => k === v)?.[1] ?? v.replace(/_/g, ' ').toLowerCase()) : '');

/** Short age text: "3-5 saal", "3+ saal" or the age group. */
export function ageText(f?: AgeFacts | null): string {
  const a = ageShape(f);
  if (a.kind === 'range') return t('{{ageMinYears}}-{{ageMaxYears}} saal', { ageMinYears: a.min, ageMaxYears: a.max });
  if (a.kind === 'min') return t('{{ageMinYears}}+ saal', { ageMinYears: a.min });
  return a.kind === 'group' ? labelOf(AGE_GROUPS, a.group) : '';
}

export const factLine = (f?: (AgeFacts & { categoryType?: string | null; brand?: string | null; characterFranchise?: string | null }) | null): string | undefined =>
  f ? [ageText(f), labelOf(CATEGORIES, f.categoryType), f.brand, f.characterFranchise].filter(Boolean).join(' · ') || undefined : undefined;

export const dayOnly = (d?: string | null) => (d ? formatDate(d, { year: true }) : '—');
export const todayKey = () => businessDayKey(Date.now());

export const whenText = (d: number) => (d === 0 ? t('Aaj') : d === 1 ? t('Kal') : t('{{d}} din baad', { d }));

/** WhatsApp text for the parent before the birthday (shop's bill language). */
export const reminderText = (r: ToyBirthdayReminder, lang: MessageLang, shop?: string) =>
  birthdayMessage({ parent: r.customerName, child: r.childName, days: r.computed?.daysUntilBirthday ?? 0, turningAge: r.computed?.turningAge ?? '', shop }, lang);

export const FLAG: Record<SafetyRow['riskFlags'][number], { label: string; tone: StatusTone }> = {
  UNDER_THREE: { label: msg('Chhote bachon par chhote purze'), tone: 'danger' },
  CHOKING_HAZARD: { label: msg('Gale me phans sakta hai'), tone: 'warning' },
  SMALL_PARTS: { label: msg('Chhote purze'), tone: 'warning' },
  NOT_CERTIFIED_NON_TOXIC: { label: msg('Non-toxic nahi likha'), tone: 'accent' },
  NO_SAFETY_CERTIFICATION: { label: msg('Certificate nahi'), tone: 'neutral' },
};
