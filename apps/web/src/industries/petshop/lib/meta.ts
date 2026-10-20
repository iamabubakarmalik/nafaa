/** Pet shop labels, money methods, date and input helpers shared by the pet shop pages. */

import type { PetGroomingServiceType, PetGroomingStatus } from '../api/grooming.api';
import type { PetSaleStatus } from '../api/live-animals.api';
import type { PetCategoryType, PetLifeStage, PetSpeciesType } from '../api/products.api';

export const PET_KEYS = {
  animals: 'petshop-animals',
  animal: 'petshop-animal',
  grooming: 'petshop-grooming',
  groomers: 'petshop-groomers',
  profiles: 'petshop-profiles',
} as const;

/** Every query a money action can change, refreshed after it. */
export const MONEY_KEYS = ['sales-list', 'sales-summary', 'customers', 'customers-for-pos', 'khata', 'cash-register', 'dashboard-overview', 'petshop-dashboard-overview'];

export const SPECIES: Record<PetSpeciesType, { label: string; emoji: string }> = {
  DOG: { label: 'Kutta', emoji: '🐕' },
  CAT: { label: 'Billi', emoji: '🐈' },
  BIRD: { label: 'Parinda / tota', emoji: '🐦' },
  FISH: { label: 'Machhli', emoji: '🐟' },
  RABBIT: { label: 'Khargosh', emoji: '🐇' },
  HAMSTER: { label: 'Hamster', emoji: '🐹' },
  GUINEA_PIG: { label: 'Guinea pig', emoji: '🐹' },
  TURTLE: { label: 'Kachhua', emoji: '🐢' },
  REPTILE: { label: 'Reptile', emoji: '🦎' },
  SNAKE: { label: 'Saanp', emoji: '🐍' },
  FERRET: { label: 'Ferret', emoji: '🦦' },
  OTHER: { label: 'Aur', emoji: '🐾' },
};
export const speciesLabel = (v?: string | null) => (v && v in SPECIES ? `${SPECIES[v as PetSpeciesType].emoji} ${SPECIES[v as PetSpeciesType].label}` : v || '—');
export const SPECIES_OPTIONS = Object.entries(SPECIES).map(([value, s]) => ({ value, label: `${s.emoji} ${s.label}` }));

export const ANIMAL_STATUS: Record<PetSaleStatus, { label: string; tone: string }> = {
  AVAILABLE: { label: 'Bikne ke liye', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  RESERVED: { label: 'Rok liya', tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  SOLD: { label: 'Bik gaya', tone: 'bg-sky-50 text-sky-700 ring-sky-200' },
  RETURNED: { label: 'Wapas gaya', tone: 'bg-slate-100 text-slate-600 ring-slate-200' },
  DECEASED: { label: 'Mar gaya', tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
};

export const GROOM_STATUS: Record<PetGroomingStatus, { label: string; tone: string }> = {
  SCHEDULED: { label: 'Booking', tone: 'bg-slate-100 text-slate-700 ring-slate-200' },
  CONFIRMED: { label: 'Pakki', tone: 'bg-sky-50 text-sky-700 ring-sky-200' },
  IN_PROGRESS: { label: 'Kaam jari', tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  READY_FOR_PICKUP: { label: 'Tayyar — le jayein', tone: 'bg-violet-50 text-violet-700 ring-violet-200' },
  COMPLETED: { label: 'Le gaye', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  CANCELLED: { label: 'Cancel', tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
  NO_SHOW: { label: 'Nahi aaye', tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
};

export const SERVICE: Record<PetGroomingServiceType, string> = {
  BATH: 'Nahlana', HAIRCUT: 'Baal katna', FULL_GROOMING: 'Poori grooming', NAIL_TRIMMING: 'Nakhun katna', EAR_CLEANING: 'Kaan safai',
  TEETH_CLEANING: 'Daant safai', ANAL_GLAND: 'Anal gland', FLEA_TREATMENT: 'Pissu ka ilaj', DEWORMING: 'Deworming', DELUXE_PACKAGE: 'Deluxe package', OTHER: 'Aur',
};
export const SERVICE_OPTIONS = Object.entries(SERVICE).map(([value, label]) => ({ value, label }));

/** Product kinds grouped the way the shop thinks of them. */
export const CATEGORY_GROUPS: Array<{ id: 'food' | 'medicine' | 'care' | 'gear' | 'aquarium'; label: string; items: Array<[PetCategoryType, string]> }> = [
  { id: 'food', label: 'Khana', items: [
    ['DOG_FOOD_DRY', 'Kutte ka dry food'], ['DOG_FOOD_WET', 'Kutte ka wet food'], ['DOG_TREATS', 'Kutte ke treats'], ['CAT_FOOD_DRY', 'Billi ka dry food'],
    ['CAT_FOOD_WET', 'Billi ka wet food'], ['CAT_TREATS', 'Billi ke treats'], ['BIRD_FOOD', 'Parinde ka dana'], ['FISH_FOOD', 'Machhli ka khana'],
    ['RABBIT_FOOD', 'Khargosh ka khana'], ['HAMSTER_FOOD', 'Hamster ka khana'], ['REPTILE_FOOD', 'Reptile food'], ['TRAINING_TREATS', 'Training treats'],
  ] },
  { id: 'medicine', label: 'Dawai', items: [
    ['VET_MEDICINE', 'Dawai'], ['VET_VACCINE', 'Vaccine'], ['VET_DEWORMER', 'Deworming dawai'], ['VET_SUPPLEMENT', 'Supplement'],
  ] },
  { id: 'care', label: 'Safai / grooming', items: [['VET_SHAMPOO', 'Shampoo'], ['VET_GROOMING', 'Grooming saman'], ['VET_HYGIENE', 'Safai'], ['CAT_LITTER', 'Litter']] },
  { id: 'gear', label: 'Saman', items: [
    ['DOG_ACCESSORY', 'Kutte ka saman'], ['DOG_TOY', 'Kutte ke khilone'], ['DOG_LEASH_COLLAR', 'Patta / rassi'], ['DOG_BED', 'Kutte ka bistar'],
    ['CAT_ACCESSORY', 'Billi ka saman'], ['CAT_TOY', 'Billi ke khilone'], ['CAT_BED', 'Billi ka bistar'], ['CAT_SCRATCH_POST', 'Scratch post'],
    ['BIRD_CAGE', 'Pinjra'], ['BIRD_ACCESSORY', 'Parinde ka saman'], ['RABBIT_ACCESSORY', 'Khargosh ka saman'], ['HAMSTER_CAGE', 'Hamster pinjra'],
    ['REPTILE_ACCESSORY', 'Reptile saman'], ['TRAINING_TOOL', 'Training'], ['CARRIER', 'Carrier'], ['TRANSPORT_CAGE', 'Safar ka pinjra'], ['OTHER', 'Aur'],
  ] },
  { id: 'aquarium', label: 'Aquarium', items: [
    ['AQUARIUM_TANK', 'Tank'], ['AQUARIUM_FILTER', 'Filter'], ['AQUARIUM_DECOR', 'Sajawat'], ['AQUARIUM_PLANT', 'Paude'],
    ['AQUARIUM_HEATER', 'Heater'], ['AQUARIUM_LIGHT', 'Light'], ['AQUARIUM_ACCESSORY', 'Aquarium saman'],
  ] },
];
const CATEGORY_INDEX = new Map(CATEGORY_GROUPS.flatMap((g) => g.items.map(([v, l]) => [v, { label: l, group: g.id }] as const)));
export const categoryLabel = (v?: string | null) => (v ? CATEGORY_INDEX.get(v as PetCategoryType)?.label ?? v : '—');
export const categoryGroup = (v?: string | null) => (v ? CATEGORY_INDEX.get(v as PetCategoryType)?.group ?? null : null);

export const LIFE_STAGE: Record<PetLifeStage, string> = {
  PUPPY: 'Puppy', KITTEN: 'Kitten', ADULT: 'Bara', SENIOR: 'Buzurg', ALL_STAGES: 'Har umar',
};

export const PAY_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'JAZZCASH', label: 'JazzCash' },
  { value: 'EASYPAISA', label: 'EasyPaisa' },
  { value: 'BANK_TRANSFER', label: 'Bank' },
  { value: 'CARD', label: 'Card' },
];

export const errorText = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message?.toString() || fallback;

export const phoneOk = (v: string) => /^[0-9+\-\s]{10,15}$/.test(v.trim());

/** Number typed in a text box ("1,200" → 1200); empty → null. */
export const numIn = (v: string): number | null => {
  const t = v.replace(/[^\d.-]/g, '');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

/** `yyyy-mm-dd` of a local date. */
export const dayKey = (d: Date = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const shiftDay = (key: string, days: number) => {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + days));
};

export const shortDate = (v?: string | null) =>
  v ? new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short' }).format(new Date(v)) : '—';
export const longDate = (v?: string | null) =>
  v ? new Intl.DateTimeFormat('en-PK', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(v)) : '—';

/** Whole days from today to a date (negative = past). */
export const daysFromToday = (v?: string | null) => {
  if (!v) return null;
  const a = new Date(dayKey(new Date(v)));
  const b = new Date(dayKey());
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
};

/** Age from months: "8 mahine", "2 saal 3 mahine". */
export const ageText = (months?: number | null) => {
  if (months === null || months === undefined) return '';
  if (months < 12) return `${months} mahine`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m ? `${y} saal ${m} mahine` : `${y} saal`;
};
