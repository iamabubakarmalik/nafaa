/**
 * Agri product kind. The shop picks only its own category; the internal
 * kind is derived from it and drives safety fields, NPK and registration
 * checks (same approach as bakery/lib/bakeryCategory.ts).
 */

export type AgriKind =
  | 'SEEDS' | 'FERTILIZER' | 'PESTICIDE' | 'HERBICIDE' | 'FUNGICIDE'
  | 'INSECTICIDE' | 'ANIMAL_FEED' | 'POULTRY_FEED' | 'CATTLE_FEED' | 'FISH_FEED'
  | 'VETERINARY_MEDICINE' | 'FARM_TOOLS' | 'IRRIGATION' | 'MACHINERY_PART'
  | 'MULCH_COVER' | 'GROWTH_HORMONE' | 'SOIL_CONDITIONER' | 'PLANT_NUTRIENT'
  | 'ORGANIC_INPUT' | 'OTHER';

/* Words (Urdu and English) that identify each kind. */
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
  /* SEEDS last: crop words also appear in fertilizer and spray names. */
  ['SEEDS',               ['seed', 'beej', 'bij', 'gandum', 'wheat', 'cotton', 'kapas', 'dhan', 'paddy', 'maize', 'makai', 'sabzi', 'nursery', 'pouda', 'plant']],
];

/**
 * Internal kind from the shop's category name and the product name;
 * `OTHER` when nothing matches (no special handling needed).
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

/** Toxic kinds that need the safety fields. */
export function isSprayKind(k: AgriKind): boolean {
  return ([
    'PESTICIDE', 'HERBICIDE', 'FUNGICIDE', 'INSECTICIDE',
    'GROWTH_HORMONE', 'VETERINARY_MEDICINE',
  ] as AgriKind[]).includes(k);
}

/** Seed kinds (variety, germination). */
export function isSeedKind(k: AgriKind): boolean {
  return k === 'SEEDS';
}

/** Fertilizer kinds (NPK). */
export function isFertKind(k: AgriKind): boolean {
  return ([ 'FERTILIZER', 'SOIL_CONDITIONER', 'PLANT_NUTRIENT', 'ORGANIC_INPUT' ] as AgriKind[]).includes(k);
}

/** Feed kinds (animal, protein). */
export function isFeedKind(k: AgriKind): boolean {
  return ([ 'ANIMAL_FEED', 'POULTRY_FEED', 'CATTLE_FEED', 'FISH_FEED' ] as AgriKind[]).includes(k);
}

/** Hardware kinds where crop, season and toxicity do not apply. */
export function isToolKind(k: AgriKind): boolean {
  return ([ 'FARM_TOOLS', 'IRRIGATION', 'MACHINERY_PART', 'MULCH_COVER' ] as AgriKind[]).includes(k);
}

/**
 * Whether government registration is required: seeds (Seed Act) and
 * pesticides (Agricultural Pesticides Ordinance) cannot be sold without it.
 */
export function needsGovtReg(k: AgriKind): boolean {
  return isSprayKind(k) || isSeedKind(k) || k === 'FERTILIZER';
}

/** Readable label per kind. */
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

/** Emoji per kind for cards and lists. */
export const AGRI_KIND_EMOJI: Record<AgriKind, string> = {
  SEEDS: '🌱', FERTILIZER: '🧪', PESTICIDE: '🐛', HERBICIDE: '🌿',
  FUNGICIDE: '🍄', INSECTICIDE: '🦟', ANIMAL_FEED: '🐄', POULTRY_FEED: '🐔',
  CATTLE_FEED: '🐂', FISH_FEED: '🐟', VETERINARY_MEDICINE: '💊',
  FARM_TOOLS: '🔧', IRRIGATION: '💧', MACHINERY_PART: '⚙️', MULCH_COVER: '🏕️',
  GROWTH_HORMONE: '🧬', SOIL_CONDITIONER: '🪱', PLANT_NUTRIENT: '🌿',
  ORGANIC_INPUT: '♻️', OTHER: '📦',
};

/**
 * Suggested categories for a new shop; picking one creates a global
 * category with that name.
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
