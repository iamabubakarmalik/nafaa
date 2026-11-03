/**
 * A product's picture when it has no photo: an emoji guessed from its name
 * or category (soap, milk, rice…) and a soft tint that is always the same for
 * the same name, so a list without photos is still easy to scan. A guess to
 * fill the space; a real photo is always better.
 */

/** [emoji, keywords]; order matters, the first match wins. */
const RULES: Array<[string, string[]]> = [
  ['🥤', ['cola', 'pepsi', 'sprite', 'fanta', 'mirinda', 'dew', 'soda', 'cold drink', '7up', 'rc ']],
  ['🧃', ['juice', 'nectar', 'slice', 'fruit drink', 'tang', 'sharbat', 'squash', 'maza', 'frooto']],
  ['🥛', ['milk', 'doodh', 'olpers', 'milkpak', 'lassi', 'yogurt', 'dahi', 'yoghurt']],
  ['☕', ['tea', 'chai', 'lipton', 'tapal', 'danedar', 'coffee', 'nescafe', 'teabag']],
  ['💧', ['water', 'mineral', 'aquafina', 'nestle pure']],

  ['🍪', ['biscuit', 'cookie', 'rusk', 'gala', 'sooper', 'tuc', 'oreo', 'candi']],
  ['🍫', ['chocolate', 'choco', 'dairy milk', 'kitkat', 'snickers', 'galaxy', 'toffee', 'candy', 'lollipop']],
  ['🍟', ['chips', 'crisps', 'lays', 'kurkure', 'nimko', 'snack', 'slanty', 'popcorn']],
  ['🍜', ['noodle', 'pasta', 'macaroni', 'spaghetti', 'vermicelli', 'sevaiyan', 'maggi']],
  ['🍚', ['rice', 'chawal', 'basmati', 'sella']],
  ['🌾', ['atta', 'flour', 'maida', 'suji', 'besan', 'wheat', 'gandum', 'daliya']],
  ['🫘', ['daal', 'dal ', 'lentil', 'chana', 'moong', 'masoor', 'beans', 'lobia', 'maash']],
  ['🧂', ['salt', 'namak', 'sugar', 'cheeni', 'gur', 'jaggery']],
  ['🌶️', ['masala', 'spice', 'mirch', 'haldi', 'turmeric', 'zeera', 'cumin', 'dhania', 'shan ', 'national ']],
  ['🫗', ['oil', 'ghee', 'dalda', 'sufi', 'kausar', 'canola', 'sunflower', 'banaspati']],
  ['🥫', ['sauce', 'ketchup', 'mayo', 'paste', 'puree', 'pickle', 'achar', 'jam', 'honey', 'shehad', 'vinegar', 'sirka']],
  ['🥚', ['egg', 'anda']],
  ['🧀', ['cheese', 'butter', 'makhan', 'margarine']],
  ['🍞', ['bread', 'double roti', 'bun', 'paratha', 'naan']],
  ['🥩', ['meat', 'gosht', 'chicken', 'murgh', 'beef', 'mutton', 'fish', 'machli', 'qeema']],
  ['🥔', ['potato', 'aloo', 'onion', 'pyaz', 'tomato', 'tamatar', 'sabzi', 'vegetable']],

  ['🧼', ['soap', 'sabun', 'lifebuoy', 'lux', 'safeguard', 'bodywash', 'body wash', 'handwash', 'hand wash']],
  ['🧽', ['dishwash', 'dish wash', 'vim', 'scrub', 'sponge', 'harpic', 'toilet clean', 'bleach', 'phenyl', 'finis']],
  ['🧺', ['detergent', 'washing powder', 'surf', 'ariel', 'brite', 'bonus', 'express power', 'softener', 'comfort']],
  ['🪥', ['toothpaste', 'colgate', 'sensodyne', 'toothbrush', 'mouthwash']],
  ['🧻', ['tissue', 'napkin', 'toilet paper', 'wipes', 'rose petal']],
  ['🪒', ['razor', 'shaving', 'blade', 'gillette', 'after shave']],

  ['💄', ['lipstick', 'makeup', 'foundation', 'kajal', 'mascara', 'nail polish', 'blush']],
  ['🧴', ['shampoo', 'conditioner', 'lotion', 'hair oil', 'sunsilk', 'pantene', 'head shoulder', 'dove',
          'cream', 'fairness', 'whitening', 'moisturiz', 'ponds', 'olay', 'nivea', 'vaseline', 'sunblock', 'gel']],
  ['🌸', ['perfume', 'body spray', 'deodorant', 'deo ', 'fragrance', 'attar', 'fogg']],

  ['🍼', ['baby', 'diaper', 'pampers', 'canbebe', 'cerelac', 'lactogen', 'feeder', 'formula']],
  ['🧸', ['toy', 'khilona', 'doll']],

  ['🕯️', ['candle', 'matches', 'machis', 'lighter', 'agarbatti', 'incense']],
  ['🔋', ['battery', 'duracell', 'eveready']],
  ['💡', ['bulb', 'led light', 'tube light', 'lamp']],
  ['🧹', ['broom', 'jhaaru', 'mop', 'duster', 'wiper']],
  ['🗑️', ['garbage', 'shopper', 'polythene', 'trash']],
  ['🍽️', ['plate', 'crockery', 'utensil', 'katori', 'bartan', 'spoon']],

  ['💊', ['tablet', 'capsule', 'syrup', 'medicine', 'dawai', 'panadol', 'disprin', 'ointment', 'balm', 'vicks']],
  ['🩹', ['bandage', 'plaster', 'cotton', 'gauze', 'antiseptic', 'dettol']],
  ['🩸', ['sanitary', 'always', 'butterfly', 'flora pad', 'pads']],

  ['🚬', ['cigarette', 'tobacco', 'gold leaf', 'marlboro', 'pall mall']],

  ['❄️', ['fridge', 'refrigerator', 'freezer', 'air condition', 'cooler']],
  ['🌀', ['fan', 'pankha', 'exhaust']],
  ['📺', ['led tv', 'television', 'monitor']],
  ['🧺', ['washing machine', 'dryer', 'spinner']],
  ['📱', ['mobile', 'smartphone', 'charger', 'earphone', 'handsfree']],
];

/** By category name, when the product name says nothing. */
const CATEGORY_RULES: Array<[string, string[]]> = [
  ['🧴', ['beauty', 'personal care', 'cosmetic', 'skin']],
  ['🧺', ['detergent', 'laundry', 'washing']],
  ['🧽', ['cleaning', 'household', 'home care']],
  ['🍪', ['biscuit', 'bakery', 'confection']],
  ['🍟', ['chips', 'snack']],
  ['☕', ['tea', 'coffee']],
  ['🥤', ['drink', 'juice', 'beverage']],
  ['🥛', ['dairy', 'milk']],
  ['🫗', ['oil', 'ghee']],
  ['🌶️', ['spice', 'masala']],
  ['🍚', ['rice', 'grain']],
  ['🌾', ['flour', 'atta']],
  ['🍼', ['baby', 'infant']],
  ['💊', ['pharma', 'medicine', 'health']],
  ['🍽️', ['kitchen', 'crockery', 'utensil']],
  ['🥫', ['food', 'grocery', 'kiryana']],
];

/** Emoji for a product: from its name, then its category, else a box. */
export function productEmoji(name?: string | null, category?: string | null): string {
  const n = (name ?? '').toLowerCase();
  if (n) {
    for (const [emoji, keys] of RULES) {
      if (keys.some((k) => n.includes(k))) return emoji;
    }
  }
  const c = (category ?? '').toLowerCase();
  if (c) {
    for (const [emoji, keys] of CATEGORY_RULES) {
      if (keys.some((k) => c.includes(k))) return emoji;
    }
  }
  return '📦';
}

/** Stable index into a list of tints, from the name. */
export function productTintIndex(name: string | null | undefined, count: number): number {
  const s = name ?? '';
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return count > 0 ? h % count : 0;
}
