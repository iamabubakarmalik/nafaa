/** Toy store labels, query keys and small helpers shared by the pages, the editor and the counter. */

import { t } from '@core/i18n';
export const KEYS = {
  facts: 'toy-facts',
  packs: 'toy-gift-packs',
  posPacks: 'toy-gift-packs-pos',
  birthdays: 'toy-birthdays',
  safety: 'toy-safety-review',
  detail: 'toy-product-detail',
} as const;

export const AGE_GROUPS: Array<[string, string]> = [
  ['NEWBORN_0_6M', t('0-6 mahine')], ['INFANT_6_12M', t('6-12 mahine')], ['TODDLER_1_2Y', t('1-2 saal')],
  ['TODDLER_2_3Y', t('2-3 saal')], ['PRESCHOOL_3_5Y', t('3-5 saal')], ['KIDS_5_8Y', t('5-8 saal')],
  ['KIDS_8_12Y', t('8-12 saal')], ['TWEEN_12_14Y', t('12-14 saal')], ['TEEN_14_PLUS', t('14+ saal')], ['ALL_AGES', t('Har umar')],
];

export const GENDERS: Array<[string, string]> = [['UNISEX', t('Sab ke liye')], ['BOYS', t('Larkon ke liye')], ['GIRLS', t('Larkiyon ke liye')]];

export const CATEGORY_GROUPS: Array<{ group: string; items: Array<[string, string]> }> = [
  { group: t('Blocks aur puzzle'), items: [['BUILDING_BLOCKS', t('Blocks')], ['LEGO', 'LEGO'], ['PUZZLE', t('Puzzle')], ['ROBOTICS_KIT', t('Robot kit')], ['CODING_TOY', t('Coding')]] },
  { group: t('Gurya aur figure'), items: [['DOLL', t('Gurya')], ['ACTION_FIGURE', t('Action figure')], ['PLUSH_TOY', t('Soft toy')], ['STUFFED_ANIMAL', t('Teddy')], ['CHARACTER_TOY', t('Cartoon character')], ['COLLECTIBLE', t('Collectible')]] },
  { group: t('Seekhne wale'), items: [['EDUCATIONAL_TOY', t('Educational')], ['STEM_TOY', 'STEM'], ['MONTESSORI', t('Montessori')], ['SCIENCE_KIT', t('Science kit')], ['ART_CRAFT', t('Art aur craft')]] },
  { group: t('Gaari aur remote'), items: [['RC_CAR', t('Remote car')], ['RC_DRONE', t('Drone')], ['RC_HELICOPTER', t('Helicopter')], ['DIE_CAST_CAR', t('Metal car')], ['TRAIN_SET', t('Train set')]] },
  { group: t('Games'), items: [['BOARD_GAME', t('Board game')], ['CARD_GAME', t('Card game')], ['TRADING_CARDS', t('Cards')], ['MAGIC_TRICKS', t('Jadoo')]] },
  { group: t('Ghar ghar'), items: [['DOLL_HOUSE', t('Doll house')], ['KITCHEN_SET', t('Kitchen set')], ['PRETEND_PLAY', t('Pretend play')], ['COSTUMES', t('Costume')], ['MUSICAL_INSTRUMENT', t('Baaja')]] },
  { group: t('Bahar khelne wale'), items: [['OUTDOOR_TOY', t('Outdoor')], ['RIDE_ON', t('Ride-on')], ['BIKE_TRIKE', t('Cycle')], ['BALL_SPORTS', t('Ball')], ['WATER_TOY', t('Pani wale')]] },
  { group: t('Bachon ke'), items: [['BABY_TOY', t('Baby toy')], ['RATTLE', t('Jhunjhuna')], ['TEETHER', t('Teether')], ['STACKING_TOY', t('Stacking')]] },
  { group: t('Aur'), items: [['PARTY_SUPPLIES', t('Party saman')], ['BUBBLE_TOY', t('Bubbles')], ['SLIME_PUTTY', t('Slime')], ['FIDGET_TOY', t('Fidget')], ['OTHER', t('Other')]] },
];
export const CATEGORIES: Array<[string, string]> = CATEGORY_GROUPS.flatMap((g) => g.items);

export const CERTIFICATIONS: Array<[string, string]> = [
  ['CE', 'CE'], ['EN71', 'EN71'], ['ASTM', 'ASTM'], ['ISO_8124', 'ISO 8124'], ['CPSC', 'CPSC'], ['PSA', 'PSA'], ['BIS', 'BIS'], ['OTHER', t('Other')],
];

export const BATTERIES = ['AA', 'AAA', 'C', 'D', '9V', 'Button cell', 'Rechargeable'];

export const OCCASIONS: Array<[string, string]> = [
  ['BIRTHDAY', t('Saalgirah')], ['EID', t('Eid')], ['AQIQAH', t('Aqiqah')], ['RESULT', t('Result / pass')], ['NEW_BABY', t('Naya baby')], ['OTHER', t('Other')],
];

export const labelOf = (list: Array<[string, string]>, v?: string | null) => (v ? list.find(([k]) => k === v)?.[1] ?? v.replace(/_/g, ' ').toLowerCase() : '');

/** Short age text: "3-5 saal" or "3+ saal". */
export function ageText(f?: { ageGroup?: string | null; ageMinYears?: number | null; ageMaxYears?: number | null } | null): string {
  if (!f) return '';
  if (f.ageMinYears != null && f.ageMaxYears != null) return t('{{ageMinYears}}-{{ageMaxYears}} saal', { ageMinYears: f.ageMinYears, ageMaxYears: f.ageMaxYears });
  if (f.ageMinYears != null) return t('{{ageMinYears}}+ saal', { ageMinYears: f.ageMinYears });
  return labelOf(AGE_GROUPS, f.ageGroup);
}

/** The server's message, else a fallback. */
export function apiError(e: unknown, fallback: string): string {
  const msg = (e as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  if (Array.isArray(msg)) return String(msg[0] ?? fallback);
  return typeof msg === 'string' && msg ? msg : fallback;
}

/** SKU of the shop's gift wrapping service line. */
export const GIFT_WRAP_SKU = 'TOY-GIFT-WRAP';
