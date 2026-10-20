/** Toy store labels, query keys and small helpers shared by the pages, the editor and the counter. */

export const KEYS = {
  facts: 'toy-facts',
  packs: 'toy-gift-packs',
  posPacks: 'toy-gift-packs-pos',
  birthdays: 'toy-birthdays',
  safety: 'toy-safety-review',
  detail: 'toy-product-detail',
} as const;

export const AGE_GROUPS: Array<[string, string]> = [
  ['NEWBORN_0_6M', '0-6 mahine'], ['INFANT_6_12M', '6-12 mahine'], ['TODDLER_1_2Y', '1-2 saal'],
  ['TODDLER_2_3Y', '2-3 saal'], ['PRESCHOOL_3_5Y', '3-5 saal'], ['KIDS_5_8Y', '5-8 saal'],
  ['KIDS_8_12Y', '8-12 saal'], ['TWEEN_12_14Y', '12-14 saal'], ['TEEN_14_PLUS', '14+ saal'], ['ALL_AGES', 'Har umar'],
];

export const GENDERS: Array<[string, string]> = [['UNISEX', 'Sab ke liye'], ['BOYS', 'Larkon ke liye'], ['GIRLS', 'Larkiyon ke liye']];

export const CATEGORY_GROUPS: Array<{ group: string; items: Array<[string, string]> }> = [
  { group: 'Blocks aur puzzle', items: [['BUILDING_BLOCKS', 'Blocks'], ['LEGO', 'LEGO'], ['PUZZLE', 'Puzzle'], ['ROBOTICS_KIT', 'Robot kit'], ['CODING_TOY', 'Coding']] },
  { group: 'Gurya aur figure', items: [['DOLL', 'Gurya'], ['ACTION_FIGURE', 'Action figure'], ['PLUSH_TOY', 'Soft toy'], ['STUFFED_ANIMAL', 'Teddy'], ['CHARACTER_TOY', 'Cartoon character'], ['COLLECTIBLE', 'Collectible']] },
  { group: 'Seekhne wale', items: [['EDUCATIONAL_TOY', 'Educational'], ['STEM_TOY', 'STEM'], ['MONTESSORI', 'Montessori'], ['SCIENCE_KIT', 'Science kit'], ['ART_CRAFT', 'Art aur craft']] },
  { group: 'Gaari aur remote', items: [['RC_CAR', 'Remote car'], ['RC_DRONE', 'Drone'], ['RC_HELICOPTER', 'Helicopter'], ['DIE_CAST_CAR', 'Metal car'], ['TRAIN_SET', 'Train set']] },
  { group: 'Games', items: [['BOARD_GAME', 'Board game'], ['CARD_GAME', 'Card game'], ['TRADING_CARDS', 'Cards'], ['MAGIC_TRICKS', 'Jadoo']] },
  { group: 'Ghar ghar', items: [['DOLL_HOUSE', 'Doll house'], ['KITCHEN_SET', 'Kitchen set'], ['PRETEND_PLAY', 'Pretend play'], ['COSTUMES', 'Costume'], ['MUSICAL_INSTRUMENT', 'Baaja']] },
  { group: 'Bahar khelne wale', items: [['OUTDOOR_TOY', 'Outdoor'], ['RIDE_ON', 'Ride-on'], ['BIKE_TRIKE', 'Cycle'], ['BALL_SPORTS', 'Ball'], ['WATER_TOY', 'Pani wale']] },
  { group: 'Bachon ke', items: [['BABY_TOY', 'Baby toy'], ['RATTLE', 'Jhunjhuna'], ['TEETHER', 'Teether'], ['STACKING_TOY', 'Stacking']] },
  { group: 'Aur', items: [['PARTY_SUPPLIES', 'Party saman'], ['BUBBLE_TOY', 'Bubbles'], ['SLIME_PUTTY', 'Slime'], ['FIDGET_TOY', 'Fidget'], ['OTHER', 'Other']] },
];
export const CATEGORIES: Array<[string, string]> = CATEGORY_GROUPS.flatMap((g) => g.items);

export const CERTIFICATIONS: Array<[string, string]> = [
  ['CE', 'CE'], ['EN71', 'EN71'], ['ASTM', 'ASTM'], ['ISO_8124', 'ISO 8124'], ['CPSC', 'CPSC'], ['PSA', 'PSA'], ['BIS', 'BIS'], ['OTHER', 'Other'],
];

export const BATTERIES = ['AA', 'AAA', 'C', 'D', '9V', 'Button cell', 'Rechargeable'];

export const OCCASIONS: Array<[string, string]> = [
  ['BIRTHDAY', 'Saalgirah'], ['EID', 'Eid'], ['AQIQAH', 'Aqiqah'], ['RESULT', 'Result / pass'], ['NEW_BABY', 'Naya baby'], ['OTHER', 'Other'],
];

export const labelOf = (list: Array<[string, string]>, v?: string | null) => (v ? list.find(([k]) => k === v)?.[1] ?? v.replace(/_/g, ' ').toLowerCase() : '');

/** Short age text: "3-5 saal" or "3+ saal". */
export function ageText(f?: { ageGroup?: string | null; ageMinYears?: number | null; ageMaxYears?: number | null } | null): string {
  if (!f) return '';
  if (f.ageMinYears != null && f.ageMaxYears != null) return `${f.ageMinYears}-${f.ageMaxYears} saal`;
  if (f.ageMinYears != null) return `${f.ageMinYears}+ saal`;
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
