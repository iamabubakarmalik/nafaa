/* ═════════════════════════════════════════════════════════════
   CHEEZ KA APNA NISHAN — jab tasveer na ho
   ─────────────────────────────────────────────────────────────
   Har dukaan-daar har cheez ki tasveer nahi lagata — 1000 products
   me se shayad 10 ki lagti hai. Baqi sab jagah aik jaisa sleti
   dabba aata tha: na pehchan, na raunaq. Nazar daurao to sab ek
   jaisa lagta tha.

   Ab naam aur category se andaza laga kar cheez ka apna nishan
   dikhate hain — sabun ko sabun ka, doodh ko doodh ka. Rang bhi
   naam se hi nikalta hai, is liye ek hi cheez hamesha ek hi rang
   me nazar aati hai aur aankh ko yaad ho jati hai.

   Ye andaza hai, daleel nahi — asli tasveer hamesha isse behtar
   hai. Ye sirf khali jagah bharne ke liye hai.
   ═════════════════════════════════════════════════════════════ */

/** [nishan, kalidi alfaaz] — tarteeb ahem hai, pehla match jeetta hai */
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

/** Category ke naam se — jab cheez ka naam kuch na batae */
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

/** Cheez ka nishan — pehle naam se, phir category se, warna dabba */
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

/** Har cheez ka apna halka rang — naam se nikalta hai, is liye hamesha wohi */
const TINTS = [
  'from-sky-100 to-blue-200 dark:from-sky-500/20 dark:to-blue-500/10',
  'from-emerald-100 to-teal-200 dark:from-emerald-500/20 dark:to-teal-500/10',
  'from-amber-100 to-orange-200 dark:from-amber-500/20 dark:to-orange-500/10',
  'from-rose-100 to-pink-200 dark:from-rose-500/20 dark:to-pink-500/10',
  'from-violet-100 to-purple-200 dark:from-violet-500/20 dark:to-purple-500/10',
  'from-cyan-100 to-sky-200 dark:from-cyan-500/20 dark:to-sky-500/10',
  'from-lime-100 to-green-200 dark:from-lime-500/20 dark:to-green-500/10',
  'from-fuchsia-100 to-violet-200 dark:from-fuchsia-500/20 dark:to-violet-500/10',
];

export function productTint(name?: string | null): string {
  const s = name ?? '';
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
}

/** Card/row me lagane wala tayyar tukra */
export function ProductThumb({
  name, category, url, size = 'md', className = '',
}: {
  name?: string | null;
  category?: string | null;
  url?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'full';
  className?: string;
}) {
  const box =
    size === 'sm' ? 'h-9 w-9 text-base rounded-lg'
      : size === 'md' ? 'h-11 w-11 text-xl rounded-xl'
        : size === 'lg' ? 'h-16 w-16 text-3xl rounded-2xl'
          : 'w-full h-full text-5xl';

  if (url) {
    return (
      <div className={`${box} ${className} overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0`}>
        <img src={url} alt={name ?? ''} loading="lazy" className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div
      className={`${box} ${className} shrink-0 flex items-center justify-center bg-gradient-to-br ${productTint(name)} select-none`}
      title={name ?? undefined}
    >
      <span className="drop-shadow-sm">{productEmoji(name, category)}</span>
    </div>
  );
}
