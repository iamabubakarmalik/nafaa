/* ═════════════════════════════════════════════════════════════
   CATEGORY — dukaan-daar ki apni, system ka apna
   ─────────────────────────────────────────────────────────────
   Pehle wizard me DO category poochi jati thin:

     1. "Kis qism ka maal" — 19 emoji button, system ka apna enum.
     2. Global category — jo dukaan-daar khud banata hai.

   Dukaan-daar ke liye ye be-maani tha. Wo "Urea" naam ki category
   banata hai, aur phir usi cheez ke liye system ki list me se bhi
   "Khaad" chunna parta hai.

   Ab sirf EK category poochi jati hai: wohi global wali jo wo khud
   banata hai. Enum system khud samajh leta hai — us ki zaroorat
   sirf andar ke kaam me hai (safety ke sawal dikhein ya nahi,
   NPK ka khana khule ya nahi, registration maanga jaye ya nahi).

   Bilkul wohi tareeqa jo bakery me chal raha hai — dekhein
   `../../bakery/lib/bakeryCategory.ts`.
   ═════════════════════════════════════════════════════════════ */

export type AgriKind =
  | 'SEEDS' | 'FERTILIZER' | 'PESTICIDE' | 'HERBICIDE' | 'FUNGICIDE'
  | 'INSECTICIDE' | 'ANIMAL_FEED' | 'POULTRY_FEED' | 'CATTLE_FEED' | 'FISH_FEED'
  | 'VETERINARY_MEDICINE' | 'FARM_TOOLS' | 'IRRIGATION' | 'MACHINERY_PART'
  | 'MULCH_COVER' | 'GROWTH_HORMONE' | 'SOIL_CONDITIONER' | 'PLANT_NUTRIENT'
  | 'ORGANIC_INPUT' | 'OTHER';

/* Har qism ke liye wo alfaz jin se wo pehchani jati hai — Urdu
   aur English dono, kyunke dukaan-daar dono me likhta hai. */
const RULES: Array<[AgriKind, string[]]> = [
  ['POULTRY_FEED',        ['poultry', 'murghi', 'murgi', 'chick', 'broiler', 'layer feed']],
  ['CATTLE_FEED',         ['cattle', 'mawayshi', 'wanda', 'vanda', 'bhains', 'gaye ka feed', 'dairy feed']],
  ['FISH_FEED',           ['fish feed', 'machhli', 'machli']],
  ['ANIMAL_FEED',         ['feed', 'chara', 'khal', 'banola', 'silage', 'jaanwar ka']],
  ['VETERINARY_MEDICINE', ['veterinary', 'jaanwar ki dawa', 'animal medicine', 'vaccine', 'dewormer', 'tika']],
  ['HERBICIDE',           ['herbicide', 'weedicide', 'weed', 'ghaas', 'khar patwar', 'kharpatwar']],
  ['FUNGICIDE',           ['fungicide', 'fungus', 'phaphoondi', 'blight', 'rust']],
  ['INSECTICIDE',         ['insecticide', 'sundi', 'sunni', 'keera', 'keeray', 'kira']],
  ['PESTICIDE',           ['pesticide', 'spray', 'zeher', 'zahar', 'dawa', 'acaricide', 'miticide', 'nematicide']],
  ['GROWTH_HORMONE',      ['hormone', 'growth regulator', 'pgr', 'rooting']],
  ['SOIL_CONDITIONER',    ['soil', 'zameen', 'gypsum', 'lime', 'humic', 'sudhaar']],
  ['PLANT_NUTRIENT',      ['micronutrient', 'nutrient', 'ghiza', 'boron', 'zinc', 'foliar', 'chelate']],
  ['ORGANIC_INPUT',       ['organic', 'compost', 'gobar', 'bio', 'vermi', 'neem cake']],
  ['FERTILIZER',          ['fertilizer', 'khaad', 'khad', 'urea', 'dap', 'npk', 'potash', 'sop', 'mop', 'ssp', 'nitro', 'can bag']],
  ['IRRIGATION',          ['irrigation', 'drip', 'sprinkler', 'pipe', 'paani', 'nozzle', 'hose', 'tube well', 'tubewell']],
  ['MACHINERY_PART',      ['machine', 'purza', 'spare', 'bearing', 'belt', 'blade', 'tractor', 'thresher']],
  ['MULCH_COVER',         ['mulch', 'tarpal', 'tarpaulin', 'plastic sheet', 'cover', 'tunnel']],
  ['FARM_TOOLS',          ['tool', 'auzaar', 'belcha', 'kudal', 'darati', 'sprayer', 'drum', 'kassi', 'rassi']],
  /* SEEDS sab se aakhir me: "wheat", "cotton" jaise lafz khaad aur
     dawa ke naam me bhi aate hain, un ko pehla mauqa milna chahiye. */
  ['SEEDS',               ['seed', 'beej', 'bij', 'gandum', 'wheat', 'cotton', 'kapas', 'dhan', 'paddy', 'maize', 'makai', 'sabzi', 'nursery', 'pouda', 'plant']],
];

/**
 * Dukaan-daar ki likhi hui category (aur product ke naam) se system
 * wali qism nikalna.
 *
 * Kuch na mile to `OTHER` — ye ghalat nahi, bas "koi khaas bartao
 * nahi chahiye" ka matlab rakhta hai.
 */
export function deriveAgriKind(
  categoryName?: string | null,
  productName?: string | null,
): AgriKind {
  const hay = `${categoryName ?? ''} ${productName ?? ''}`.toLowerCase();
  if (!hay.trim()) return 'OTHER';
  for (const [value, words] of RULES) {
    if (words.some((w) => hay.includes(w))) return value;
  }
  return 'OTHER';
}

/** Ye cheez zehreeli hai — safety ke sawal zaroori hain */
export function isSprayKind(k: AgriKind): boolean {
  return ([
    'PESTICIDE', 'HERBICIDE', 'FUNGICIDE', 'INSECTICIDE',
    'GROWTH_HORMONE', 'VETERINARY_MEDICINE',
  ] as AgriKind[]).includes(k);
}

/** Beej hai — variety, ugne ki shrah wagaira poochni hai */
export function isSeedKind(k: AgriKind): boolean {
  return k === 'SEEDS';
}

/** Khaad hai — NPK ka hisab poochna hai */
export function isFertKind(k: AgriKind): boolean {
  return ([ 'FERTILIZER', 'SOIL_CONDITIONER', 'PLANT_NUTRIENT', 'ORGANIC_INPUT' ] as AgriKind[]).includes(k);
}

/** Jaanwar ka feed hai — kis jaanwar ke liye, protein kitna */
export function isFeedKind(k: AgriKind): boolean {
  return ([ 'ANIMAL_FEED', 'POULTRY_FEED', 'CATTLE_FEED', 'FISH_FEED' ] as AgriKind[]).includes(k);
}

/** Loha-lakkar hai — fasal, mausam, zehreelapan ka sawal be-maani hai */
export function isToolKind(k: AgriKind): boolean {
  return ([ 'FARM_TOOLS', 'IRRIGATION', 'MACHINERY_PART', 'MULCH_COVER' ] as AgriKind[]).includes(k);
}

/**
 * Sarkar ki registration zaroori hai ya nahi.
 *
 * Pakistan me beej (Seed Act) aur zehreeli dawa (Agricultural
 * Pesticides Ordinance) — dono registration ke baghair bechna
 * ghair-qanooni hai. Auzaar par aisi koi pabandi nahi.
 */
export function needsGovtReg(k: AgriKind): boolean {
  return isSprayKind(k) || isSeedKind(k) || k === 'FERTILIZER';
}

/** Aasani ke liye parhne layak naam */
export function prettyAgriKind(k: AgriKind): string {
  return AGRI_KIND_LABEL[k] ?? k;
}

const AGRI_KIND_LABEL: Record<AgriKind, string> = {
  SEEDS: 'Beej',
  FERTILIZER: 'Khaad',
  PESTICIDE: 'Keeray ki dawa',
  HERBICIDE: 'Ghaas ki dawa',
  FUNGICIDE: 'Fungus ki dawa',
  INSECTICIDE: 'Insecticide',
  ANIMAL_FEED: 'Jaanwar ka feed',
  POULTRY_FEED: 'Murghi ka feed',
  CATTLE_FEED: 'Mawayshi feed',
  FISH_FEED: 'Machhli feed',
  VETERINARY_MEDICINE: 'Jaanwar ki dawa',
  FARM_TOOLS: 'Auzaar',
  IRRIGATION: 'Paani ka saamaan',
  MACHINERY_PART: 'Machine ka purza',
  MULCH_COVER: 'Tarpal / cover',
  GROWTH_HORMONE: 'Growth hormone',
  SOIL_CONDITIONER: 'Zameen sudhaar',
  PLANT_NUTRIENT: 'Poday ki ghiza',
  ORGANIC_INPUT: 'Organic',
  OTHER: 'Aur koi',
};

/** Har qism ka emoji — summary card aur list par */
export const AGRI_KIND_EMOJI: Record<AgriKind, string> = {
  SEEDS: '🌱', FERTILIZER: '🧪', PESTICIDE: '🐛', HERBICIDE: '🌿',
  FUNGICIDE: '🍄', INSECTICIDE: '🦟', ANIMAL_FEED: '🐄', POULTRY_FEED: '🐔',
  CATTLE_FEED: '🐂', FISH_FEED: '🐟', VETERINARY_MEDICINE: '💊',
  FARM_TOOLS: '🔧', IRRIGATION: '💧', MACHINERY_PART: '⚙️', MULCH_COVER: '🏕️',
  GROWTH_HORMONE: '🧬', SOIL_CONDITIONER: '🪱', PLANT_NUTRIENT: '🌿',
  ORGANIC_INPUT: '♻️', OTHER: '📦',
};

/**
 * Nayi dukaan ke liye tayyar tajaweez.
 *
 * Ye SIRF tajaweez hain — click karo to isi naam ki global category
 * ban jati hai. Chaho to apna bilkul naya naam likh lo; system ka
 * koi zor nahi.
 */
export const AGRI_CATEGORY_SUGGESTIONS: Array<{ name: string; emoji: string }> = [
  { name: 'Beej',            emoji: '🌱' },
  { name: 'Khaad',           emoji: '🧪' },
  { name: 'Urea',            emoji: '⚪' },
  { name: 'DAP',             emoji: '🟤' },
  { name: 'Keeray ki dawa',  emoji: '🐛' },
  { name: 'Ghaas ki dawa',   emoji: '🌿' },
  { name: 'Fungus ki dawa',  emoji: '🍄' },
  { name: 'Murghi ka feed',  emoji: '🐔' },
  { name: 'Wanda',           emoji: '🐄' },
  { name: 'Jaanwar ki dawa', emoji: '💊' },
  { name: 'Auzaar',          emoji: '🔧' },
  { name: 'Paani ka saamaan', emoji: '💧' },
  { name: 'Machine ka purza', emoji: '⚙️' },
  { name: 'Organic',         emoji: '♻️' },
];
