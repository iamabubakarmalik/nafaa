/** Pet shop labels, money methods, date and input helpers shared by the pet shop pages. */

import type { PetGroomingServiceType, PetGroomingStatus } from '../api/grooming.api';
import type { PetSaleStatus } from '../api/live-animals.api';
import type { PetCategoryType, PetLifeStage, PetSpeciesType } from '../api/products.api';
import { t as tr } from '@core/i18n';

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
  DOG: { label: tr('Kutta'), emoji: '🐕' },
  CAT: { label: tr('Billi'), emoji: '🐈' },
  BIRD: { label: tr('Parinda / tota'), emoji: '🐦' },
  FISH: { label: tr('Machhli'), emoji: '🐟' },
  RABBIT: { label: tr('Khargosh'), emoji: '🐇' },
  HAMSTER: { label: tr('Hamster'), emoji: '🐹' },
  GUINEA_PIG: { label: tr('Guinea pig'), emoji: '🐹' },
  TURTLE: { label: tr('Kachhua'), emoji: '🐢' },
  REPTILE: { label: tr('Reptile'), emoji: '🦎' },
  SNAKE: { label: tr('Saanp'), emoji: '🐍' },
  FERRET: { label: tr('Ferret'), emoji: '🦦' },
  OTHER: { label: tr('Aur'), emoji: '🐾' },
};
export const speciesLabel = (v?: string | null) => (v && v in SPECIES ? `${SPECIES[v as PetSpeciesType].emoji} ${SPECIES[v as PetSpeciesType].label}` : v || '—');
export const SPECIES_OPTIONS = Object.entries(SPECIES).map(([value, s]) => ({ value, label: `${s.emoji} ${s.label}` }));

export const ANIMAL_STATUS: Record<PetSaleStatus, { label: string; tone: string }> = {
  AVAILABLE: { label: tr('Bikne ke liye'), tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  RESERVED: { label: tr('Rok liya'), tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  SOLD: { label: tr('Bik gaya'), tone: 'bg-sky-50 text-sky-700 ring-sky-200' },
  RETURNED: { label: tr('Wapas gaya'), tone: 'bg-slate-100 text-slate-600 ring-slate-200' },
  DECEASED: { label: tr('Mar gaya'), tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
};

export const GROOM_STATUS: Record<PetGroomingStatus, { label: string; tone: string }> = {
  SCHEDULED: { label: tr('Booking'), tone: 'bg-slate-100 text-slate-700 ring-slate-200' },
  CONFIRMED: { label: tr('Pakki'), tone: 'bg-sky-50 text-sky-700 ring-sky-200' },
  IN_PROGRESS: { label: tr('Kaam jari'), tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  READY_FOR_PICKUP: { label: tr('Tayyar — le jayein'), tone: 'bg-violet-50 text-violet-700 ring-violet-200' },
  COMPLETED: { label: tr('Le gaye'), tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  CANCELLED: { label: tr('Cancel'), tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
  NO_SHOW: { label: tr('Nahi aaye'), tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
};

export const SERVICE: Record<PetGroomingServiceType, string> = {
  BATH: tr('Nahlana'), HAIRCUT: tr('Baal katna'), FULL_GROOMING: tr('Poori grooming'), NAIL_TRIMMING: tr('Nakhun katna'), EAR_CLEANING: tr('Kaan safai'),
  TEETH_CLEANING: tr('Daant safai'), ANAL_GLAND: tr('Anal gland'), FLEA_TREATMENT: tr('Pissu ka ilaj'), DEWORMING: tr('Deworming'), DELUXE_PACKAGE: tr('Deluxe package'), OTHER: tr('Aur'),
};
export const SERVICE_OPTIONS = Object.entries(SERVICE).map(([value, label]) => ({ value, label }));

/** Product kinds grouped the way the shop thinks of them. */
export const CATEGORY_GROUPS: Array<{ id: 'food' | 'medicine' | 'care' | 'gear' | 'aquarium'; label: string; items: Array<[PetCategoryType, string]> }> = [
  { id: 'food', label: tr('Khana'), items: [
    ['DOG_FOOD_DRY', tr('Kutte ka dry food')], ['DOG_FOOD_WET', tr('Kutte ka wet food')], ['DOG_TREATS', tr('Kutte ke treats')], ['CAT_FOOD_DRY', tr('Billi ka dry food')],
    ['CAT_FOOD_WET', tr('Billi ka wet food')], ['CAT_TREATS', tr('Billi ke treats')], ['BIRD_FOOD', tr('Parinde ka dana')], ['FISH_FOOD', tr('Machhli ka khana')],
    ['RABBIT_FOOD', tr('Khargosh ka khana')], ['HAMSTER_FOOD', tr('Hamster ka khana')], ['REPTILE_FOOD', tr('Reptile food')], ['TRAINING_TREATS', tr('Training treats')],
  ] },
  { id: 'medicine', label: tr('Dawai'), items: [
    ['VET_MEDICINE', tr('Dawai')], ['VET_VACCINE', tr('Vaccine')], ['VET_DEWORMER', tr('Deworming dawai')], ['VET_SUPPLEMENT', tr('Supplement')],
  ] },
  { id: 'care', label: tr('Safai / grooming'), items: [['VET_SHAMPOO', tr('Shampoo')], ['VET_GROOMING', tr('Grooming saman')], ['VET_HYGIENE', tr('Safai')], ['CAT_LITTER', tr('Litter')]] },
  { id: 'gear', label: tr('Saman'), items: [
    ['DOG_ACCESSORY', tr('Kutte ka saman')], ['DOG_TOY', tr('Kutte ke khilone')], ['DOG_LEASH_COLLAR', tr('Patta / rassi')], ['DOG_BED', tr('Kutte ka bistar')],
    ['CAT_ACCESSORY', tr('Billi ka saman')], ['CAT_TOY', tr('Billi ke khilone')], ['CAT_BED', tr('Billi ka bistar')], ['CAT_SCRATCH_POST', tr('Scratch post')],
    ['BIRD_CAGE', tr('Pinjra')], ['BIRD_ACCESSORY', tr('Parinde ka saman')], ['RABBIT_ACCESSORY', tr('Khargosh ka saman')], ['HAMSTER_CAGE', tr('Hamster pinjra')],
    ['REPTILE_ACCESSORY', tr('Reptile saman')], ['TRAINING_TOOL', tr('Training')], ['CARRIER', tr('Carrier')], ['TRANSPORT_CAGE', tr('Safar ka pinjra')], ['OTHER', tr('Aur')],
  ] },
  { id: 'aquarium', label: tr('Aquarium'), items: [
    ['AQUARIUM_TANK', tr('Tank')], ['AQUARIUM_FILTER', tr('Filter')], ['AQUARIUM_DECOR', tr('Sajawat')], ['AQUARIUM_PLANT', tr('Paude')],
    ['AQUARIUM_HEATER', tr('Heater')], ['AQUARIUM_LIGHT', tr('Light')], ['AQUARIUM_ACCESSORY', tr('Aquarium saman')],
  ] },
];
const CATEGORY_INDEX = new Map(CATEGORY_GROUPS.flatMap((g) => g.items.map(([v, l]) => [v, { label: l, group: g.id }] as const)));
export const categoryLabel = (v?: string | null) => (v ? CATEGORY_INDEX.get(v as PetCategoryType)?.label ?? v : '—');
export const categoryGroup = (v?: string | null) => (v ? CATEGORY_INDEX.get(v as PetCategoryType)?.group ?? null : null);

export const LIFE_STAGE: Record<PetLifeStage, string> = {
  PUPPY: tr('Puppy'), KITTEN: tr('Kitten'), ADULT: tr('Bara'), SENIOR: tr('Buzurg'), ALL_STAGES: tr('Har umar'),
};

export const PAY_METHODS = [
  { value: 'CASH', label: tr('Cash') },
  { value: 'JAZZCASH', label: tr('JazzCash') },
  { value: 'EASYPAISA', label: tr('EasyPaisa') },
  { value: 'BANK_TRANSFER', label: tr('Bank') },
  { value: 'CARD', label: tr('Card') },
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
  if (months < 12) return tr('{{months}} mahine', { months });
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m ? tr('{{y}} saal {{m}} mahine', { y, m }) : tr('{{y}} saal', { y });
};
